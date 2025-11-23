/**
 * GPT 图片处理器
 */

import { IImageProcessor, ProcessResult, GPTConfig } from '../types';
import { convertToGptImageUrl } from '../utils';
import { postJson } from '../utils/api-client';

export class GPTProcessor implements IImageProcessor {
  constructor(private config: GPTConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    if (!this.config.apiKey) {
      throw new Error('GPT API Key未配置');
    }

    const baseUrl = this.config.apiUrl || 'https://yunwu.ai';
    const finalPrompt = customPrompt || prompt || '保持产品主体完全不变，仅替换背景为类似参考场景的风格，保持产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

    console.log('[GPT Processor] 发送请求到:', baseUrl);

    try {
      // 构建 content
      const content = [
        { type: "text", text: finalPrompt },
        convertToGptImageUrl(originalImageUrl),
        convertToGptImageUrl(referenceImageUrl)
      ];

      const payload = {
        model: "gpt-4o-image-vip",
        messages: [
          {
            role: "user",
            content: content
          }
        ],
        max_tokens: 124000
      };

      const apiUrl = baseUrl.endsWith('/') ?
        `${baseUrl}v1/chat/completions` :
        `${baseUrl}/v1/chat/completions`;

      const data = await postJson(
        apiUrl,
        payload,
        {
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Connection': 'keep-alive'
        },
        { timeout: 300000 } // 5分钟超时
      );

      console.log('[GPT Processor] 响应状态: 成功');

      // 从响应中提取图片 URL
      const content_response = data.choices?.[0]?.message?.content;
      if (content_response) {
        const imageUrlMatch = content_response.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (imageUrlMatch && imageUrlMatch[1]) {
          const imageUrl = imageUrlMatch[1];

          return {
            id: `gpt-${Date.now()}`,
            imageData: imageUrl,
            imageSize: 0 // GPT 返回的是 URL，无法获取大小
          };
        }
      }

      throw new Error('未能从 GPT 响应中提取图片 URL');

    } catch (error) {
      console.error('[GPT Processor] 处理失败:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    // TODO: 实现 GPT 画质增强逻辑
    throw new Error('GPT enhance not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    // TODO: 实现 GPT 图片生成逻辑
    throw new Error('GPT generate not implemented yet');
  }
}
