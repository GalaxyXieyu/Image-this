/**
 * 图片处理器初始化工具
 */

import { ImageProcessorFactory } from './factory';
import { loadConfigFromEnv } from './config';

let isInitialized = false;

/**
 * 初始化图片处理器工厂（服务端）
 * 使用环境变量配置
 */
export function initializeImageProcessor() {
  if (isInitialized) {
    return;
  }

  const config = loadConfigFromEnv();
  ImageProcessorFactory.initialize(config);
  isInitialized = true;

  console.log('[ImageProcessor] 已初始化，可用提供商:', 
    ImageProcessorFactory.getAvailableProviders().join(', '));
}

/**
 * 确保图片处理器已初始化
 */
export function ensureInitialized() {
  if (!isInitialized) {
    initializeImageProcessor();
  }
}
