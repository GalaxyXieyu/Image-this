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
  checkImageExists as checkLocalImageExists
} from './local-storage';
import { getUserConfig } from './user-config';

// 确保存储目录可用
export async function ensureBucketExists(userId?: string) {
  if (userId) {
    // 获取用户配置的保存路径
    try {
      const userConfig = await getUserConfig(userId);
      return ensureUploadDirExists(userConfig.localStorage?.savePath);
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
      return ensureUploadDirExists();
    }
  }
  return ensureUploadDirExists();
}

// 上传图片
export async function uploadImage(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg',
  userId?: string
): Promise<string> {
  let customPath: string | undefined;
  
  if (userId) {
    try {
      const userConfig = await getUserConfig(userId);
      customPath = userConfig.localStorage?.savePath;
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
    }
  }
  
  return uploadImageToLocal(imageBuffer, filename, contentType, customPath);
}

// 从base64上传图片
export async function uploadBase64Image(
  base64Data: string,
  filename: string,
  userId?: string
): Promise<string> {
  let customPath: string | undefined;
  
  if (userId) {
    try {
      const userConfig = await getUserConfig(userId);
      customPath = userConfig.localStorage?.savePath;
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
    }
  }
  
  return uploadBase64ImageToLocal(base64Data, filename, customPath);
}

// 删除图片
export async function deleteImage(objectName: string, userId?: string): Promise<void> {
  let customPath: string | undefined;
  
  if (userId) {
    try {
      const userConfig = await getUserConfig(userId);
      customPath = userConfig.localStorage?.savePath;
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
    }
  }
  
  return deleteImageFromLocal(objectName, customPath);
}

// 生成缩略图并上传
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string,
  userId?: string
): Promise<string> {
  let customPath: string | undefined;
  
  if (userId) {
    try {
      const userConfig = await getUserConfig(userId);
      customPath = userConfig.localStorage?.savePath;
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
    }
  }
  
  return generateLocalThumbnail(originalImageBuffer, filename, customPath);
}

// 检查图片文件是否存在
export async function checkImageExists(
  urlPath: string,
  userId?: string
): Promise<boolean> {
  let customPath: string | undefined;
  
  if (userId) {
    try {
      const userConfig = await getUserConfig(userId);
      customPath = userConfig.localStorage?.savePath;
    } catch (error) {
      console.error('获取用户配置失败，使用默认路径:', error);
    }
  }
  
  return checkLocalImageExists(urlPath, customPath);
}
