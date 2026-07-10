/**
 * Watermark Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processWatermark.
 * Adds text or logo watermark to images.
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { addWatermarkToImage } from '@/lib/watermark';
import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateWatermarkParams } from '@/lib/workbench/input-validation';
import type { WatermarkParams } from '@/types/workbench';
import type { WatermarkResult } from '@/types/workbench/results';
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

const watermarkHandler = {
  name: 'watermark',
  workflowType: 'watermark' as const,

  validateInput(raw: unknown): WatermarkParams {
    return validateWatermarkParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    input: WatermarkParams,
    rawInput: Record<string, unknown>
  ): Promise<WatermarkResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);

    const watermarkLogoAsset = rawInput.watermarkLogoAsset as TaskAssetRef | undefined;
    const watermarkLogoUrl =
      (await readAssetAsDataUrl(watermarkLogoAsset)) || (rawInput.watermarkLogoUrl as string);

    const originalImageUrlForRecord =
      getAssetClientUrl(inputAsset) ||
      (await persistRecordUrl(rawInput.imageUrl as string, `input-watermark-${task.id}.png`, task.userId));
    const watermarkLogoUrlForRecord =
      getAssetClientUrl(watermarkLogoAsset) ||
      (await persistRecordUrl(rawInput.watermarkLogoUrl as string, `logo-watermark-${task.id}.png`, task.userId));

    const watermarkText = input.watermarkText;
    const watermarkOpacity = input.watermarkOpacity;
    const watermarkPosition = input.watermarkPosition;
    const watermarkType = input.watermarkType;
    const outputResolution = input.outputResolution;

    await ctx.updateProgress('水印添加中...', 50, 1);

    console.log('[Worker WATERMARK] 收到水印任务:', {
      taskId: task.id,
      imageUrlPrefix: imageUrl?.substring(0, 30),
      watermarkType,
      hasLogoUrl: !!watermarkLogoUrl,
      logoUrlPrefix: watermarkLogoUrl?.substring(0, 30),
    });

    try {
      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `watermark-${Date.now()}.png`,
          originalUrl: originalImageUrlForRecord,
          processType: 'WATERMARK',
          status: 'PROCESSING',
          userId: task.userId,
          metadata: JSON.stringify({
            watermarkText,
            watermarkOpacity,
            watermarkPosition,
            watermarkType,
            watermarkLogoUrl: watermarkLogoUrlForRecord,
            outputResolution,
          }),
        },
      });

      const watermarkedImageData = await addWatermarkToImage({
        imageUrl,
        watermarkType,
        watermarkLogoUrl,
        watermarkPosition,
        watermarkOpacity,
        watermarkText,
        watermarkScale: input.watermarkScale,
        outputResolution,
      });

      console.log('[Worker WATERMARK] 水印处理完成:', {
        taskId: task.id,
        resultPrefix: watermarkedImageData.substring(0, 30),
      });

      const uploadedUrl = await uploadBase64Image(
        watermarkedImageData,
        `watermark-${processedImage.id}.png`,
        task.userId
      );

      console.log('[Worker WATERMARK] 上传完成:', {
        taskId: task.id,
        uploadedUrl,
      });

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          processedUrl: uploadedUrl,
          status: 'COMPLETED',
          fileSize: Buffer.from(watermarkedImageData.split(',')[1], 'base64').length,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            processingCompletedAt: new Date().toISOString(),
          }),
        },
      });

      await ctx.updateProgress('水印添加完成', 100, 1);

      return {
        processedImageId: updatedImage.id,
        processedImageUrl: uploadedUrl,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        watermarkType,
        outputResolution,
      };
    } catch (error) {
      await ctx.updateProgress('水印添加失败', 0, 0);
      throw error;
    }
  },

  normalizeResult(result: WatermarkResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      watermarkText: result.watermarkText ?? null,
      watermarkOpacity: result.watermarkOpacity ?? null,
      watermarkPosition: result.watermarkPosition ?? null,
      watermarkType: result.watermarkType ?? null,
      outputResolution: result.outputResolution ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(watermarkHandler);
