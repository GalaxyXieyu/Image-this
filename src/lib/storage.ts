/**
 * 文件存储服务
 * 使用本地文件系统存储图片到 public/uploads/ 目录
 * 生产环境可以扩展支持云存储服务
 */

import {
  uploadImageToLocal,
  uploadBase64ImageToLocal,
  deleteImageFromLocal,
  generateAndUploadThumbnail as generateLocalThumbnail,
  ensureUploadDirExists
} from './local-storage';

// 确保存储目录可用
export async function ensureBucketExists() {
  return ensureUploadDirExists();
}

// 上传图片
export async function uploadImage(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  return uploadImageToLocal(imageBuffer, filename, contentType);
}

// 从base64上传图片
export async function uploadBase64Image(
  base64Data: string,
  filename: string
): Promise<string> {
  return uploadBase64ImageToLocal(base64Data, filename);
}

// 删除图片
export async function deleteImage(objectName: string): Promise<void> {
  return deleteImageFromLocal(objectName);
}

// 已移除 MinIO 相关代码，现在使用本地存储

// 生成缩略图并上传
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string
): Promise<string> {
  return generateLocalThumbnail(originalImageBuffer, filename);
}
