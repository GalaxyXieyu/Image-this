/**
 * 文件存储服务
 * 使用本地文件系统存储图片到 public/uploads/ 目录或用户自定义目录
 * 生产环境可以扩展支持云存储服务
 */

import {
  uploadImageToLocal,
  uploadBase64ImageToLocal,
  deleteImageFromLocal,
  generateAndUploadThumbnail as generateLocalThumbnail,
  ensureUploadDirExists,
  checkImageExists as checkLocalImageExists,
  saveInputAssetToLocal,
  type StoredInputAssetRef
} from './local-storage';
import { getUserConfig } from './user-config';

async function resolveCustomStoragePath(userId?: string): Promise<string | undefined> {
  if (!userId) {
    return undefined;
  }

  try {
    const userConfig = await getUserConfig(userId);
    return userConfig.localStorage?.savePath;
  } catch (error) {
    console.error('获取用户配置失败，使用默认路径:', error);
    return undefined;
  }
}

// 确保存储目录可用
export async function ensureBucketExists(userId?: string) {
  const customPath = await resolveCustomStoragePath(userId);
  return ensureUploadDirExists(customPath);
}

// 上传图片
export async function uploadImage(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg',
  userId?: string
): Promise<string> {
  const customPath = await resolveCustomStoragePath(userId);
  return uploadImageToLocal(imageBuffer, filename, contentType, customPath);
}

// 从base64上传图片
export async function uploadBase64Image(
  base64Data: string,
  filename: string,
  userId?: string
): Promise<string> {
  const customPath = await resolveCustomStoragePath(userId);
  return uploadBase64ImageToLocal(base64Data, filename, customPath);
}

/**
 * 将可能是 data URL 的图片引用转为可持久化的轻量引用。
 * 已经是路径或远程 URL 时不重复写入。
 */
export async function persistImageReference(
  source: string,
  filename: string,
  userId?: string
): Promise<string> {
  if (!/^data:/i.test(source.trimStart())) {
    return source;
  }

  return uploadBase64Image(source.trimStart(), filename, userId);
}

// 删除图片
export async function deleteImage(objectName: string, userId?: string): Promise<void> {
  const customPath = await resolveCustomStoragePath(userId);
  return deleteImageFromLocal(objectName, customPath);
}

// 生成缩略图并上传
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string,
  userId?: string
): Promise<string> {
  const customPath = await resolveCustomStoragePath(userId);
  return generateLocalThumbnail(originalImageBuffer, filename, customPath);
}

// 检查图片文件是否存在
export async function checkImageExists(
  urlPath: string,
  userId?: string
): Promise<boolean> {
  const customPath = await resolveCustomStoragePath(userId);
  return checkLocalImageExists(urlPath, customPath);
}

export type InputAssetRef = StoredInputAssetRef;

export async function saveInputAsset(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId?: string
): Promise<InputAssetRef> {
  const customPath = await resolveCustomStoragePath(userId);
  return saveInputAssetToLocal(fileBuffer, filename, mimeType, customPath);
}
