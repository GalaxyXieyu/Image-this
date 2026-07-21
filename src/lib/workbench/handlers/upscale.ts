/**
 * Upscale Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processImageUpscaling.
 * Uses Volcengine for image enhancement/upscaling.
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateUpscaleParams } from '@/lib/workbench/input-validation';
import type { UpscaleParams } from '@/types/workbench';
import type { UpscaleResult } from '@/types/workbench/results';
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

const upscaleHandler = {
  name: 'upscale',
  workflowType: 'upscale' as const,

  validateInput(raw: unknown): UpscaleParams {
    return validateUpscaleParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    input: UpscaleParams,
    rawInput: Record<string, unknown>
  ): Promise<UpscaleResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);

    const upscaleFactor = input.upscaleFactor;
    const volcengineConfig = rawInput.volcengineConfig as { accessKey: string; secretKey: string } | undefined;
    const imagehostingConfig = rawInput.imagehostingConfig as { superbedToken: string } | undefined;

    const originalImageUrlForRecord =
      getAssetClientUrl(inputAsset) ||
      (await persistRecordUrl(rawInput.imageUrl as string, `input-upscale-${task.id}.jpg`, task.userId));

    await ctx.updateProgress('智能画质增强中...', 50, 1);

    try {
      const { enhanceWithVolcengine } = await import('@/lib/image-processor/service');

      const result = await enhanceWithVolcengine(
        task.userId,
        imageUrl,
        '720p',
        false,
        false,
        1,
        95,
        false, // skipDbSave
        volcengineConfig,
        imagehostingConfig,
        Number(upscaleFactor) || 1
      );

      const processedUrl = await uploadBase64Image(
        result.imageData,
        `enhance-${Date.now()}.jpg`,
        task.userId
      );

      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `enhance-${Date.now()}.jpg`,
          originalUrl: originalImageUrlForRecord,
          processedUrl,
          processType: 'IMAGE_UPSCALING',
          status: 'COMPLETED',
          fileSize: result.imageSize,
          metadata: JSON.stringify({
            provider: 'mediakit',
            upscaleFactor,
            processingCompletedAt: new Date().toISOString(),
          }),
          userId: task.userId,
        },
      });

      await ctx.updateProgress('智能画质增强完成', 100, 1);

      return {
        processedImageId: processedImage.id,
        processedImageUrl: processedUrl,
        upscaleFactor,
      };
    } catch (error) {
      console.error(`[智能画质增强] 处理失败:`, error);
      await ctx.updateProgress('智能画质增强失败', 0, 0);
      throw error;
    }
  },

  normalizeResult(result: UpscaleResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      upscaleFactor: result.upscaleFactor ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(upscaleHandler);
