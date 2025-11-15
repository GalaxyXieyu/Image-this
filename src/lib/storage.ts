/**
 * 文件存储服务
 * 开发环境使用本地文件系统，生产环境可以切换到 MinIO 或其他对象存储
 */

import {
  uploadImageToLocal,
  uploadBase64ImageToLocal,
  deleteImageFromLocal,
  generateAndUploadThumbnail as generateLocalThumbnail,
  ensureUploadDirExists
} from './local-storage';

// 确保存储可用
export async function ensureBucketExists() {
  return ensureUploadDirExists();
}

// 上传图片
export async function uploadImageToMinio(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  return uploadImageToLocal(imageBuffer, filename, contentType);
}

// 从base64上传图片
export async function uploadBase64ImageToMinio(
  base64Data: string,
  filename: string
): Promise<string> {
  return uploadBase64ImageToLocal(base64Data, filename);
}

// 删除图片
export async function deleteImageFromMinio(objectName: string): Promise<void> {
  return deleteImageFromLocal(objectName);
}

// 生成缩略图并上传
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string
): Promise<string> {
  return generateLocalThumbnail(originalImageBuffer, filename);
}
