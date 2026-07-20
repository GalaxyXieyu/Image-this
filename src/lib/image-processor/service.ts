/**
 * 统一的图片处理服务
 * 所有 Provider 的调用方法都在这里
 */

import { ImageProcessorFactory } from './factory';
import { ImageProvider, ProcessResult } from './types';
import { getUserConfig } from '@/lib/user-config';
import {
  downloadMediaKitImage,
  enhanceImageWithMediaKit,
  expandImageCanvasWithMediaKit,
  generateProductSceneWithMediaKit,
  toPublicImageUrl,
} from '@/lib/media-kit';

type ProviderOverrides = {
  gpt?: { modelName?: string };
  gemini?: { modelName?: string };
  jimeng?: { modelName?: string };
};

/**
 * 初始化指定的 Provider
 */
async function initializeProvider(userId: string, provider: ImageProvider, overrides?: ProviderOverrides) {
  const userConfig = await getUserConfig(userId);

  console.log(`[initializeProvider] 初始化 ${provider}，图床配置:`, userConfig.imagehosting ? '已配置' : '未配置');

  // 检查配置是否存在
  // 注意：即梦(JIMENG)不在此处强制要求火山引擎 AK/SK，
  // 其 Ark-only 与 Legacy 两种模式的校验在下方 JIMENG 专属分支处理；
  // 否则只配 ARK_API_KEY 的 Ark 模式会被这里误拦。
  if (provider === ImageProvider.VOLCENGINE) {
    if (!userConfig.volcengine?.accessKey || !userConfig.volcengine?.secretKey) {
      throw new Error('火山引擎配置未设置，请在设置页面配置火山引擎 AccessKey 和 SecretKey');
    }
  }

  if (provider === ImageProvider.GPT || provider === ImageProvider.QWEN) {
    if (!userConfig.gpt?.apiKey) {
      throw new Error('GPT 配置未设置，请在设置页面配置 GPT API Key');
    }
  }

  if (provider === ImageProvider.GEMINI) {
    if (!userConfig.gemini?.apiKey) {
      throw new Error('Gemini 配置未设置，请在设置页面配置 Gemini API Key');
    }
  }

  if (provider === ImageProvider.JIMENG) {
    const hasArk = !!userConfig.jimeng?.arkApiKey;
    const hasLegacy = !!(userConfig.jimeng?.accessKey && userConfig.jimeng?.secretKey);
    if (!hasArk && !hasLegacy) {
      throw new Error('即梦配置未设置，请在设置页面配置 ARK API Key 或火山引擎 AccessKey/SecretKey');
    }
    if (hasLegacy && !userConfig.imagehosting?.superbedToken) {
      throw new Error('图床配置未设置，Legacy 模式需要在设置页面配置 Superbed Token');
    }
  }

  const providerConfig = {
    volcengine: {
      enabled: provider === ImageProvider.VOLCENGINE && !!userConfig.volcengine,
      accessKey: userConfig.volcengine?.accessKey || '',
      secretKey: userConfig.volcengine?.secretKey || ''
    },
    gpt: {
      enabled: provider === ImageProvider.GPT && !!userConfig.gpt,
      apiUrl: userConfig.gpt?.apiUrl || 'https://toapis.com',
      apiKey: userConfig.gpt?.apiKey || '',
      modelName: overrides?.gpt?.modelName ?? userConfig.gpt?.modelName ?? undefined
    },
    gemini: {
      enabled: provider === ImageProvider.GEMINI && !!userConfig.gemini,
      apiKey: userConfig.gemini?.apiKey || '',
      baseUrl: userConfig.gemini?.baseUrl || 'https://toapis.com',
      modelName: overrides?.gemini?.modelName ?? userConfig.gemini?.modelName ?? 'gemini-3.1-flash-image-preview'
    },
    qwen: {
      enabled: provider === ImageProvider.QWEN && !!userConfig.gpt, // Qwen 使用 GPT 配置
      apiKey: userConfig.gpt?.apiKey || ''
    },
    jimeng: {
      enabled: provider === ImageProvider.JIMENG && !!userConfig.jimeng,
      arkApiKey: userConfig.jimeng?.arkApiKey || '',
      baseUrl: userConfig.jimeng?.baseUrl || undefined,
      modelName: overrides?.jimeng?.modelName ?? userConfig.jimeng?.modelName ?? undefined,
      accessKey: userConfig.jimeng?.accessKey || '',
      secretKey: userConfig.jimeng?.secretKey || '',
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
  userId: string,
  modelName?: string
): Promise<string | null> {
  const processor = await initializeProvider(userId, ImageProvider.GEMINI, modelName ? { gemini: { modelName } } : undefined);

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
  userId: string,
  modelName?: string
): Promise<ProcessResult> {
  const processor = await initializeProvider(userId, ImageProvider.GPT, modelName ? { gpt: { modelName } } : undefined);

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
  userId: string,
  modelName?: string
): Promise<ProcessResult> {
  const userConfig = await getUserConfig(userId);
  const processor = await initializeProvider(userId, ImageProvider.JIMENG, modelName ? { jimeng: { modelName } } : undefined);

  return await processor.backgroundReplace!(userId, {
    originalImageUrl,
    referenceImageUrl,
    prompt,
    superbedToken: userConfig.imagehosting?.superbedToken
  });
}

export async function processWithMediaKit(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  superbedToken?: string,
  batchCount = 1
): Promise<ProcessResult> {
  const userConfig = await getUserConfig(userId);
  const resolvedSuperbedToken = superbedToken || userConfig.imagehosting?.superbedToken;
  const publicProductUrl = await toPublicImageUrl(
    originalImageUrl,
    `mediakit-scene-product-${Date.now()}.jpg`,
    resolvedSuperbedToken
  );
  const publicReferenceUrl = referenceImageUrl
    ? await toPublicImageUrl(
        referenceImageUrl,
        `mediakit-scene-reference-${Date.now()}.jpg`,
        resolvedSuperbedToken
      )
    : undefined;
  const results = await generateProductSceneWithMediaKit(
    publicProductUrl,
    prompt,
    publicReferenceUrl,
    batchCount
  );
  const first = results[0];
  if (!first?.image_url) {
    throw new Error('MEDIAKIT_EMPTY_RESULT: 商品场景图接口未返回结果图片');
  }
  const downloaded = await downloadMediaKitImage(first.image_url);
  return {
    id: `mediakit-scene-${Date.now()}`,
    imageData: downloaded.dataUrl,
    imageSize: first.image_size || downloaded.imageSize,
    metadata: {
      provider: 'mediakit',
      tool: 'generate-product-scene-image',
      batchCount,
      referenceImageUrl: Boolean(publicReferenceUrl),
    },
  };
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
  imagehostingConfig?: { superbedToken: string },
  mediaKitMultiple = 1
): Promise<ProcessResult> {
  const userConfig = await getUserConfig(userId);
  const publicUrl = await toPublicImageUrl(
    imageInput,
    `mediakit-enhance-input-${Date.now()}.jpg`,
    imagehostingConfig?.superbedToken || userConfig.imagehosting?.superbedToken
  );
  const result = await enhanceImageWithMediaKit(publicUrl, Math.min(30, Math.max(1, mediaKitMultiple)), 'professional');
  const downloaded = await downloadMediaKitImage(result.image_url);
  return {
    id: `mediakit-enhance-${Date.now()}`,
    imageData: downloaded.dataUrl,
    imageSize: result.image_size || downloaded.imageSize,
    metadata: {
      provider: 'mediakit',
      tool: 'enhance-image',
      toolVersion: 'professional',
      resolutionBoundary,
      enableHdr,
      enableWb,
      resultFormat,
      jpgQuality,
      skipDbSave,
    },
  };
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
  const userConfig = await getUserConfig(userId);
  const publicUrl = await toPublicImageUrl(
    imageInput,
    `mediakit-expand-input-${Date.now()}.jpg`,
    imagehostingConfig?.superbedToken || userConfig.imagehosting?.superbedToken
  );
  const result = await expandImageCanvasWithMediaKit(publicUrl, {
    top,
    bottom,
    left,
    right,
  });
  const downloaded = await downloadMediaKitImage(result.image_url);
  return {
    id: `mediakit-expand-${Date.now()}`,
    imageData: downloaded.dataUrl,
    imageSize: result.image_size || downloaded.imageSize,
    metadata: {
      provider: 'mediakit',
      tool: 'expand-image-canvas',
      prompt,
      top,
      bottom,
      left,
      right,
      maxHeight,
      maxWidth,
    },
  };
}
