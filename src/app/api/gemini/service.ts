/**
 * Google Gemini 图像处理服务
 * 使用 Gemini 原生 API 格式
 */

import { getUserConfig } from '@/lib/user-config';

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

/**
 * 将图片转换为 Gemini 格式的 inline data
 */
function convertToInlineData(imageUrl: string): { inlineData: { mimeType: string; data: string } } {
  // 如果是 data URL，提取 base64
  if (imageUrl.startsWith('data:')) {
    const matches = imageUrl.match(/data:([^;]+);base64,(.+)/);
    if (matches) {
      return {
        inlineData: {
          mimeType: matches[1],
          data: matches[2]
        }
      };
    }
  }
  
  // 如果是纯 base64，假设是 jpeg
  return {
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageUrl.replace(/^data:image\/[^;]+;base64,/, '')
    }
  };
}

/**
 * 使用 Gemini 原生 API 生成图像
 */
export async function processWithGemini(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string
): Promise<string | null> {
  try {
    // 从用户配置获取 API Key 和 Base URL
    const userConfig = await getUserConfig(userId);
    const apiKey = userConfig.gemini?.apiKey || process.env.GEMINI_API_KEY;
    const baseUrl = userConfig.gemini?.baseUrl || process.env.GEMINI_BASE_URL || 'https://yunwu.ai';
    const modelName = 'gemini-3-pro-image-preview';

    if (!apiKey) {
      throw new Error('GEMINI_NOT_CONFIGURED:请先在设置页面配置 Gemini API Key');
    }

    console.log(`[Gemini API] 使用配置 - BaseURL: ${baseUrl}`);

    // 构建 Gemini 原生格式的请求
    const requestBody = {
      contents: [{
        parts: [
          { text: prompt },
          convertToInlineData(originalImageUrl),
          convertToInlineData(referenceImageUrl)
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
    
    console.log('[Gemini API] 发送请求到:', apiUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    console.log('[Gemini API] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini API] 错误响应:', errorText);
      throw new Error(`Gemini API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GeminiNativeResponse = await response.json();
    console.log('[Gemini API] 响应数据:', JSON.stringify(data, null, 2));

    // 查找返回的图片 base64 数据
    const imageBase64 = data.candidates?.[0]?.content?.parts?.find(
      part => part.inlineData
    )?.inlineData?.data;

    if (imageBase64) {
      // 返回 data URL 格式
      const dataUrl = `data:image/png;base64,${imageBase64}`;
      console.log('[Gemini API] 成功获取图片，大小:', (imageBase64.length / 1024).toFixed(2), 'KB');
      return dataUrl;
    }

    // 如果没有图片，尝试查找文本中的 URL
    const textContent = data.candidates?.[0]?.content?.parts?.find(
      part => part.text
    )?.text;

    if (textContent) {
      console.log('[Gemini API] 返回文本:', textContent);
      
      // 尝试从文本中提取图片 URL
      const urlMatch = textContent.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
      if (urlMatch) {
        return urlMatch[1];
      }
    }

    return null;

  } catch (error) {
    console.error('[Gemini API] 请求失败:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`Gemini API 请求失败: ${error.message}`);
    }
    throw error;
  }
}
