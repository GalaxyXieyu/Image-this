/**
 * GPT 图片处理器
 */

import { IImageProcessor, ProcessResult, GPTConfig } from '../types';
import { getUserConfig } from '@/lib/user-config';
import { prisma } from '@/lib/prisma';

export class GPTProcessor implements IImageProcessor {
  constructor(private config: GPTConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    const { originalImageUrl, referenceImageUrl, prompt, customPrompt } = params;

    try {
      // 获取用户配置
      const userConfig = await getUserConfig(userId);
      const baseUrl = userConfig.gpt?.apiUrl || process.env.GPT_API_URL || 'https://yunwu.ai';
      const apiKey = userConfig.gpt?.apiKey || process.env.GPT_API_KEY;

      if (!apiKey) {
        throw new Error('GPT API Key未配置');
      }

      // 构建最终 prompt
      const finalPrompt = customPrompt || prompt || '保持产品主体完全不变，仅替换背景为类似参考场景的风格，保持产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

      // 判断是 URL 还是 base64
      const isOriginalUrl = originalImageUrl.startsWith('http://') || originalImageUrl.startsWith('https://');
      const isReferenceUrl = referenceImageUrl.startsWith('http://') || referenceImageUrl.startsWith('https://');

      // 构建 content
      const content = [
        { type: "text", text: finalPrompt },
        {
          type: "image_url",
          image_url: {
            url: isOriginalUrl ? originalImageUrl : (originalImageUrl.startsWith('data:') ? originalImageUrl : `data:image/png;base64,${originalImageUrl}`)
          }
        },
        {
          type: "image_url",
          image_url: {
            url: isReferenceUrl ? referenceImageUrl : (referenceImageUrl.startsWith('data:') ? referenceImageUrl : `data:image/png;base64,${referenceImageUrl}`)
          }
        }
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

      const requestBody = JSON.stringify(payload);
      console.log('[GPT Processor] 发送请求到:', apiUrl);

      // 使用更长的超时时间
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Connection': 'keep-alive'
          },
          body: requestBody,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

      console.log('[GPT Processor] 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT API 返回错误: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 从响应中提取图片 URL
      const content_response = data.choices?.[0]?.message?.content;
      if (content_response) {
        const imageUrlMatch = content_response.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (imageUrlMatch && imageUrlMatch[1]) {
          const imageUrl = imageUrlMatch[1];

          // 保存到数据库
          const processedImage = await prisma.processedImage.create({
            data: {
              userId,
              filename: `gpt-background-${Date.now()}.png`,
              originalUrl: originalImageUrl,
              processedUrl: imageUrl,
              processType: 'BACKGROUND_REMOVAL',
              status: 'COMPLETED'
            }
          });

          return {
            id: processedImage.id,
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
