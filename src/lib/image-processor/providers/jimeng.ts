/**
 * 即梦（火山引擎）图片处理器
 * 基于火山引擎的即梦 API
 */

import { IImageProcessor, ProcessResult, VolcengineConfig } from '../types';
import { generateVolcengineSignature } from '../utils/volcengine-signature';
import { postJson } from '../utils/api-client';
import { uploadBase64ToSuperbed } from '@/lib/superbed-upload';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

export class JimengProcessor implements IImageProcessor {
  constructor(private config: VolcengineConfig) {}

  /**
   * 背景替换（使用即梦 API）
   */
  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.accessKey || !this.config.secretKey) {
      throw new Error('VOLCENGINE_NOT_CONFIGURED:请先配置火山引擎 Access Key 和 Secret Key');
    }

    const finalPrompt = customPrompt || prompt || '保持产品主体完全不变，仅替换背景为类似参考场景的风格';

    console.log('[Jimeng Processor] 开始背景替换');

    try {
      // 上传参考图片到图床
      const imageUrls: string[] = [];
      
      if (originalImageUrl) {
        const url = await uploadBase64ToSuperbed(
          originalImageUrl,
          `jimeng-original-${Date.now()}.jpg`
        );
        imageUrls.push(url);
      }

      if (referenceImageUrl) {
        const url = await uploadBase64ToSuperbed(
          referenceImageUrl,
          `jimeng-reference-${Date.now()}.jpg`
        );
        imageUrls.push(url);
      }

      // 调用即梦 API
      const result = await this.callJimengAPI(
        finalPrompt,
        imageUrls,
        2048,
        2048
      );

      // 获取生成的图片
      let imageData = '';
      if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
        imageData = `data:image/jpeg;base64,${result.binary_data_base64[0]}`;
      }

      const imageSize = imageData ? Math.floor(imageData.length * 0.75) : 0;

      console.log('[Jimeng Processor] 背景替换完成');

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
      console.error('[Jimeng Processor] 背景替换失败:', error);
      throw error;
    }
  }

  /**
   * 调用即梦 API
   */
  private async callJimengAPI(
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
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
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
        const query = `Action=CVProcess&Version=${VERSION}`;
        
        // 生成签名和请求头
        const t = new Date();
        const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
        const payloadHash = require('crypto').createHash('sha256').update(bodyStr).digest('hex');
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Host': HOST,
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
          this.config.secretKey,
          this.config.accessKey
        );
        
        headers['Authorization'] = authorization;

        const apiUrl = `https://${HOST}/?${query}`;

        const result = await postJson(
          apiUrl,
          requestBody,
          headers,
          { timeout: 60000, retries: 1 }
        );

        if (result.code !== 10000) {
          if (result.code === 50430) {
            throw new Error(`CONCURRENT_LIMIT:${result.message || 'API并发限制'}`);
          }
          throw new Error(`即梦API调用失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
        }

        return result.data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        const errorMessage = lastError.message;
        const isRetryable =
          errorMessage.includes('CONCURRENT_LIMIT') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ECONNRESET') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('503') ||
          errorMessage.includes('504');

        if (!isRetryable || attempt === maxRetries) {
          console.error(`[Jimeng API] 失败: ${lastError.message}`);
          break;
        }
      }
    }

    throw lastError || new Error('即梦API调用失败');
  }
}
