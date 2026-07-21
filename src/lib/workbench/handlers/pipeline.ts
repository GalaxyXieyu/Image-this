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
import path from 'path';

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  mimeType?: string;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset) return null;
  const mimeType = asset.mimeType || 'application/octet-stream';

  // 生产每次部署换 release 目录，历史任务 filePath 可能指向已清理的旧 release。
  // public/uploads 通过 shared 软链跨部署持久，用 clientUrl 相对当前 cwd 重解析。
  const candidates: string[] = [];
  if (asset.filePath) candidates.push(asset.filePath);
  if (asset.clientUrl) {
    let rel = asset.clientUrl.replace(/^\/+/, '');
    if (rel.startsWith('api/files/')) rel = rel.slice('api/files/'.length);
    candidates.push(
      rel.startsWith('uploads/')
        ? path.join(process.cwd(), 'public', rel)
        : path.join(process.cwd(), 'public', 'uploads', rel)
    );
  }

  for (const candidate of candidates) {
    try {
      const buffer = await fs.readFile(candidate);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      // try next candidate
    }
  }
  return null;
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
      // 水印步：把 Logo 资源转成可用 URL（此前只解析了背景步的参考图，导致 combo 的 Logo 水印失效）
      let watermarkLogoUrl = (s.watermarkLogoUrl as string) || undefined;
      const logoAsset = s.watermarkLogoAsset as TaskAssetRef | undefined;
      if (!watermarkLogoUrl && logoAsset) {
        watermarkLogoUrl = (await readAssetAsDataUrl(logoAsset)) || logoAsset.clientUrl || undefined;
      }
      steps.push({ ...s, stepType, referenceImageUrl, watermarkLogoUrl } as OrderedPipelineStep);
    }

    const result = await executeOrderedPipeline({
      imageUrl,
      steps,
      userId: task.userId,
      aiModel: (global.aiModel as string) || 'mediakit',
      model: (global.model as string) || undefined,       // 与 processPipeline 一致
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
