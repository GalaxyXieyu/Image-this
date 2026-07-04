/**
 * 即梦图片处理器（统一版）
 * 支持两种调用方式：
 * 1. Ark API 模式：使用 arkApiKey + Bearer Token（推荐）
 * 2. 火山引擎视觉 API 模式：使用 accessKey + secretKey + 签名（兼容旧版）
 */

import { IImageProcessor, ProcessResult } from '../types';
import { generateVolcengineSignature } from '../utils/volcengine-signature';
import { postJson } from '../utils/api-client';
import { uploadBase64ToSuperbed } from '@/lib/superbed-upload';
import { jimengApiLock } from '../utils/jimeng-lock';

const LEGACY_HOST = 'visual.volcengineapi.com';
const LEGACY_REGION = 'cn-north-1';
const LEGACY_SERVICE = 'cv';
const LEGACY_VERSION = '2022-08-31';

interface UnifiedJimengConfig {
  // Ark API 模式
  arkApiKey?: string;
  baseUrl?: string;
  modelName?: string;
  //  legacy 视觉 API 模式
  accessKey?: string;
  secretKey?: string;
}

export class JimengProcessor implements IImageProcessor {
  constructor(private config: UnifiedJimengConfig) {}

  private isArkMode(): boolean {
    return !!this.config.arkApiKey;
  }

  private isLegacyMode(): boolean {
    return !!(this.config.accessKey && this.config.secretKey);
  }

  /**
   * 背景替换（统一入口）
   */
  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    if (this.isArkMode()) {
      return this.backgroundReplaceArk(params);
    }
    if (this.isLegacyMode()) {
      return this.backgroundReplaceLegacy(params);
    }
    throw new Error('即梦配置未设置，请配置 Ark API Key 或火山引擎 AccessKey/SecretKey');
  }

  // ==================== Ark API 模式 ====================

  private async backgroundReplaceArk(params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    const finalPrompt = customPrompt || prompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
    const baseUrl = this.config.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
    const modelName = this.config.modelName || 'seedream-4.5';

    console.log('[Jimeng Processor] Ark 模式开始背景替换');

    try {
      const referenceImages: string[] = [];

      if (originalImageUrl) {
        const dataUri = originalImageUrl.startsWith('data:')
          ? originalImageUrl
          : `data:image/png;base64,${originalImageUrl}`;
        referenceImages.push(dataUri);
      }

      if (referenceImageUrl) {
        const dataUri = referenceImageUrl.startsWith('data:')
          ? referenceImageUrl
          : `data:image/png;base64,${referenceImageUrl}`;
        referenceImages.push(dataUri);
      }

      const requestBody: any = {
        model: modelName,
        prompt: finalPrompt,
        size: '1728x2304',
        response_format: 'b64_json',
        watermark: false
        // 注：不再固定下发 sequential_image_generation —— 新版 Seedream(doubao-seedream-4-5) 会以 400 InvalidParameter 拒绝该参数
      };

      if (referenceImages.length === 1) {
        requestBody.image = referenceImages[0];
      } else if (referenceImages.length > 1) {
        requestBody.image = referenceImages;
      }

      const response = await postJson(
        baseUrl,
        requestBody,
        {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.arkApiKey}`
        },
        { timeout: 60000, retries: 3 }
      );

      if (response.error) {
        throw new Error(`即梦 API 错误: ${response.error.message || 'Unknown error'}`);
      }

      if (!response.data || response.data.length === 0) {
        throw new Error('即梦 API 返回空数据');
      }

      const item = response.data[0];

      if (item.error) {
        throw new Error(`即梦生成错误: ${item.error.message || 'Unknown error'}`);
      }

      if (!item.b64_json) {
        throw new Error('即梦 API 未返回图片数据');
      }

      const imageData = `data:image/jpeg;base64,${item.b64_json}`;
      const imageSize = Math.floor(item.b64_json.length * 0.75);

      console.log('[Jimeng Processor] Ark 模式背景替换完成，图片大小:', (imageSize / 1024).toFixed(0), 'KB');

      return {
        id: `jimeng-${Date.now()}`,
        imageData,
        imageSize,
        metadata: {
          prompt: finalPrompt,
          model: modelName,
          size: item.size || '1728x2304',
          usage: response.usage,
          created: response.created
        }
      };

    } catch (error) {
      console.error('[Jimeng Processor] Ark 模式背景替换失败:', error);
      throw error;
    }
  }

  // ==================== Legacy 视觉 API 模式 ====================

  private async backgroundReplaceLegacy(params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt, superbedToken } = params;

    const finalPrompt = customPrompt || prompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

    console.log('[Jimeng Processor] Legacy 模式开始背景替换');
    console.log('[Jimeng Processor] 图床 Token:', superbedToken ? `${superbedToken.substring(0, 10)}...` : '未提供');

    try {
      const imageUrls: string[] = [];

      if (originalImageUrl) {
        const dataUri = originalImageUrl.startsWith('data:')
          ? originalImageUrl
          : `data:image/png;base64,${originalImageUrl}`;
        console.log('[Jimeng Processor] 正在上传产品图到图床...');
        const httpUrl = await uploadBase64ToSuperbed(dataUri, `jimeng-original-${Date.now()}.png`, superbedToken);
        console.log('[Jimeng Processor] 产品图上传完成:', httpUrl.substring(0, 60) + '...');
        imageUrls.push(httpUrl);
      }

      if (referenceImageUrl) {
        const dataUri = referenceImageUrl.startsWith('data:')
          ? referenceImageUrl
          : `data:image/png;base64,${referenceImageUrl}`;
        console.log('[Jimeng Processor] 正在上传参考图到图床...');
        const httpUrl = await uploadBase64ToSuperbed(dataUri, `jimeng-reference-${Date.now()}.png`, superbedToken);
        console.log('[Jimeng Processor] 参考图上传完成:', httpUrl.substring(0, 60) + '...');
        imageUrls.push(httpUrl);
      }

      const result = await this.callLegacyAPI(finalPrompt, imageUrls, 2048, 2048);

      let imageData = '';
      if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
        imageData = `data:image/jpeg;base64,${result.binary_data_base64[0]}`;
      }

      const imageSize = imageData ? Math.floor(imageData.length * 0.75) : 0;

      console.log('[Jimeng Processor] Legacy 模式背景替换完成');

      return {
        id: `jimeng-${Date.now()}`,
        imageData,
        imageSize,
        metadata: {
          prompt: finalPrompt,
          model: 'jimeng_t2i_v40',
          imageUrls
        }
      };

    } catch (error) {
      console.error('[Jimeng Processor] Legacy 模式背景替换失败:', error);
      throw error;
    }
  }

  private async callLegacyAPI(
    prompt: string,
    imageUrls?: string[],
    width = 2048,
    height = 2048,
    maxRetries = 3
  ): Promise<any> {
    return jimengApiLock.enqueue(async () => {
      return this.executeLegacyAPI(prompt, imageUrls, width, height, maxRetries);
    });
  }

  private async executeLegacyAPI(
    prompt: string,
    imageUrls?: string[],
    width = 2048,
    height = 2048,
    maxRetries = 3
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000);
          console.log(`[Jimeng API] 重试 ${attempt}/${maxRetries}，等待 ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const requestBody: any = {
          req_key: 'jimeng_t2i_v40',
          req_json: '{}',
          prompt,
          width,
          height,
          scale: 0.5,
          force_single: true
        };

        if (imageUrls && imageUrls.length > 0) {
          requestBody.image_urls = imageUrls;
        }

        const bodyStr = JSON.stringify(requestBody);
        const query = `Action=CVProcess&Version=${LEGACY_VERSION}`;

        const t = new Date();
        const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
        const payloadHash = require('crypto').createHash('sha256').update(bodyStr).digest('hex');

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Host': LEGACY_HOST,
          'X-Date': timestamp,
          'X-Content-Sha256': payloadHash
        };

        const authorization = generateVolcengineSignature(
          'POST',
          '/',
          query,
          headers,
          bodyStr,
          timestamp,
          this.config.secretKey!,
          this.config.accessKey!
        );

        headers['Authorization'] = authorization;

        const apiUrl = `https://${LEGACY_HOST}/?${query}`;

        const result = await postJson(apiUrl, requestBody, headers, { timeout: 60000, retries: 1 });

        if (result.code !== 10000) {
          if (result.code === 50430) {
            jimengApiLock.setCooldown(60);
            throw new Error(`CONCURRENT_LIMIT:${result.message || 'API并发限制'}`);
          }
          throw new Error(`即梦API调用失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
        }

        return result.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const errorMessage = lastError.message;

        if (errorMessage.includes('429') || errorMessage.includes('CONCURRENT_LIMIT') || errorMessage.includes('Concurrent Limit')) {
          jimengApiLock.setCooldown(60);
        }

        const isRetryable =
          errorMessage.includes('CONCURRENT_LIMIT') ||
          errorMessage.includes('429') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('500') ||
          errorMessage.includes('503') ||
          errorMessage.includes('504');

        if (!isRetryable || attempt === maxRetries) {
          console.error(`[Jimeng API] 失败: ${lastError.message}`);
          break;
        }

        console.log(`[Jimeng API] 可重试错误，将进行重试: ${errorMessage.substring(0, 100)}`);
      }
    }

    throw lastError || new Error('即梦API调用失败');
  }

  async enhance(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    throw new Error('即梦不支持画质增强功能');
  }

  async outpaint(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    throw new Error('即梦不支持扩图功能');
  }

  async generate(userId: string, prompt: string, params?: any): Promise<ProcessResult> {
    throw new Error('即梦暂不支持纯文本生成');
  }
}
