import axios from 'axios';
import FormData from 'form-data';

const SUPERBED_TOKEN = process.env.SUPERBED_TOKEN || '00fbe01340604063b1f59aedc0481ddc';

/**
 * 上传图片到superbed图床并返回公网URL
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @returns 公网可访问的图片URL
 */
export async function uploadImageToSuperbed(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: filename,
      contentType: 'image/jpeg'
    });
    
    const response = await axios.post(
      `https://api.superbed.cn/upload?token=${SUPERBED_TOKEN}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    const result = response.data;
    
    if (result.err !== 0 || !result.url) {
      throw new Error(`superbed上传失败：${result.msg || '未获取到图片链接'}`);
    }

    return result.url;
    
  } catch (error) {
    console.error('superbed上传错误:', error);
    throw new Error(`图片上传失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 从Base64上传图片到superbed
 * @param base64Data Base64图片数据 (可包含data:前缀)
 * @param filename 文件名
 * @returns 公网可访问的图片URL
 */
export async function uploadBase64ToSuperbed(
  base64Data: string,
  filename: string
): Promise<string> {
  // 移除data:image/jpeg;base64,前缀
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(base64String, 'base64');
  
  return await uploadImageToSuperbed(imageBuffer, filename);
}
