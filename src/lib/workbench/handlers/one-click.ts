/**
 * One-Click Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processOneClickWorkflow.
 * Orchestrates background replace, outpaint, upscale, and watermark in sequence.
 */

import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateOneClickParams } from '@/lib/workbench/input-validation';
import type { OneClickParams } from '@/types/workbench';
import type { OneClickResult } from '@/types/workbench/results';
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
  const { uploadBase64Image } = await import('@/lib/storage');
  if (source.startsWith('data:')) {
    return uploadBase64Image(source, filename, userId);
  }
  return source;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const oneClickHandler = {
  name: 'one_click',
  workflowType: 'one_click' as const,

  validateInput(raw: unknown): OneClickParams {
    return validateOneClickParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    input: OneClickParams,
    rawInput: Record<string, unknown>
  ): Promise<OneClickResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);

    const referenceAsset = rawInput.referenceAsset as TaskAssetRef | undefined;
    const referenceImageUrl =
      (await readAssetAsDataUrl(referenceAsset)) || (rawInput.referenceImageUrl as string);

    const watermarkLogoAsset = rawInput.watermarkLogoAsset as TaskAssetRef | undefined;
    const watermarkLogoUrl =
      (await readAssetAsDataUrl(watermarkLogoAsset)) || (rawInput.watermarkLogoUrl as string);

    const originalImageUrlForRecord =
      getAssetClientUrl(inputAsset) ||
      (await persistRecordUrl(rawInput.imageUrl as string, `input-one-click-${task.id}.jpg`, task.userId));
    const referenceImageUrlForRecord =
      getAssetClientUrl(referenceAsset) ||
      (await persistRecordUrl(
        rawInput.referenceImageUrl as string,
        `reference-one-click-${task.id}.jpg`,
        task.userId
      ));
    const watermarkLogoUrlForRecord =
      getAssetClientUrl(watermarkLogoAsset) ||
      (await persistRecordUrl(
        rawInput.watermarkLogoUrl as string,
        `logo-one-click-${task.id}.png`,
        task.userId
      ));

    const {
      enableBackgroundReplace = false,
      enableOutpaint = true,
      enableUpscale = true,
      enableWatermark = false,
    } = input;

    const xScale = input.xScale;
    const yScale = input.yScale;
    const upscaleFactor = input.upscaleFactor;
    const backgroundPrompt = input.backgroundPrompt;
    const outpaintPrompt = input.outpaintPrompt;
    const aiModel = input.aiModel;
    const outputResolution = input.outputResolution;

    // Watermark params from nested watermarkParams or raw input
    const watermarkText =
      input.watermarkParams?.watermarkText ?? (rawInput.watermarkText as string) ?? 'Sample Watermark';
    const watermarkOpacity =
      input.watermarkParams?.watermarkOpacity ?? (rawInput.watermarkOpacity as number) ?? 0.3;
    const watermarkPosition =
      input.watermarkParams?.watermarkPosition ??
      ((rawInput.watermarkPosition as string) || 'bottom-right');
    const watermarkType =
      input.watermarkParams?.watermarkType ?? ((rawInput.watermarkType as string) || 'text');

    const volcengineConfig = rawInput.volcengineConfig as
      | { accessKey: string; secretKey: string }
      | undefined;
    const imagehostingConfig = rawInput.imagehostingConfig as
      | { superbedToken: string }
      | undefined;

    await ctx.updateProgress('Step 1/3: 准备处理...', 10, 1);

    try {
      const { executeOneClickWorkflow } = await import(
        '@/app/api/images-process/workflow/one-click/service'
      );

      const result = await executeOneClickWorkflow({
        imageUrl,
        referenceImageUrl,
        xScale,
        yScale,
        upscaleFactor,
        enableBackgroundReplace,
        enableOutpaint,
        enableUpscale,
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition: watermarkPosition as
          | 'top-left'
          | 'top-right'
          | 'bottom-left'
          | 'bottom-right'
          | 'center',
        watermarkType: watermarkType as 'text' | 'logo',
        watermarkLogoUrl,
        outputResolution,
        aiModel,
        backgroundPrompt,
        outpaintPrompt,
        userId: task.userId,
        volcengineConfig,
        imagehostingConfig,
        originalImageUrlForRecord,
        referenceImageUrlForRecord,
        watermarkLogoUrlForRecord,
      });

      await ctx.updateProgress('Step 3/3: 处理完成', 100, 3);

      return {
        processedImageId: result.id,
        processedImageUrl: result.processedUrl,
        processSteps: [
          ...(result.processSteps.backgroundReplace ? ['background_replace'] : []),
          ...(result.processSteps.outpaint ? ['outpaint'] : []),
          ...(result.processSteps.upscale ? ['upscale'] : []),
          ...(result.processSteps.watermark ? ['watermark'] : []),
        ],
        settings: {
          xScale,
          yScale,
          upscaleFactor,
          enableBackgroundReplace,
          enableOutpaint,
          enableUpscale,
          enableWatermark,
          watermarkType,
          outputResolution,
        },
      };
    } catch (error) {
      await ctx.updateProgress('处理失败', 0, 0);
      throw error;
    }
  },

  normalizeResult(result: OneClickResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      processSteps: result.processSteps ?? [],
      settings: result.settings ?? {},
    };
  },
};

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(oneClickHandler);
