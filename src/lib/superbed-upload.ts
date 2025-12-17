import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

/**
 * 上传图片到superbed图床并返回公网URL（带重试机制）
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @param retries 重试次数
 * @param superbedToken 可选的 Superbed Token，如果不提供则使用默认值
 * @returns 公网可访问的图片URL
 */
export async function uploadImageToSuperbed(
  imageBuffer: Buffer,
  filename: string,
  retries = 3,
  superbedToken?: string
): Promise<string> {
  const token = superbedToken || process.env.SUPERBED_TOKEN;
  
  if (!token) {
    throw new Error('SUPERBED_NOT_CONFIGURED: 请先在设置页面配置 Superbed Token，或在环境变量中设置 SUPERBED_TOKEN');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最多5秒
        console.log(`[Superbed] 第 ${attempt + 1} 次尝试上传，等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`[Superbed] 使用 Token: ${token.substring(0, 10)}...`);
      
      // 根据文件扩展名确定 Content-Type
      const ext = filename.toLowerCase().split('.').pop();
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      console.log(`[Superbed] 使用 Content-Type: ${contentType}`);
      
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: filename,
        contentType: contentType
      });
      
      const response = await axios.post(
        `https://api.superbed.cn/upload?token=${token}`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000, // 30秒超时
          maxContentLength: 50 * 1024 * 1024, // 50MB
          maxBodyLength: 50 * 1024 * 1024
        }
      );

      const result = response.data;
      
      if (result.err !== 0 || !result.url) {
        throw new Error(`superbed上传失败：${result.msg || '未获取到图片链接'}`);
      }

      console.log(`[Superbed] 上传成功: ${filename}`);
      return result.url;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 判断是否是可重试的错误
      const isRetryable = 
        axios.isAxiosError(error) && (
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.response?.status === 429 || // 请求过多
          error.response?.status === 503 || // 服务不可用
          error.response?.status === 504    // 网关超时
        );
      
      if (!isRetryable || attempt === retries) {
        console.error(`[Superbed] 上传失败 (尝试 ${attempt + 1}/${retries + 1}):`, error);
        break;
      }
      
      console.warn(`[Superbed] 上传失败 (尝试 ${attempt + 1}/${retries + 1})，准备重试...`);
    }
  }
  
  throw new Error(`图片上传失败: ${lastError?.message || 'Unknown error'}`);
}

/**
 * 从Base64上传图片到superbed
 * @param base64Data Base64图片数据 (可包含data:前缀)
 * @param filename 文件名
 * @param superbedToken 可选的 Superbed Token
 * @returns 公网可访问的图片URL
 */
export async function uploadBase64ToSuperbed(
  base64Data: string,
  filename: string,
  superbedToken?: string
): Promise<string> {
  // 移除data:image/jpeg;base64,前缀
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // 验证 base64 字符串
  if (!base64String || base64String.length < 100) {
    throw new Error(`无效的 base64 数据: 长度=${base64String.length}`);
  }
  
  // 强制使用 .png 格式
  const pngFilename = filename.replace(/\.(jpg|jpeg|webp)$/i, '.png');
  
  // 使用 Sharp 真正转换为 PNG 格式
  const originalBuffer = Buffer.from(base64String, 'base64');
  const pngBuffer = await sharp(originalBuffer)
    .png()
    .toBuffer();
  
  console.log(`[Superbed] 准备上传: ${pngFilename}, 原始: ${(originalBuffer.length / 1024).toFixed(0)}KB -> PNG: ${(pngBuffer.length / 1024).toFixed(0)}KB`);
  
  return await uploadImageToSuperbed(pngBuffer, pngFilename, 3, superbedToken);
}
