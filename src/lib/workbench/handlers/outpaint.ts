/**
 * Outpaint Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processImageExpansion.
 * Uses Volcengine for image expansion/outpainting.
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateOutpaintParams } from '@/lib/workbench/input-validation';
import type { OutpaintParams } from '@/types/workbench';
import type { OutpaintResult } from '@/types/workbench/results';
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

const outpaintHandler = {
  name: 'outpaint',
  workflowType: 'outpaint' as const,

  validateInput(raw: unknown): OutpaintParams {
    return validateOutpaintParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    input: OutpaintParams,
    rawInput: Record<string, unknown>
  ): Promise<OutpaintResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);

    const xScale = input.xScale;
    const yScale = input.yScale;
    const prompt = input.prompt || '扩展图像，保持产品主体和风格完全一致，自然延伸背景';
    const volcengineConfig = rawInput.volcengineConfig as { accessKey: string; secretKey: string } | undefined;
    const imagehostingConfig = rawInput.imagehostingConfig as { superbedToken: string } | undefined;

    const originalImageUrlForRecord =
      getAssetClientUrl(inputAsset) ||
      (await persistRecordUrl(rawInput.imageUrl as string, `input-outpaint-${task.id}.jpg`, task.userId));

    // Convert xScale/yScale to Volcengine expand ratios
    const top = (yScale - 1) / 2;
    const bottom = (yScale - 1) / 2;
    const left = (xScale - 1) / 2;
    const right = (xScale - 1) / 2;

    await ctx.updateProgress('图像扩展处理中...', 50, 1);

    try {
      const { outpaintWithVolcengine } = await import('@/lib/image-processor/service');

      const result = await outpaintWithVolcengine(
        task.userId,
        imageUrl,
        prompt,
        top,
        bottom,
        left,
        right,
        1920,
        1920,
        volcengineConfig,
        imagehostingConfig
      );

      const processedUrl = await uploadBase64Image(
        result.imageData,
        `outpaint-${Date.now()}.jpg`,
        task.userId
      );

      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `outpaint-${Date.now()}.jpg`,
          originalUrl: originalImageUrlForRecord,
          processedUrl,
          processType: 'IMAGE_OUTPAINTING',
          status: 'COMPLETED',
          fileSize: result.imageSize,
          metadata: JSON.stringify({
            provider: 'mediakit',
            expandRatio: { top, bottom, left, right },
            processingCompletedAt: new Date().toISOString(),
          }),
          userId: task.userId,
        },
      });

      await ctx.updateProgress('图像扩展完成', 100, 1);

      return {
        processedImageId: processedImage.id,
        processedImageUrl: processedUrl,
        expandRatio: `${xScale}x${yScale}`,
      };
    } catch (error) {
      console.error(`[图像扩展] 处理失败:`, error);
      await ctx.updateProgress('图像扩展失败', 0, 0);
      throw error;
    }
  },

  normalizeResult(result: OutpaintResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      expandRatio: result.expandRatio ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(outpaintHandler);
