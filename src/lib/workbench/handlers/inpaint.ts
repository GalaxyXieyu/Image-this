/**
 * 局部重绘（圈画 / mask）Handler
 *
 * 读取原图与蒙版资源，调用 inpaint-service 完成「高亮引导图 + 双参考图重绘」。
 */

import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import type { ToolParameters } from '@/types/workbench';
import {
  executeInpaint,
  type InpaintAction,
  type InpaintStrength,
  type InpaintResult,
} from '@/lib/workbench/inpaint-service';
import fs from 'fs/promises';

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  mimeType?: string;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset?.filePath) return null;
  try {
    const buffer = await fs.readFile(asset.filePath);
    return `data:${asset.mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const inpaintHandler = {
  name: 'inpaint',
  workflowType: 'inpaint' as const,

  validateInput(raw: unknown): ToolParameters {
    return (raw ?? {}) as ToolParameters;
  },

  async execute(
    ctx: WorkerContext,
    _input: ToolParameters,
    rawInput: Record<string, unknown>
  ): Promise<InpaintResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const maskAsset = rawInput.maskAsset as TaskAssetRef | undefined;

    const sourceImage =
      (await readAssetAsDataUrl(inputAsset)) ||
      (rawInput.imageUrl as string) ||
      inputAsset?.clientUrl ||
      '';
    const maskImage = (await readAssetAsDataUrl(maskAsset)) || (rawInput.maskDataUrl as string) || '';

    if (!sourceImage) throw new Error('缺少原图');
    if (!maskImage) throw new Error('缺少蒙版');

    return executeInpaint({
      userId: task.userId,
      sourceImage,
      maskImage,
      prompt: rawInput.prompt as string | undefined,
      action: (rawInput.action as InpaintAction) || 'inpaint',
      strength: (rawInput.strength as InpaintStrength) || 'medium',
      originalUrlForRecord: inputAsset?.clientUrl || (rawInput.imageUrl as string) || '',
      provider: rawInput.provider as string | undefined,
      modelName: rawInput.modelName as string | undefined,
      onProgress: (message, progress) => ctx.updateProgress(message, progress, progress >= 100 ? 1 : 0),
    });
  },

  normalizeResult(result: InpaintResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      prompt: result.prompt ?? null,
      usedModel: result.usedModel ?? null,
    };
  },
};

registerHandler(inpaintHandler);
