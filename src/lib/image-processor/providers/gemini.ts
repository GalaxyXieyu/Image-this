/**
 * Gemini 图片处理器
 * 同时兼容 Gemini 原生 API 与 toapis 图片生成协议
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
  data?: Array<{
    url?: string;
  }>;
}

interface ToApisGenerationTaskResponse {
  id?: string;
  status?: string;
  progress?: number;
  error?: {
    message?: string;
  };
  result?: {
    type?: string;
    data?: Array<{
      url?: string;
    }>;
  };
}

const DEFAULT_GEMINI_BASE_URL = 'https://toapis.com';
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-image-preview';
const DEFAULT_GEMINI_NATIVE_MODEL = 'gemini-3-pro-image-preview';
const TOAPIS_POLL_INTERVAL_MS = 3000;
const TOAPIS_MAX_POLL_ATTEMPTS = 30;

export class GeminiProcessor implements IImageProcessor {
  constructor(private config: GeminiConfig) {}

  /**
   * 背景替换 - 使用 Gemini 图像生成能力
   */
  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.apiKey) {
      throw new Error('GEMINI_NOT_CONFIGURED:请先在设置页面配置 Gemini API Key');
    }

    const finalPrompt = customPrompt || prompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
    const baseUrl = this.normalizeBaseUrl(this.config.baseUrl || DEFAULT_GEMINI_BASE_URL);
    const modelName = this.config.modelName || DEFAULT_GEMINI_MODEL;

    if (this.isToApisBaseUrl(baseUrl)) {
      return this.backgroundReplaceWithToApis(originalImageUrl, referenceImageUrl, finalPrompt, baseUrl, modelName);
    }

    return this.backgroundReplaceWithGeminiNative(originalImageUrl, referenceImageUrl, finalPrompt, baseUrl, modelName);
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
          convertToGeminiInlineData(referenceImageUrl)
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1'
        }
      }
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
        part => part.inlineData
      )?.inlineData?.data;

      if (imageBase64) {
        const dataUrl = `data:image/png;base64,${imageBase64}`;
        const imageSize = Math.floor(imageBase64.length * 0.75);

        return {
          id: `gemini-${Date.now()}`,
          imageData: dataUrl,
          imageSize
        };
      }

      const textContent = data.candidates?.[0]?.content?.parts?.find(
        part => part.text
      )?.text;

      if (textContent) {
        const urlMatch = textContent.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
        if (urlMatch) {
          const { dataUrl, imageSize } = await this.downloadImageAsDataUrl(urlMatch[1]);
          return {
            id: `gemini-${Date.now()}`,
            imageData: dataUrl,
            imageSize
          };
        }
      }

      throw new Error('未能从 Gemini 响应中提取图片数据');
    } catch (error) {
      console.error('[Gemini Processor] 处理失败:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Gemini API 请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      this.uploadImageToToApis(baseUrl, this.config.apiKey, referenceImageUrl, 2)
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
          resolution: '2K'
        }
      },
      {
        Authorization: `Bearer ${this.config.apiKey}`
      },
      { timeout: 120000 }
    );

    if (!task.id) {
      throw new Error('toapis 未返回任务 ID');
    }

    const resultUrl = await this.pollToApisResult(baseUrl, this.config.apiKey, task.id);
    const { dataUrl, imageSize } = await this.downloadImageAsDataUrl(resultUrl);

    return {
      id: task.id,
      imageData: dataUrl,
      imageSize
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
        Authorization: `Bearer ${apiKey}`
      },
      body: formData,
      timeout: 120000
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`toapis 图片上传失败: HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json() as ToApisUploadResponse;
    const uploadedUrl = data.data?.[0]?.url;

    if (!uploadedUrl) {
      throw new Error('toapis 图片上传成功，但未返回 URL');
    }

    return uploadedUrl;
  }

  private async pollToApisResult(baseUrl: string, apiKey: string, taskId: string): Promise<string> {
    for (let attempt = 0; attempt < TOAPIS_MAX_POLL_ATTEMPTS; attempt++) {
      const task = await getJson<ToApisGenerationTaskResponse>(
        `${baseUrl}/v1/images/generations/${taskId}`,
        {
          Authorization: `Bearer ${apiKey}`
        },
        { timeout: 30000 }
      );

      if (task.status === 'completed') {
        const resultUrl = task.result?.data?.[0]?.url;
        if (!resultUrl) {
          throw new Error('toapis 任务已完成，但未返回结果图片 URL');
        }
        return resultUrl;
      }

      if (task.status === 'failed') {
        throw new Error(task.error?.message || 'toapis 图像生成失败');
      }

      await new Promise(resolve => setTimeout(resolve, TOAPIS_POLL_INTERVAL_MS));
    }

    throw new Error('toapis 图像生成超时，请稍后重试');
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
      imageSize: buffer.length
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

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    // TODO: 实现 Gemini 画质增强逻辑
    throw new Error('Gemini enhance not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    // TODO: 实现 Gemini 图片生成逻辑
    throw new Error('Gemini generate not implemented yet');
  }
}
