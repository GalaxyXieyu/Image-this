/**
 * 统一的图片处理服务
 * 所有 Provider 的调用方法都在这里
 */

import { ImageProcessorFactory } from './factory';
import { ImageProvider, ProcessResult } from './types';
import { getUserConfig } from '@/lib/user-config';

/**
 * 初始化指定的 Provider
 */
async function initializeProvider(userId: string, provider: ImageProvider) {
  const userConfig = await getUserConfig(userId);
  
  console.log(`[initializeProvider] 初始化 ${provider}，图床配置:`, userConfig.imagehosting ? '已配置' : '未配置');
  
  const providerConfig = {
    volcengine: {
      enabled: provider === ImageProvider.VOLCENGINE && !!userConfig.volcengine,
      accessKey: userConfig.volcengine?.accessKey || '',
      secretKey: userConfig.volcengine?.secretKey || ''
    },
    gpt: {
      enabled: provider === ImageProvider.GPT && !!userConfig.gpt,
      apiUrl: userConfig.gpt?.apiUrl || 'https://yunwu.ai',
      apiKey: userConfig.gpt?.apiKey || ''
    },
    gemini: {
      enabled: provider === ImageProvider.GEMINI && !!userConfig.gemini,
      apiKey: userConfig.gemini?.apiKey || '',
      baseUrl: userConfig.gemini?.baseUrl || 'https://yunwu.ai'
    },
    qwen: {
      enabled: provider === ImageProvider.QWEN && !!userConfig.gpt, // Qwen 使用 GPT 配置
      apiKey: userConfig.gpt?.apiKey || ''
    },
    jimeng: {
      enabled: provider === ImageProvider.JIMENG && !!userConfig.volcengine,
      accessKey: userConfig.volcengine?.accessKey || '',
      secretKey: userConfig.volcengine?.secretKey || '',
      // 添加图床配置（Jimeng 需要上传图片到图床）
      imagehostingConfig: userConfig.imagehosting
    }
  };
  
  ImageProcessorFactory.initialize(providerConfig);
  return ImageProcessorFactory.getProcessor(provider);
}

// ==================== Gemini 服务 ====================

/**
 * Gemini 背景替换
 */
export async function processWithGemini(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string
): Promise<string | null> {
  const processor = await initializeProvider(userId, ImageProvider.GEMINI);
  
  const result = await processor.backgroundReplace!(userId, {
    originalImageUrl,
    referenceImageUrl,
    prompt
  });
  
  return result.imageData;
}

// ==================== GPT 服务 ====================

/**
 * GPT 背景替换
 */
export async function processWithGPT(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string
): Promise<ProcessResult> {
  const processor = await initializeProvider(userId, ImageProvider.GPT);
  
  return await processor.backgroundReplace!(userId, {
    originalImageUrl,
    referenceImageUrl,
    prompt
  });
}

// ==================== Jimeng 服务 ====================

/**
 * 即梦背景替换
 */
export async function processWithJimeng(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string
): Promise<ProcessResult> {
  const userConfig = await getUserConfig(userId);
  const processor = await initializeProvider(userId, ImageProvider.JIMENG);
  
  return await processor.backgroundReplace!(userId, {
    originalImageUrl,
    referenceImageUrl,
    prompt,
    superbedToken: userConfig.imagehosting?.superbedToken
  });
}

// ==================== Qwen 服务 ====================

/**
 * 通义千问扩图
 */
export async function outpaintWithQwen(
  userId: string,
  imageUrl: string,
  xScale = 2.0,
  yScale = 2.0,
  bestQuality = false,
  limitImageSize = true
): Promise<ProcessResult> {
  const processor = await initializeProvider(userId, ImageProvider.QWEN);
  
  return await processor.outpaint!(userId, imageUrl, {
    xScale,
    yScale,
    bestQuality,
    limitImageSize
  });
}

// ==================== Volcengine 服务 ====================

/**
 * 火山引擎画质增强
 */
export async function enhanceWithVolcengine(
  userId: string,
  imageInput: string,
  resolutionBoundary = '720p',
  enableHdr = false,
  enableWb = false,
  resultFormat = 1,
  jpgQuality = 95,
  skipDbSave = false,
  volcengineConfig?: { accessKey: string; secretKey: string },
  imagehostingConfig?: { superbedToken: string }
): Promise<ProcessResult> {
  // 如果传入了配置，直接使用
  if (volcengineConfig) {
    ImageProcessorFactory.initialize({
      volcengine: {
        enabled: true,
        accessKey: volcengineConfig.accessKey,
        secretKey: volcengineConfig.secretKey
      },
      gpt: { enabled: false, apiUrl: '', apiKey: '' },
      gemini: { enabled: false, apiKey: '', baseUrl: '' },
      qwen: { enabled: false, apiKey: '' },
      jimeng: { enabled: false, accessKey: '', secretKey: '' }
    });
  } else {
    await initializeProvider(userId, ImageProvider.VOLCENGINE);
  }
  
  const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);
  
  return await processor.enhance!(userId, imageInput, {
    resolutionBoundary,
    enableHdr,
    enableWb,
    resultFormat,
    jpgQuality,
    skipDbSave,
    superbedToken: imagehostingConfig?.superbedToken
  });
}

/**
 * 火山引擎智能扩图
 */
export async function outpaintWithVolcengine(
  userId: string,
  imageInput: string,
  prompt = '扩展图像，保持风格一致',
  top = 0.1,
  bottom = 0.1,
  left = 0.1,
  right = 0.1,
  maxHeight = 1920,
  maxWidth = 1920,
  volcengineConfig?: { accessKey: string; secretKey: string },
  imagehostingConfig?: { superbedToken: string }
): Promise<ProcessResult> {
  // 如果传入了配置，直接使用
  if (volcengineConfig) {
    ImageProcessorFactory.initialize({
      volcengine: {
        enabled: true,
        accessKey: volcengineConfig.accessKey,
        secretKey: volcengineConfig.secretKey
      },
      gpt: { enabled: false, apiUrl: '', apiKey: '' },
      gemini: { enabled: false, apiKey: '', baseUrl: '' },
      qwen: { enabled: false, apiKey: '' },
      jimeng: { enabled: false, accessKey: '', secretKey: '' }
    });
  } else {
    await initializeProvider(userId, ImageProvider.VOLCENGINE);
  }
  
  const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);
  
  return await processor.outpaint!(userId, imageInput, {
    prompt,
    top,
    bottom,
    left,
    right,
    maxHeight,
    maxWidth,
    superbedToken: imagehostingConfig?.superbedToken
  });
}
