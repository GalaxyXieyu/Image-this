/**
 * 即梦 4.5 (Seedream 4.5 via Ark API) 图片处理器
 * 使用火山引擎的 Ark API 调用即梦 4.5 模型
 */

import { IImageProcessor, ProcessResult } from '../types';
import { postJson } from '../utils/api-client';

interface Jimeng45Config {
  arkApiKey: string;
}

export class Jimeng45Provider implements IImageProcessor {
  private readonly API_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
  private readonly MODEL = 'seedream-4.5';

  constructor(private config: Jimeng45Config) {}

  /**
   * 背景替换（使用即梦 4.5 API）
   */
  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.arkApiKey) {
      throw new Error('ARK_API_KEY_NOT_CONFIGURED: 请先配置即梦 4.5 ARK API Key');
    }

    const finalPrompt = customPrompt || prompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

    console.log('[Jimeng 4.5 Processor] 开始背景替换');

    try {
      // 准备参考图片（即梦 4.5 支持 1-14 张图片）
      const referenceImages: string[] = [];

      if (originalImageUrl) {
        // 确保是 data URI 格式
        const dataUri = originalImageUrl.startsWith('data:')
          ? originalImageUrl
          : `data:image/png;base64,${originalImageUrl}`;
        referenceImages.push(dataUri);
        console.log('[Jimeng 4.5 Processor] 产品图准备完成（使用 base64）');
      }

      if (referenceImageUrl) {
        // 确保是 data URI 格式
        const dataUri = referenceImageUrl.startsWith('data:')
          ? referenceImageUrl
          : `data:image/png;base64,${referenceImageUrl}`;
        referenceImages.push(dataUri);
        console.log('[Jimeng 4.5 Processor] 参考图准备完成（使用 base64）');
      }

      // 构建请求体
      const requestBody: any = {
        model: this.MODEL,
        prompt: finalPrompt,
        size: '1728x2304', // 3:4 比例，高质量
        response_format: 'b64_json',
        watermark: false,
        sequential_image_generation: false
      };

      // 添加参考图片
      if (referenceImages.length === 1) {
        requestBody.image = referenceImages[0];
      } else if (referenceImages.length > 1) {
        requestBody.image = referenceImages;
      }

      console.log('[Jimeng 4.5 API] 发送请求，参考图片数量:', referenceImages.length);

      // 调用 Ark API
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.arkApiKey}`
      };

      const response = await postJson(
        this.API_ENDPOINT,
        requestBody,
        headers,
        { timeout: 60000, retries: 3 }
      );

      // 检查响应
      if (response.error) {
        throw new Error(`即梦 4.5 API 错误: ${response.error.message || 'Unknown error'}`);
      }

      if (!response.data || response.data.length === 0) {
        throw new Error('即梦 4.5 API 返回空数据');
      }

      // 获取第一张图片
      const item = response.data[0];

      if (item.error) {
        throw new Error(`即梦 4.5 生成错误: ${item.error.message || 'Unknown error'}`);
      }

      if (!item.b64_json) {
        throw new Error('即梦 4.5 API 未返回图片数据');
      }

      // 构建 data URI
      const imageData = `data:image/jpeg;base64,${item.b64_json}`;
      const imageSize = Math.floor(item.b64_json.length * 0.75);

      console.log('[Jimeng 4.5 Processor] 背景替换完成，图片大小:', (imageSize / 1024).toFixed(0), 'KB');

      return {
        id: `jimeng45-${Date.now()}`,
        imageData,
        imageSize,
        metadata: {
          prompt: finalPrompt,
          model: this.MODEL,
          size: item.size || '1728x2304',
          usage: response.usage,
          created: response.created
        }
      };

    } catch (error) {
      console.error('[Jimeng 4.5 Processor] 背景替换失败:', error);
      throw error;
    }
  }

  // 其他方法暂不实现
  async enhance(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    throw new Error('Jimeng 4.5 不支持画质增强功能');
  }

  async outpaint(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    throw new Error('Jimeng 4.5 不支持扩图功能');
  }

  async generate(userId: string, prompt: string, params?: any): Promise<ProcessResult> {
    throw new Error('Jimeng 4.5 暂不支持纯文本生成');
  }
}
