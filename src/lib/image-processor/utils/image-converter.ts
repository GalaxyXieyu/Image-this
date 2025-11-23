/**
 * 图片格式转换工具
 * 处理 base64、URL、本地路径之间的转换
 */

/**
 * 判断是否为 HTTP/HTTPS URL
 */
export function isHttpUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

/**
 * 判断是否为 base64 Data URL
 */
export function isBase64DataUrl(input: string): boolean {
  return input.startsWith('data:image/');
}

/**
 * 判断是否为本地路径
 */
export function isLocalPath(input: string): boolean {
  return input.startsWith('/uploads/') || input.startsWith('./') || input.startsWith('../');
}

/**
 * 从 Data URL 中提取 base64 数据
 */
export function extractBase64FromDataUrl(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
}

/**
 * 从 Data URL 中提取 MIME 类型
 */
export function extractMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,/);
  return match ? match[1] : 'image/jpeg';
}

/**
 * 将纯 base64 转换为 Data URL
 */
export function base64ToDataUrl(base64: string, mimeType: string = 'image/jpeg'): string {
  // 如果已经是 Data URL，直接返回
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 转换为 Gemini API 格式的 inline data
 */
export function convertToGeminiInlineData(imageUrl: string): {
  inlineData: { mimeType: string; data: string };
} {
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
 * 转换为 GPT API 格式的 image_url
 */
export function convertToGptImageUrl(imageUrl: string): { type: 'image_url'; image_url: { url: string } } {
  const isUrl = isHttpUrl(imageUrl);
  const isDataUrl = isBase64DataUrl(imageUrl);
  
  let url: string;
  if (isUrl) {
    url = imageUrl;
  } else if (isDataUrl) {
    url = imageUrl;
  } else {
    // 假设是纯 base64
    url = base64ToDataUrl(imageUrl);
  }
  
  return {
    type: 'image_url',
    image_url: { url }
  };
}

/**
 * 读取本地文件并转换为 base64 Data URL
 */
export async function localPathToDataUrl(localPath: string): Promise<string> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const filePath = path.join(process.cwd(), 'public', localPath);
  const imageBuffer = await fs.readFile(filePath);
  const base64Data = imageBuffer.toString('base64');
  
  // 根据文件扩展名确定 MIME 类型
  const ext = path.extname(localPath).toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypeMap[ext] || 'image/jpeg';
  
  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * 计算 base64 图片的大小（字节）
 */
export function getBase64ImageSize(base64OrDataUrl: string): number {
  const base64 = extractBase64FromDataUrl(base64OrDataUrl);
  return Math.floor(base64.length * 0.75);
}
