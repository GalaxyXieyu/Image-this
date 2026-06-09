import { mapProviderErrorMessage } from '@/lib/provider-error-utils';
import { GPTConfig, IImageProcessor, ProcessResult } from '../types';
import { downloadBlob, fetchWithRetry, getJson, postJson } from '../utils/api-client';

interface GenerationResponse {
  created?: number;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

interface ToApisUploadResponse {
  success?: boolean;
  message?: string;
  data?: {
    id?: string;
    url?: string;
    mime_type?: string;
    size?: number;
  } | Array<{
    url?: string;
  }>;
  url?: string;
}

interface ToApisGenerationTaskResponse {
  id?: string;
  task_id?: string;
  status?: string;
  progress?: number;
  url?: string;
  error?: {
    code?: string;
    message?: string;
  };
  result?: {
    type?: string;
    url?: string;
    data?: {
      url?: string;
    } | Array<{
      url?: string;
    }>;
  };
  data?: Array<{
    url?: string;
    b64_json?: string;
  }>;
}

const DEFAULT_BASE_URL = 'https://toapis.com';
const DEFAULT_MODEL = 'gpt-image-2';
const DEFAULT_IMAGE_SIZE = '1:1';
const TOAPIS_POLL_INTERVAL_MS = 3000;
const TOAPIS_MAX_POLL_ATTEMPTS = 120;
const TOAPIS_PROGRESS_LOG_INTERVAL = 5;

export class GPTProcessor implements IImageProcessor {
  constructor(private config: GPTConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.apiKey) {
      throw new Error('GPT API Key 未配置，请先在设置页完成配置。');
    }

    const baseUrl = this.normalizeBaseUrl(this.config.apiUrl || DEFAULT_BASE_URL);
    const finalPrompt =
      customPrompt ||
      prompt ||
      '保持第一张图的产品主体完全不变，只替换第二张图的背景风格，去掉第二张图里原有产品，并确保最终画面只有第一张图的产品主体。';
    const modelName = this.config.modelName || DEFAULT_MODEL;

    try {
      if (this.isToApisBaseUrl(baseUrl)) {
        return await this.backgroundReplaceWithToApis(
          originalImageUrl,
          referenceImageUrl,
          finalPrompt,
          baseUrl,
          modelName
        );
      }

      const imageUrls = await Promise.all([
        this.prepareImageInput(originalImageUrl),
        this.prepareImageInput(referenceImageUrl),
      ]);

      const data = await postJson<GenerationResponse>(
        `${baseUrl}/v1/images/generations`,
        {
          model: modelName,
          prompt: finalPrompt,
          size: DEFAULT_IMAGE_SIZE,
          n: 1,
          image_urls: imageUrls,
        },
        {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        { timeout: 300000 }
      );

      const imagePayload = data.data?.[0];
      if (!imagePayload) {
        throw new Error('GPT 图片生成成功，但没有返回结果数据。');
      }

      if (imagePayload.b64_json) {
        return {
          id: `gpt-${Date.now()}`,
          imageData: `data:image/png;base64,${imagePayload.b64_json}`,
          imageSize: Math.floor(imagePayload.b64_json.length * 0.75),
        };
      }

      if (imagePayload.url) {
        return {
          id: `gpt-${Date.now()}`,
          imageData: imagePayload.url,
          imageSize: 0,
        };
      }

      throw new Error('GPT 图片生成成功，但返回结果中没有可用图片。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[GPT Processor] 处理失败:', message);
      throw new Error(mapProviderErrorMessage(message, 'gpt'));
    }
  }

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    throw new Error('GPT enhance not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    throw new Error('GPT generate not implemented yet');
  }

  private async backgroundReplaceWithToApis(
    originalImageUrl: string,
    referenceImageUrl: string,
    finalPrompt: string,
    baseUrl: string,
    modelName: string
  ): Promise<ProcessResult> {
    const referenceImages = await Promise.all([
      this.uploadImageToToApis(baseUrl, this.config.apiKey, originalImageUrl, 1),
      this.uploadImageToToApis(baseUrl, this.config.apiKey, referenceImageUrl, 2),
    ]);

    const task = await postJson<ToApisGenerationTaskResponse>(
      `${baseUrl}/v1/images/generations`,
      {
        model: modelName,
        prompt: finalPrompt,
        n: 1,
        size: DEFAULT_IMAGE_SIZE,
        resolution: '1K',
        response_format: 'url',
        reference_images: referenceImages,
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      { timeout: 120000 }
    );

    const taskId = task.id || task.task_id;
    if (!taskId) {
      const immediateUrl = this.extractToApisResultUrl(task);
      if (immediateUrl) {
        return { id: `gpt-${Date.now()}`, imageData: immediateUrl, imageSize: 0 };
      }

      console.error('[GPT Processor] toapis generation response missing task id:', JSON.stringify(task));
      throw new Error('toapis 未返回任务 ID');
    }

    console.info(`[GPT Processor] toapis task created: ${taskId}, model=${modelName}`);

    const resultUrl = await this.pollToApisResult(baseUrl, this.config.apiKey, taskId);
    return {
      id: taskId,
      imageData: resultUrl,
      imageSize: 0,
    };
  }

  private async uploadImageToToApis(
    baseUrl: string,
    apiKey: string,
    source: string,
    index: number
  ): Promise<string> {
    const blob = await this.loadSourceAsBlob(source);
    const extension = this.mimeTypeToExtension(blob.type || 'image/png');
    const formData = new FormData();
    formData.append('file', blob, `gpt-input-${index}.${extension}`);

    const response = await fetchWithRetry(`${baseUrl}/v1/uploads/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      timeout: 120000,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`toapis 图片上传失败: HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as ToApisUploadResponse;
    const uploadedUrl = this.extractToApisUploadUrl(data);

    if (!uploadedUrl) {
      console.error('[GPT Processor] toapis upload response missing url:', JSON.stringify(data));
      throw new Error('toapis 图片上传成功，但未返回 URL');
    }

    return uploadedUrl;
  }

  private async pollToApisResult(baseUrl: string, apiKey: string, taskId: string): Promise<string> {
    let lastStatus = 'unknown';
    let lastProgress: number | undefined;

    for (let attempt = 0; attempt < TOAPIS_MAX_POLL_ATTEMPTS; attempt++) {
      const task = await getJson<ToApisGenerationTaskResponse>(
        `${baseUrl}/v1/images/generations/${taskId}`,
        {
          Authorization: `Bearer ${apiKey}`,
        },
        { timeout: 30000 }
      );

      const status = task.status || 'unknown';
      const progress = typeof task.progress === 'number' ? task.progress : undefined;
      const shouldLogProgress =
        attempt === 0 ||
        status !== lastStatus ||
        progress !== lastProgress ||
        (attempt + 1) % TOAPIS_PROGRESS_LOG_INTERVAL === 0;

      if (shouldLogProgress) {
        console.info(
          `[GPT Processor] toapis task ${taskId} poll ${attempt + 1}/${TOAPIS_MAX_POLL_ATTEMPTS}: status=${status}, progress=${progress ?? 'n/a'}`
        );
      }

      lastStatus = status;
      lastProgress = progress;

      if (task.status === 'completed') {
        const resultUrl = this.extractToApisResultUrl(task);
        if (!resultUrl) {
          console.error('[GPT Processor] toapis completed task missing result url:', JSON.stringify(task));
          throw new Error('toapis 任务已完成，但未返回结果图片 URL');
        }
        return resultUrl;
      }

      if (task.status === 'failed') {
        throw new Error(task.error?.message || 'toapis 图像生成失败');
      }

      await new Promise((resolve) => setTimeout(resolve, TOAPIS_POLL_INTERVAL_MS));
    }

    const waitedSeconds = Math.round((TOAPIS_MAX_POLL_ATTEMPTS * TOAPIS_POLL_INTERVAL_MS) / 1000);
    throw new Error(
      `toapis 图像生成超时，请稍后重试 (taskId: ${taskId}, lastStatus: ${lastStatus}, lastProgress: ${lastProgress ?? 'n/a'}, waited: ${waitedSeconds}s)`
    );
  }

  private async loadSourceAsBlob(source: string): Promise<Blob> {
    if (source.startsWith('data:')) {
      const [metadata, rawData] = source.split(',', 2);
      const mimeType = metadata.match(/^data:(.*?);base64$/)?.[1] || 'image/png';
      const buffer = Buffer.from(rawData || '', 'base64');
      return new Blob([buffer], { type: mimeType });
    }

    return downloadBlob(source, {}, { timeout: 120000 });
  }

  private async prepareImageInput(source: string): Promise<string> {
    if (source.startsWith('data:')) {
      return source;
    }

    if (source.startsWith('http://') || source.startsWith('https://')) {
      return source;
    }

    if (!source) {
      throw new Error('GPT 图片输入为空，请重新选择图片。');
    }

    return `data:image/png;base64,${source.replace(/^data:image\/[^;]+;base64,/, '')}`;
  }

  private extractToApisUploadUrl(data: ToApisUploadResponse): string | undefined {
    if (data.url) return data.url;

    if (Array.isArray(data.data)) {
      return data.data.find((item) => item.url)?.url;
    }

    return data.data?.url;
  }

  private extractToApisResultUrl(task: ToApisGenerationTaskResponse): string | undefined {
    if (task.url) return task.url;
    if (task.result?.url) return task.result.url;

    const resultData = task.result?.data;
    if (Array.isArray(resultData)) {
      return resultData.find((item) => item.url)?.url;
    }

    if (resultData?.url) return resultData.url;

    return task.data?.find((item) => item.url)?.url;
  }

  private mimeTypeToExtension(mimeType: string): string {
    if (mimeType.includes('jpeg')) return 'jpg';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('png')) return 'png';
    return 'png';
  }

  private isToApisBaseUrl(baseUrl: string): boolean {
    return /(^|\.)toapis\.com$/i.test(new URL(baseUrl).hostname);
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }
}
