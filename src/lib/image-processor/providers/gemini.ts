/**
 * Gemini 图片处理器
 * 使用 Gemini 原生 API 格式
 */

import { IImageProcessor, ProcessResult, GeminiConfig } from '../types';
import { convertToGeminiInlineData } from '../utils';
import { postJson } from '../utils/api-client';

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
    const baseUrl = this.config.baseUrl || 'https://yunwu.ai';
    const modelName = 'gemini-3-pro-image-preview';

    // 构建 Gemini 原生格式的请求
    const requestBody = {
      contents: [{
        parts: [
          { text: finalPrompt },
          convertToGeminiInlineData(originalImageUrl),
          convertToGeminiInlineData(referenceImageUrl)
        ]
      }],
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    };

    const apiUrl = `${baseUrl}/v1beta/models/${modelName}:generateContent`;

    try {
      const data: GeminiNativeResponse = await postJson(
        apiUrl,
        requestBody,
        { 'x-goog-api-key': this.config.apiKey },
        { timeout: 300000 } // 5分钟超时
      );

      // 查找返回的图片 base64 数据
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

      // 如果没有图片，尝试查找文本中的 URL
      const textContent = data.candidates?.[0]?.content?.parts?.find(
        part => part.text
      )?.text;

      if (textContent) {
        const urlMatch = textContent.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
        if (urlMatch) {
          return {
            id: `gemini-${Date.now()}`,
            imageData: urlMatch[1],
            imageSize: 0
          };
        }
      }

      throw new Error('未能从 Gemini 响应中提取图片数据');

    } catch (error) {
      console.error('[Gemini Processor] 处理失败:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error(`Gemini API 请求失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
