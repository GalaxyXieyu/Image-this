/**
 * 火山引擎图片处理器
 */

import { IImageProcessor, ProcessResult, VolcengineConfig } from '../types';
import {
  isBase64DataUrl,
  isLocalPath,
  localPathToDataUrl,
  extractBase64FromDataUrl,
  base64ToDataUrl
} from '../utils';
import { postJson } from '../utils/api-client';
import { generateVolcengineHeaders, getVolcengineApiUrl } from '../utils/volcengine-signature';

export class VolcengineProcessor implements IImageProcessor {
  constructor(private config: VolcengineConfig) {}

  /**
   * 画质增强
   */
  async enhance(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    const {
      resolutionBoundary = '720p',
      enableHdr = false,
      enableWb = false,
      resultFormat = 1,
      jpgQuality = 95,
      skipDbSave = false
    } = params || {};

    if (!this.config.accessKey || !this.config.secretKey) {
      throw new Error('VOLCENGINE_NOT_CONFIGURED:请先配置火山引擎 Access Key 和 Secret Key');
    }

    console.log(`[Volcengine Processor] 画质增强 - 分辨率: ${resolutionBoundary}`);

    try {
      // 处理输入图片
      let imageUrl: string;
      
      if (isLocalPath(imageInput)) {
        // 本地路径：转换为 base64 再上传到图床
        const dataUrl = await localPathToDataUrl(imageInput);
        imageUrl = await this.uploadToImageHost(dataUrl);
      } else if (isBase64DataUrl(imageInput)) {
        // base64 Data URL：上传到图床
        imageUrl = await this.uploadToImageHost(imageInput);
      } else {
        // 假设是 URL，直接使用
        imageUrl = imageInput;
      }

      console.log(`[Volcengine Processor] 图片准备完成，URL类型: ${imageUrl.startsWith('http') ? 'HTTP' : imageUrl.startsWith('data:') ? 'Data URL' : 'Unknown'}`);

      const requestBody = {
        req_key: 'lens_nnsr2_pic_common',
        image_urls: [imageUrl],
        model_quality: 'MQ',
        result_format: resultFormat,
        jpg_quality: jpgQuality,
        return_url: false
      };

      const bodyStr = JSON.stringify(requestBody);
      const headers = generateVolcengineHeaders(bodyStr, this.config.accessKey, this.config.secretKey);
      const apiUrl = getVolcengineApiUrl();

      console.log(`[Volcengine Processor] 发送API请求，图片URL长度: ${imageUrl.length}`);
      
      const result = await postJson(apiUrl, requestBody, headers, { timeout: 120000 });

      if (result.code !== 10000) {
        throw new Error(`画质增强API失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
      }

      if (!result.data?.binary_data_base64 || result.data.binary_data_base64.length === 0) {
        throw new Error('未获取到增强结果');
      }

      const base64Data = result.data.binary_data_base64[0];
      const resultImageData = base64ToDataUrl(base64Data, 'image/jpeg');
      const imageSize = Math.floor(base64Data.length * 0.75);

      console.log(`[Volcengine Processor] 完成 - 大小: ${(imageSize / 1024).toFixed(0)}KB`);

      return {
        id: `volcengine-enhance-${Date.now()}`,
        imageData: resultImageData,
        imageSize
      };

    } catch (error) {
      console.error(`[Volcengine Processor] 增强失败:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * 智能扩图
   */
  async outpaint(userId: string, imageInput: string, params?: any): Promise<ProcessResult> {
    const {
      prompt = '扩展图像，保持风格一致',
      top = 0.1,
      bottom = 0.1,
      left = 0.1,
      right = 0.1,
      maxHeight = 1920,
      maxWidth = 1920
    } = params || {};

    if (!this.config.accessKey || !this.config.secretKey) {
      throw new Error('VOLCENGINE_NOT_CONFIGURED:请先配置火山引擎 Access Key 和 Secret Key');
    }

    console.log(`[Volcengine Processor] 智能扩图 - 比例: 上${top} 下${bottom} 左${left} 右${right}`);

    try {
      // 处理输入
      let requestBody: any;
      
      if (isLocalPath(imageInput)) {
        // 本地路径：转换为 base64 再上传
        const dataUrl = await localPathToDataUrl(imageInput);
        const imageUrl = await this.uploadToImageHost(dataUrl);
        requestBody = this.buildOutpaintRequest(imageUrl, prompt, top, bottom, left, right, maxHeight, maxWidth, false);
      } else if (isBase64DataUrl(imageInput)) {
        // base64：可以直接使用或上传
        const cleanBase64 = extractBase64FromDataUrl(imageInput);
        requestBody = this.buildOutpaintRequest(cleanBase64, prompt, top, bottom, left, right, maxHeight, maxWidth, true);
      } else {
        // URL：直接使用
        requestBody = this.buildOutpaintRequest(imageInput, prompt, top, bottom, left, right, maxHeight, maxWidth, false);
      }

      const bodyStr = JSON.stringify(requestBody);
      const headers = generateVolcengineHeaders(bodyStr, this.config.accessKey, this.config.secretKey);
      const apiUrl = getVolcengineApiUrl();

      const result = await postJson(apiUrl, requestBody, headers, { timeout: 120000 });

      if (result.code !== 10000) {
        throw new Error(`扩图API失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
      }

      if (!result.data?.binary_data_base64 || result.data.binary_data_base64.length === 0) {
        throw new Error('未获取到扩图结果');
      }

      const base64Data = result.data.binary_data_base64[0];
      const resultImageData = base64ToDataUrl(base64Data, 'image/jpeg');
      const imageSize = Math.floor(base64Data.length * 0.75);

      console.log(`[Volcengine Processor] 完成 - 大小: ${(imageSize / 1024).toFixed(0)}KB`);

      return {
        id: `volcengine-outpaint-${Date.now()}`,
        imageData: resultImageData,
        imageSize,
        metadata: { expandRatio: { top, bottom, left, right } }
      };

    } catch (error) {
      console.error(`[Volcengine Processor] 扩图失败:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * 构建扩图请求体
   */
  private buildOutpaintRequest(
    imageData: string,
    prompt: string,
    top: number,
    bottom: number,
    left: number,
    right: number,
    maxHeight: number,
    maxWidth: number,
    isBase64: boolean
  ): any {
    const baseRequest = {
      req_key: 'i2i_outpainting',
      custom_prompt: prompt,
      scale: 7.0,
      seed: -1,
      steps: 30,
      strength: 0.8,
      top,
      bottom,
      left,
      right,
      max_height: maxHeight,
      max_width: maxWidth
    };

    if (isBase64) {
      return {
        ...baseRequest,
        binary_data_base64: [imageData]
      };
    } else {
      return {
        ...baseRequest,
        image_urls: [imageData]
      };
    }
  }

  /**
   * 上传图片到图床
   */
  private async uploadToImageHost(dataUrl: string): Promise<string> {
    try {
      const { uploadBase64ToSuperbed } = await import('@/lib/superbed-upload');
      const filename = `volcengine-temp-${Date.now()}.jpg`;
      const publicUrl = await uploadBase64ToSuperbed(dataUrl, filename);
      console.log(`[Volcengine Processor] 图片已上传到图床: ${publicUrl.substring(0, 50)}...`);
      return publicUrl;
    } catch (error) {
      console.error('[Volcengine Processor] 图床上传失败，尝试使用本地存储:', error);
      // 如果图床上传失败，尝试保存到本地并返回公网 URL
      const { uploadBase64Image } = await import('@/lib/storage');
      const localPath = await uploadBase64Image(dataUrl, `volcengine-temp-${Date.now()}.jpg`);
      
      // 构造完整的公网 URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
      const fullUrl = `${baseUrl}${localPath}`;
      console.log(`[Volcengine Processor] 使用本地存储: ${fullUrl}`);
      return fullUrl;
    }
  }
}
