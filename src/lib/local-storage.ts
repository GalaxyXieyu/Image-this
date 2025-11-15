import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// 确保上传目录存在
export async function ensureUploadDirExists() {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
}

// 上传图片到本地
export async function uploadImageToLocal(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  await ensureUploadDirExists();
  
  const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(UPLOAD_DIR, sanitizedFilename);
  
  await fs.writeFile(filePath, imageBuffer);
  
  // 返回可访问的URL路径
  return `/uploads/${sanitizedFilename}`;
}

// 从base64上传图片
export async function uploadBase64ImageToLocal(
  base64Data: string,
  filename: string
): Promise<string> {
  // 移除data:image/jpeg;base64,前缀
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(base64String, 'base64');
  
  return await uploadImageToLocal(imageBuffer, filename);
}

// 删除本地图片
export async function deleteImageFromLocal(urlPath: string): Promise<void> {
  try {
    // 从URL路径提取文件名
    const filename = path.basename(urlPath);
    const filePath = path.join(UPLOAD_DIR, filename);
    
    await fs.unlink(filePath);
  } catch (error) {
    // 文件可能已经不存在，忽略错误
  }
}

// 生成缩略图并上传（暂时直接使用原图）
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string
): Promise<string> {
  const thumbnailName = `thumbnail-${filename}`;
  return await uploadImageToLocal(originalImageBuffer, thumbnailName);
}
