/**
 * Background Replace Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processBackgroundRemoval.
 * Supports MediaKit, GPT, Gemini, and Jimeng providers with model fallback.
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateBackgroundReplaceParams } from '@/lib/workbench/input-validation';
import type { BackgroundReplaceParams } from '@/types/workbench';
import type { BackgroundReplaceResult } from '@/types/workbench/results';
import fs from 'fs/promises';

// ---------------------------------------------------------------------------
// Asset helpers (mirroring worker globals)
// ---------------------------------------------------------------------------

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset?.filePath) return null;
  const buffer = await fs.readFile(asset.filePath);
  const mimeType = asset.mimeType || 'application/octet-stream';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function getAssetClientUrl(asset?: TaskAssetRef): string {
  return asset?.clientUrl || '';
}

async function persistRecordUrl(
  source: string | undefined,
  filename: string,
  userId: string
): Promise<string> {
  if (!source) return '';
  if (source.startsWith('data:')) {
    return uploadBase64Image(source, filename, userId);
  }
  return source;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const BACKGROUND_REPLACE_PROMPT =
  '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

const backgroundReplaceHandler = {
  name: 'background_replace',
  workflowType: 'background_replace' as const,

  validateInput(raw: unknown): BackgroundReplaceParams {
    return validateBackgroundReplaceParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    _input: BackgroundReplaceParams,
    rawInput: Record<string, unknown>
  ): Promise<BackgroundReplaceResult> {
    const { task } = ctx;

    // Extract assets from raw input (not part of BackgroundReplaceParams)
    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const referenceAsset = rawInput.referenceAsset as TaskAssetRef | undefined;

    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);
    const referenceImageUrl =
      (await readAssetAsDataUrl(referenceAsset)) || (rawInput.referenceImageUrl as string);

    // Extract config fields
    const customPrompt = rawInput.customPrompt as string | undefined;
    const aiModel = (rawInput.aiModel as string) || 'mediakit';
    const explicitProvider = rawInput.provider as string | undefined;
    const explicitModelName = rawInput.modelName as string | undefined;
    const fallbackModels = rawInput.fallbackModels as string[] | undefined;

    // Resolve provider
    const provider =
      explicitProvider ||
      (aiModel.startsWith('gpt')
        ? 'gpt'
        : aiModel.startsWith('gemini')
          ? 'gemini'
          : aiModel.startsWith('jimeng') || aiModel.startsWith('seedream')
            ? 'jimeng'
            : aiModel);

    const isProviderAlias = ['mediakit', 'gemini', 'gpt', 'jimeng', 'seedream'].includes(aiModel);
    const modelName = explicitModelName || (isProviderAlias ? undefined : aiModel);

    // Persist original URLs for record
    const originalImageUrlForRecord =
      getAssetClientUrl(inputAsset) ||
      (await persistRecordUrl(
        rawInput.imageUrl as string,
        `input-bg-replace-${task.id}.jpg`,
        task.userId
      ));
    const referenceImageUrlForRecord =
      getAssetClientUrl(referenceAsset) ||
      (await persistRecordUrl(
        rawInput.referenceImageUrl as string,
        `reference-bg-replace-${task.id}.jpg`,
        task.userId
      ));

    const prompt = customPrompt || BACKGROUND_REPLACE_PROMPT;
    const referenceImages = [imageUrl];
    if (referenceImageUrl) referenceImages.push(referenceImageUrl);

    let lastError: Error | undefined;
    const attemptModels = [modelName || provider, ...(fallbackModels || [])].filter(Boolean) as string[];

    for (const attemptModel of attemptModels) {
      try {
        await ctx.updateProgress(`使用 ${attemptModel} 生成图像中...`, 30, 1);

        const result = await processWithProvider(
          provider,
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId,
          attemptModel,
          originalImageUrlForRecord,
          referenceImageUrlForRecord
        );

        await ctx.updateProgress(`图像生成完成（${attemptModel}）`, 100, 1);

        return {
          processedImageId: result.processedImageId,
          processedImageUrl: result.processedImageUrl,
          prompt,
          usedModel: attemptModel,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[背景替换] 模型 ${attemptModel} 处理失败:`, lastError.message);
        await ctx.updateProgress(`${attemptModel} 生成失败，尝试兜底...`, 0, 0);
      }
    }

    if (lastError) {
      console.error(`[背景替换] 所有模型处理失败`);
      await ctx.updateProgress('图像生成失败', 0, 0);
      throw lastError;
    }

    throw new Error('背景替换未返回结果');
  },

  normalizeResult(result: BackgroundReplaceResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      prompt: result.prompt ?? null,
      usedModel: result.usedModel ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Provider dispatch
// ---------------------------------------------------------------------------

async function processWithProvider(
  provider: string,
  imageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  modelName: string,
  originalImageUrlForRecord: string,
  referenceImageUrlForRecord: string
): Promise<{ processedImageId: string; processedImageUrl: string }> {
  if (provider === 'mediakit') {
    return processWithMediaKitHandler(
      imageUrl,
      referenceImageUrl,
      prompt,
      userId,
      originalImageUrlForRecord,
      referenceImageUrlForRecord
    );
  }

  if (provider === 'gpt') {
    return processWithGPT(
      imageUrl,
      referenceImageUrl,
      prompt,
      userId,
      modelName,
      originalImageUrlForRecord,
      referenceImageUrlForRecord
    );
  }

  if (provider === 'gemini') {
    return processWithGemini(
      imageUrl,
      referenceImageUrl,
      prompt,
      userId,
      modelName,
      originalImageUrlForRecord,
      referenceImageUrlForRecord
    );
  }

  if (provider === 'jimeng') {
    return processWithJimeng(
      imageUrl,
      referenceImageUrl,
      prompt,
      userId,
      modelName,
      originalImageUrlForRecord,
      referenceImageUrlForRecord
    );
  }

  throw new Error(`不支持的 AI 模型: ${provider}，请使用 mediakit、gpt、gemini 或 jimeng`);
}

async function processWithMediaKitHandler(
  imageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  originalImageUrlForRecord: string,
  referenceImageUrlForRecord: string
): Promise<{ processedImageId: string; processedImageUrl: string }> {
  const { processWithMediaKit: mediaKitService } = await import('@/lib/image-processor/service');
  const result = await mediaKitService(imageUrl, referenceImageUrl, prompt, userId);
  const filename = `mediakit-bg-replace-${Date.now()}.jpg`;
  const processedUrl = await uploadBase64Image(result.imageData, filename, userId);
  const processedImage = await prisma.processedImage.create({
    data: {
      filename,
      originalUrl: originalImageUrlForRecord,
      processedUrl,
      processType: 'BACKGROUND_REMOVAL',
      status: 'COMPLETED',
      fileSize: result.imageSize,
      metadata: JSON.stringify({
        provider: 'mediakit',
        tool: 'generate-product-scene-image',
        prompt,
        referenceImageUrl: referenceImageUrlForRecord,
        processingCompletedAt: new Date().toISOString(),
      }),
      userId,
    },
  });
  return { processedImageId: processedImage.id, processedImageUrl: processedUrl };
}

// ---------------------------------------------------------------------------
// GPT
// ---------------------------------------------------------------------------

async function processWithGPT(
  imageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  modelName: string | undefined,
  originalImageUrlForRecord: string,
  referenceImageUrlForRecord: string
): Promise<{ processedImageId: string; processedImageUrl: string }> {
  console.log('[Worker] 使用 GPT 模型');
  const { processWithGPT: gptService } = await import('@/lib/image-processor/service');

  const gptResult = await gptService(imageUrl, referenceImageUrl, prompt, userId, modelName);

  const gptFilename = `gpt-bg-replace-${Date.now()}.jpg`;
  const processedUrl = await uploadBase64Image(
    gptResult.imageData,
    gptFilename,
    userId
  );

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: gptFilename,
      originalUrl: originalImageUrlForRecord,
      processedUrl,
      processType: 'BACKGROUND_REMOVAL',
      status: 'COMPLETED',
      fileSize: gptResult.imageSize,
      metadata: JSON.stringify({
        provider: 'gpt',
        prompt,
        referenceImageUrl: referenceImageUrlForRecord,
        processingCompletedAt: new Date().toISOString(),
      }),
      userId,
    },
  });

  console.log('[Worker] GPT 处理成功，已保存到数据库');
  return { processedImageId: processedImage.id, processedImageUrl: processedUrl };
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

async function processWithGemini(
  imageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  modelName: string | undefined,
  originalImageUrlForRecord: string,
  referenceImageUrlForRecord: string
): Promise<{ processedImageId: string; processedImageUrl: string }> {
  console.log(`[Worker] 使用 Gemini 模型: ${modelName}`);
  const { processWithGemini: geminiService } = await import('@/lib/image-processor/service');

  const resultImageUrl = await geminiService(imageUrl, referenceImageUrl, prompt, userId, modelName);

  const geminiFilename = `gemini-bg-replace-${Date.now()}.jpg`;
  const processedUrl = await uploadBase64Image(
    resultImageUrl || '',
    geminiFilename,
    userId
  );

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: geminiFilename,
      originalUrl: originalImageUrlForRecord,
      processedUrl,
      processType: 'BACKGROUND_REMOVAL',
      status: 'COMPLETED',
      fileSize: resultImageUrl?.length || 0,
      metadata: JSON.stringify({
        provider: 'gemini',
        prompt,
        referenceImageUrl: referenceImageUrlForRecord,
        processingCompletedAt: new Date().toISOString(),
      }),
      userId,
    },
  });

  console.log('[Worker] Gemini 处理成功，已保存到数据库');
  return { processedImageId: processedImage.id, processedImageUrl: processedUrl };
}

// ---------------------------------------------------------------------------
// Jimeng
// ---------------------------------------------------------------------------

async function processWithJimeng(
  imageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string,
  modelName: string | undefined,
  originalImageUrlForRecord: string,
  referenceImageUrlForRecord: string
): Promise<{ processedImageId: string; processedImageUrl: string }> {
  console.log(`[Worker] 使用 Jimeng 模型: ${modelName}`);
  const { processWithJimeng: jimengService } = await import('@/lib/image-processor/service');

  const jimengResult = await jimengService(imageUrl, referenceImageUrl, prompt, userId, modelName);

  const jimengFilename = `jimeng-bg-replace-${Date.now()}.jpg`;
  const processedUrl = await uploadBase64Image(
    jimengResult.imageData,
    jimengFilename,
    userId
  );

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: jimengFilename,
      originalUrl: originalImageUrlForRecord,
      processedUrl,
      processType: 'BACKGROUND_REMOVAL',
      status: 'COMPLETED',
      fileSize: jimengResult.imageSize,
      metadata: JSON.stringify({
        provider: 'jimeng',
        prompt,
        referenceImageUrl: referenceImageUrlForRecord,
        processingCompletedAt: new Date().toISOString(),
      }),
      userId,
    },
  });

  console.log('[Worker] Jimeng 处理成功，已保存到数据库');
  return { processedImageId: processedImage.id, processedImageUrl: processedUrl };
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(backgroundReplaceHandler);
