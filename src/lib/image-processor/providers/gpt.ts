import { mapProviderErrorMessage } from '@/lib/provider-error-utils';
import { GPTConfig, IImageProcessor, ProcessResult } from '../types';
import { postJson } from '../utils';

interface GenerationResponse {
  created?: number;
  data?: Array<{
    b64_json?: string;
    url?: string;
  }>;
}

const DEFAULT_BASE_URL = 'https://yunwu.ai';
const DEFAULT_MODEL = 'gpt-4o-image-vip';
const DEFAULT_IMAGE_SIZE = '1024x1024';

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

  private normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }
}
