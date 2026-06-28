/**
 * 通用有序流水线 Handler
 *
 * 把 combo 的多个步骤当成一条流水线：按 steps 顺序逐步处理，
 * 上一步的输出图作为下一步的输入。复用 one-click service 里的分步原语。
 */

import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import type { ToolParameters } from '@/types/workbench';
import type { OneClickResult } from '@/types/workbench/results';
import {
  executeOrderedPipeline,
  type OrderedPipelineStep,
} from '@/app/api/images-process/workflow/one-click/service';
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

const pipelineHandler = {
  name: 'pipeline',
  workflowType: 'pipeline' as const,

  validateInput(raw: unknown): ToolParameters {
    return (raw ?? {}) as ToolParameters;
  },

  async execute(
    ctx: WorkerContext,
    _input: ToolParameters,
    rawInput: Record<string, unknown>
  ): Promise<OneClickResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl =
      (await readAssetAsDataUrl(inputAsset)) ||
      (rawInput.imageUrl as string) ||
      inputAsset?.clientUrl ||
      '';
    const originalImageUrlForRecord = inputAsset?.clientUrl || '';

    const global = (rawInput.global as Record<string, unknown>) || {};
    const rawSteps = Array.isArray(rawInput.steps)
      ? (rawInput.steps as Array<Record<string, unknown>>)
      : [];

    // 解析每步：把背景/场景步骤的参考图资源转成可用 URL
    const steps: OrderedPipelineStep[] = [];
    for (const s of rawSteps) {
      const stepType = (s.stepType as string) || (s.type as string) || '';
      let referenceImageUrl = (s.referenceImageUrl as string) || undefined;
      const refAsset = s.referenceAsset as TaskAssetRef | undefined;
      if (!referenceImageUrl && refAsset) {
        referenceImageUrl = (await readAssetAsDataUrl(refAsset)) || refAsset.clientUrl || undefined;
      }
      steps.push({ ...s, stepType, referenceImageUrl } as OrderedPipelineStep);
    }

    const result = await executeOrderedPipeline({
      imageUrl,
      steps,
      userId: task.userId,
      aiModel: (global.aiModel as string) || 'gemini',
      outputResolution: (global.resolution as string) || (global.outputResolution as string),
      originalImageUrlForRecord,
      volcengineConfig: rawInput.volcengineConfig as { accessKey: string; secretKey: string } | undefined,
      imagehostingConfig: rawInput.imagehostingConfig as { superbedToken: string } | undefined,
      onProgress: ctx.updateProgress,
    });

    return {
      processedImageId: result.id,
      processedImageUrl: result.processedUrl,
      processSteps: result.processSteps,
    };
  },

  normalizeResult(result: OneClickResult): Record<string, unknown> {
    return {
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
      processSteps: result.processSteps ?? [],
    };
  },
};

registerHandler(pipelineHandler);
