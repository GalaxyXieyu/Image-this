/**
 * Gemini image processor.
 * Supports both native Gemini API and the toapis-compatible image workflow.
 */

import { IImageProcessor, ProcessResult, GeminiConfig } from '../types';
import { convertToGeminiInlineData } from '../utils';
import { downloadBlob, fetchWithRetry, getJson, postJson } from '../utils/api-client';

interface GeminiNativeResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
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
}

const DEFAULT_GEMINI_BASE_URL = 'https://toapis.com';
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const DEFAULT_GEMINI_NATIVE_MODEL = 'gemini-3-pro-image-preview';
const TOAPIS_POLL_INTERVAL_MS = 3000;
const TOAPIS_MAX_POLL_ATTEMPTS = 120;
const TOAPIS_PROGRESS_LOG_INTERVAL = 5;

export class GeminiProcessor implements IImageProcessor {
  constructor(private config: GeminiConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.apiKey) {
      throw new Error('GEMINI_NOT_CONFIGURED:璇峰厛鍦ㄨ缃〉闈㈤厤缃?Gemini API Key');
    }

    const finalPrompt =
      customPrompt ||
      prompt ||
      '淇濇寔绗竴寮犲浘鐨勪骇鍝佷富浣撳畬鍏ㄤ笉鍙橈紝浠呮浛鎹㈢浜屽紶鍥剧殑鑳屾櫙涓虹被浼煎弬鑰冨満鏅殑椋庢牸锛堣瀹屽叏鎶婄浜屽紶鍥剧殑浜у搧鍘绘帀锛夛紝涓嶈鏈夊悓鏃跺嚭鐜扮殑鎯呭喌锛屼繚鎸佺涓€寮犱骇鍝佺殑褰㈢姸銆佹潗璐ㄣ€佺壒寰佹瘮渚嬨€佹憜鏀捐搴﹀強鏁伴噺瀹屽叏涓€鑷达紝涓撲笟鎽勫奖锛岄珮璐ㄩ噺锛?K鍒嗚鲸鐜?';
    const baseUrl = this.normalizeBaseUrl(this.config.baseUrl || DEFAULT_GEMINI_BASE_URL);
    const modelName = this.config.modelName || DEFAULT_GEMINI_MODEL;

    if (this.isToApisBaseUrl(baseUrl)) {
      return this.backgroundReplaceWithToApis(
        originalImageUrl,
        referenceImageUrl,
        finalPrompt,
        baseUrl,
        modelName
      );
    }

    return this.backgroundReplaceWithGeminiNative(
      originalImageUrl,
      referenceImageUrl,
      finalPrompt,
      baseUrl,
      modelName
    );
  }

  private async backgroundReplaceWithGeminiNative(
    originalImageUrl: string,
    referenceImageUrl: string,
    finalPrompt: string,
    baseUrl: string,
    modelName: string
  ): Promise<ProcessResult> {
    const nativeModelName = modelName || DEFAULT_GEMINI_NATIVE_MODEL;
    const requestBody = {
      contents: [{
        parts: [
          { text: finalPrompt },
          convertToGeminiInlineData(originalImageUrl),
          convertToGeminiInlineData(referenceImageUrl),
        ],
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1',
        },
      },
    };

    const apiUrl = `${baseUrl}/v1beta/models/${nativeModelName}:generateContent`;

    try {
      const data: GeminiNativeResponse = await postJson(
        apiUrl,
        requestBody,
        { 'x-goog-api-key': this.config.apiKey },
        { timeout: 300000 }
      );

      const imageBase64 = data.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData
      )?.inlineData?.data;

      if (imageBase64) {
        const dataUrl = `data:image/png;base64,${imageBase64}`;
        const imageSize = Math.floor(imageBase64.length * 0.75);

        return {
          id: `gemini-${Date.now()}`,
          imageData: dataUrl,
          imageSize,
        };
      }

      const textContent = data.candidates?.[0]?.content?.parts?.find(
        (part) => part.text
      )?.text;

      if (textContent) {
        const urlMatch = textContent.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
        if (urlMatch) {
          const { dataUrl, imageSize } = await this.downloadImageAsDataUrl(urlMatch[1]);
          return {
            id: `gemini-${Date.now()}`,
            imageData: dataUrl,
            imageSize,
          };
        }
      }

      throw new Error('鏈兘浠?Gemini 鍝嶅簲涓彁鍙栧浘鐗囨暟鎹?');
    } catch (error) {
      console.error('[Gemini Processor] 澶勭悊澶辫触:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Gemini API 璇锋眰澶辫触: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async backgroundReplaceWithToApis(
    originalImageUrl: string,
    referenceImageUrl: string,
    finalPrompt: string,
    baseUrl: string,
    modelName: string
  ): Promise<ProcessResult> {
    const imageUrls = await Promise.all([
      this.uploadImageToToApis(baseUrl, this.config.apiKey, originalImageUrl, 1),
      this.uploadImageToToApis(baseUrl, this.config.apiKey, referenceImageUrl, 2),
    ]);

    const task = await postJson<ToApisGenerationTaskResponse>(
      `${baseUrl}/v1/images/generations`,
      {
        model: modelName,
        prompt: finalPrompt,
        size: '1:1',
        n: 1,
        image_urls: imageUrls,
        metadata: {
          resolution: '2K',
        },
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      { timeout: 120000 }
    );

    const taskId = task.id || task.task_id;
    if (!taskId) {
      console.error('[Gemini Processor] toapis generation response missing task id:', JSON.stringify(task));
      throw new Error('toapis 鏈繑鍥炰换鍔?ID');
    }

    console.info(`[Gemini Processor] toapis task created: ${taskId}, model=${modelName}`);

    const resultUrl = await this.pollToApisResult(baseUrl, this.config.apiKey, taskId);
    const { dataUrl, imageSize } = await this.downloadImageAsDataUrl(resultUrl);

    return {
      id: taskId,
      imageData: dataUrl,
      imageSize,
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
    formData.append('file', blob, `gemini-input-${index}.${extension}`);

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
      throw new Error(`toapis 鍥剧墖涓婁紶澶辫触: HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as ToApisUploadResponse;
    const uploadedUrl = this.extractToApisUploadUrl(data);

    if (!uploadedUrl) {
      console.error('[Gemini Processor] toapis upload response missing url:', JSON.stringify(data));
      throw new Error('toapis 鍥剧墖涓婁紶鎴愬姛锛屼絾鏈繑鍥?URL');
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
          `[Gemini Processor] toapis task ${taskId} poll ${attempt + 1}/${TOAPIS_MAX_POLL_ATTEMPTS}: status=${status}, progress=${progress ?? 'n/a'}`
        );
      }

      lastStatus = status;
      lastProgress = progress;

      if (task.status === 'completed') {
        const resultUrl = this.extractToApisResultUrl(task);
        if (!resultUrl) {
          console.error('[Gemini Processor] toapis completed task missing result url:', JSON.stringify(task));
          throw new Error('toapis 浠诲姟宸插畬鎴愶紝浣嗘湭杩斿洖缁撴灉鍥剧墖 URL');
        }
        return resultUrl;
      }

      if (task.status === 'failed') {
        throw new Error(task.error?.message || 'toapis 鍥惧儚鐢熸垚澶辫触');
      }

      await new Promise((resolve) => setTimeout(resolve, TOAPIS_POLL_INTERVAL_MS));
    }

    const waitedSeconds = Math.round((TOAPIS_MAX_POLL_ATTEMPTS * TOAPIS_POLL_INTERVAL_MS) / 1000);
    throw new Error(
      `toapis 鍥惧儚鐢熸垚瓒呮椂锛岃绋嶅悗閲嶈瘯 (taskId: ${taskId}, lastStatus: ${lastStatus}, lastProgress: ${lastProgress ?? 'n/a'}, waited: ${waitedSeconds}s)`
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

  private async downloadImageAsDataUrl(url: string): Promise<{ dataUrl: string; imageSize: number }> {
    const blob = await downloadBlob(url, {}, { timeout: 120000 });
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = blob.type || 'image/png';

    return {
      dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
      imageSize: buffer.length,
    };
  }

  private mimeTypeToExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'image/gif':
        return 'gif';
      default:
        return 'png';
    }
  }

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  private isToApisBaseUrl(baseUrl: string): boolean {
    return baseUrl.includes('toapis.com');
  }

  private extractToApisUploadUrl(response: ToApisUploadResponse): string | undefined {
    if (!response?.data) {
      return undefined;
    }

    if (Array.isArray(response.data)) {
      return response.data[0]?.url;
    }

    return response.data.url;
  }

  private extractToApisResultUrl(task: ToApisGenerationTaskResponse): string | undefined {
    if (task.url) {
      return task.url;
    }

    if (Array.isArray(task.result?.data)) {
      return task.result.data[0]?.url;
    }

    if (task.result?.data && !Array.isArray(task.result.data)) {
      return task.result.data.url;
    }

    return task.result?.url;
  }

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    throw new Error('Gemini enhance not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    throw new Error('Gemini generate not implemented yet');
  }
}
