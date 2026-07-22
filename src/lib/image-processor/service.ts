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

// ==================== MediaKit 服务（兼容旧 Volcengine 函数名） ====================

/**
 * 画质增强（MediaKit enhance-image）
 * 保留 enhanceWithVolcengine 函数名以兼容 worker / handler 调用方。
 * 旧参数 resolutionBoundary/enableHdr/... 已废弃，不再发给上游。
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
  void resolutionBoundary;
  void enableHdr;
  void enableWb;
  void resultFormat;
  void jpgQuality;
  void skipDbSave;
  void volcengineConfig;

  const userConfig = await getUserConfig(userId);
  const publicUrl = await toPublicImageUrl(
    imageInput,
    `mediakit-enhance-input-${Date.now()}.jpg`,
    imagehostingConfig?.superbedToken || userConfig.imagehosting?.superbedToken
  );

  // 保留小数倍数（官方支持 2 位小数），按输入尺寸自动选择 standard/professional/max
  const result = await enhanceImageWithMediaKit(publicUrl, Number(mediaKitMultiple) || 1);
  const downloaded = await downloadMediaKitImage(result.image_url);
  return {
    id: `mediakit-enhance-${Date.now()}`,
    imageData: downloaded.dataUrl,
    imageSize: result.image_size || downloaded.imageSize,
    metadata: {
      provider: 'mediakit',
      tool: 'enhance-image',
      toolVersion: result.tool_version,
      multiple: result.multiple,
      imageWidth: result.image_width,
      imageHeight: result.image_height,
    },
  };
}

/**
 * 智能扩图（MediaKit expand-image-canvas）
 * 保留 outpaintWithVolcengine 函数名以兼容 worker / handler 调用方。
 * prompt / maxHeight / maxWidth / volcengineConfig 已废弃，不再发给上游。
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
  void prompt;
  void maxHeight;
  void maxWidth;
  void volcengineConfig;

  const userConfig = await getUserConfig(userId);
  const publicUrl = await toPublicImageUrl(
    imageInput,
    `mediakit-expand-input-${Date.now()}.jpg`,
    imagehostingConfig?.superbedToken || userConfig.imagehosting?.superbedToken
  );

  // 扩前尺寸：用于下载后校验是否真的扩开
  let inputWidth = 0;
  let inputHeight = 0;
  try {
    const sharp = (await import('sharp')).default;
    const probeTarget = imageInput.startsWith('data:') ? imageInput : publicUrl;
    if (probeTarget.startsWith('data:')) {
      const base64 = probeTarget.split(',')[1] || '';
      const meta = await sharp(Buffer.from(base64, 'base64')).metadata();
      inputWidth = meta.width || 0;
      inputHeight = meta.height || 0;
    } else if (/^https?:\/\//i.test(probeTarget)) {
      const resp = await fetch(probeTarget, { signal: AbortSignal.timeout(60_000) });
      if (resp.ok) {
        const meta = await sharp(Buffer.from(await resp.arrayBuffer())).metadata();
        inputWidth = meta.width || 0;
        inputHeight = meta.height || 0;
      }
    }
  } catch {
    // 输入尺寸探测失败时仍继续调用扩图
  }

  const result = await expandImageCanvasWithMediaKit(publicUrl, {
    top,
    bottom,
    left,
    right,
  });
  const downloaded = await downloadMediaKitImage(result.image_url);
  // 元数据宽高优先用下载后的真实像素；API 自报尺寸仅作对照，避免“声称扩大、实图未变”。
  const imageWidth = downloaded.width || result.image_width;
  const imageHeight = downloaded.height || result.image_height;
  console.log(
    `[MediaKit] expand downloaded actual=${downloaded.width || '?'}x${downloaded.height || '?'}` +
      ` claimed=${result.image_width || '?'}x${result.image_height || '?'}` +
      ` input=${inputWidth || '?'}x${inputHeight || '?'}` +
      ` bytes=${downloaded.imageSize}`
  );

  const expectWider = left + right > 0.001;
  const expectTaller = top + bottom > 0.001;
  if (inputWidth > 0 && inputHeight > 0 && downloaded.width && downloaded.height) {
    const needWider = expectWider && downloaded.width <= inputWidth * 1.01;
    const needTaller = expectTaller && downloaded.height <= inputHeight * 1.01;
    if (needWider || needTaller) {
      throw new Error(
        `MEDIAKIT_EXPAND_NO_EFFECT: 输入 ${inputWidth}x${inputHeight}，下载结果 ${downloaded.width}x${downloaded.height}` +
          `（请求 L${left} R${right} T${top} B${bottom}` +
          (result.image_width || result.image_height
            ? `，API 声称 ${result.image_width}x${result.image_height}`
            : '') +
          '）。扩图未改变画布尺寸。'
      );
    }
  }

  return {
    id: `mediakit-expand-${Date.now()}`,
    imageData: downloaded.dataUrl,
    imageSize: result.image_size || downloaded.imageSize,
    metadata: {
      provider: 'mediakit',
      tool: 'expand-image-canvas',
      expandRatio: {
        top: result.expand_top,
        bottom: result.expand_bottom,
        left: result.expand_left,
        right: result.expand_right,
      },
      imageWidth,
      imageHeight,
      claimedImageWidth: result.image_width,
      claimedImageHeight: result.image_height,
      inputWidth: inputWidth || undefined,
      inputHeight: inputHeight || undefined,
      publicInputUrlHost: (() => {
        try {
          return new URL(publicUrl).host;
        } catch {
          return 'unknown';
        }
      })(),
    },
  };
}
