import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 默认上传目录
const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * 获取上传目录路径
 * @param customPath 用户自定义路径（可选）
 * @returns 实际使用的上传目录路径
 */
export function getUploadDir(customPath?: string | null): string {
  if (customPath) {
    // 支持 ~ 符号表示用户主目录
    if (customPath.startsWith('~')) {
      return path.join(os.homedir(), customPath.slice(1));
    }
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(customPath)) {
      return customPath;
    }
    // 相对路径，相对于项目根目录
    return path.join(process.cwd(), customPath);
  }
  return DEFAULT_UPLOAD_DIR;
}

/**
 * 确保上传目录存在
 * @param customPath 用户自定义路径（可选）
 */
export async function ensureUploadDirExists(customPath?: string | null) {
  const uploadDir = getUploadDir(customPath);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * 上传图片到本地
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @param contentType 内容类型
 * @param customPath 用户自定义路径（可选）
 * @returns 图片URL路径
 */
export async function uploadImageToLocal(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg',
  customPath?: string | null
): Promise<string> {
  const uploadDir = await ensureUploadDirExists(customPath);
  
  const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadDir, sanitizedFilename);
  
  await fs.writeFile(filePath, imageBuffer);
  
  // 如果使用默认路径（public/uploads），返回可访问的URL路径
  // 如果使用自定义路径，返回完整文件路径
  if (!customPath || uploadDir === DEFAULT_UPLOAD_DIR) {
    return `/uploads/${sanitizedFilename}`;
  }
  return filePath;
}

/**
 * 从base64上传图片
 * @param base64Data Base64图片数据
 * @param filename 文件名
 * @param customPath 用户自定义路径（可选）
 * @returns 图片URL路径
 */
export async function uploadBase64ImageToLocal(
  base64Data: string,
  filename: string,
  customPath?: string | null
): Promise<string> {
  // 移除data:image/jpeg;base64,前缀
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(base64String, 'base64');
  
  return await uploadImageToLocal(imageBuffer, filename, 'image/jpeg', customPath);
}

/**
 * 删除本地图片
 * @param urlPath 图片URL路径或完整文件路径
 * @param customPath 用户自定义路径（可选）
 */
export async function deleteImageFromLocal(
  urlPath: string,
  customPath?: string | null
): Promise<void> {
  try {
    let filePath: string;
    
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(urlPath)) {
      filePath = urlPath;
    } else {
      // 从URL路径提取文件名
      const filename = path.basename(urlPath);
      const uploadDir = getUploadDir(customPath);
      filePath = path.join(uploadDir, filename);
    }
    
    await fs.unlink(filePath);
  } catch (error) {
    // 文件可能已经不存在，忽略错误
  }
}

/**
 * 生成缩略图并上传（暂时直接使用原图）
 * @param originalImageBuffer 原图Buffer
 * @param filename 文件名
 * @param customPath 用户自定义路径（可选）
 * @returns 缩略图URL路径
 */
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string,
  customPath?: string | null
): Promise<string> {
  const thumbnailName = `thumbnail-${filename}`;
  return await uploadImageToLocal(originalImageBuffer, thumbnailName, 'image/jpeg', customPath);
}
