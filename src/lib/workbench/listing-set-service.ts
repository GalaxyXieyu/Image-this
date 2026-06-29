/**
 * AI 商品套图：一个任务内**串行**生成整套图。
 * 串行而非并行：尊重火山 ARK 等 provider 的并发限制（约 2），套图作为一个完整作业逐张产出。
 * 每出一张就把已完成结果写回 taskQueue.outputData，前端可渐进填格。
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import type { WorkflowResult } from '@/types/workbench/results';
import {
  LISTING_TYPES,
  buildListingPrompt,
  getListingTypeMeta,
  type ListingImageType,
  type ListingProductInfo,
} from '@/lib/workbench/listing-set';

export interface ListingSetItemResult {
  listingType: ListingImageType;
  index: string;
  label: string;
  processedImageId: string;
  processedImageUrl: string;
}

export interface ExecuteListingSetParams {
  userId: string;
  taskId: string;
  sourceImage: string;
  product: ListingProductInfo;
  setId: string;
  /** 指定生成哪些类型，默认全部 5 类 */
  types?: ListingImageType[];
  /** 用户确认后的提示词（按类型覆盖模板默认词）；缺省则用模板词 */
  prompts?: Partial<Record<ListingImageType, string>>;
  originalUrlForRecord?: string;
  provider?: string;
  modelName?: string;
}

export interface ListingSetResult extends WorkflowResult {
  setId: string;
  results: ListingSetItemResult[];
}

async function callProvider(
  provider: string,
  sourceImage: string,
  prompt: string,
  userId: string,
  modelName?: string
): Promise<{ imageData: string; imageSize: number }> {
  const service = await import('@/lib/image-processor/service');
  if (provider === 'gpt') {
    const r = await service.processWithGPT(sourceImage, sourceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  if (provider === 'jimeng' || provider === 'seedream') {
    const r = await service.processWithJimeng(sourceImage, sourceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  const imageData = await service.processWithGemini(sourceImage, sourceImage, prompt, userId, modelName);
  return { imageData: imageData || '', imageSize: imageData?.length || 0 };
}

async function persistPartial(
  taskId: string,
  setId: string,
  results: ListingSetItemResult[],
  currentStep: string,
  progress: number
) {
  await prisma.taskQueue.update({
    where: { id: taskId },
    data: {
      outputData: JSON.stringify({ setId, results, processedImageUrl: results[0]?.processedImageUrl ?? null }),
      currentStep,
      progress,
      completedSteps: results.length,
    },
  });
}

export async function executeListingSet(params: ExecuteListingSetParams): Promise<ListingSetResult> {
  const provider = params.provider || 'gemini';
  const userId = params.userId;
  const types = params.types?.length
    ? params.types
    : LISTING_TYPES.map((t) => t.type);

  const results: ListingSetItemResult[] = [];
  let firstError: Error | null = null;

  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const meta = getListingTypeMeta(type);
    const prompt = params.prompts?.[type] || buildListingPrompt(type, params.product);
    const progress = Math.round((i / types.length) * 100);

    await persistPartial(params.taskId, params.setId, results, `生成 ${meta.index} ${meta.label}…`, progress);

    try {
      const out = await callProvider(provider, params.sourceImage, prompt, userId, params.modelName);
      if (!out.imageData) throw new Error('未返回图像数据');

      const filename = `listing-${type}-${Date.now()}.jpg`;
      const processedUrl = await uploadBase64Image(out.imageData, filename, userId);
      const processedImage = await prisma.processedImage.create({
        data: {
          filename,
          originalUrl: params.originalUrlForRecord || '',
          processedUrl,
          processType: 'BACKGROUND_REMOVAL',
          status: 'COMPLETED',
          fileSize: out.imageSize,
          metadata: JSON.stringify({
            operation: 'listing_set',
            listingType: type,
            setId: params.setId,
            provider,
            prompt,
            processingCompletedAt: new Date().toISOString(),
          }),
          userId,
        },
      });

      results.push({
        listingType: type,
        index: meta.index,
        label: meta.label,
        processedImageId: processedImage.id,
        processedImageUrl: processedUrl,
      });
    } catch (err) {
      // 单张失败不阻断整套：记录首个错误，继续后面的类型
      if (!firstError) firstError = err instanceof Error ? err : new Error(String(err));
      console.error(`[商品套图] ${type} 生成失败:`, firstError.message);
    }
  }

  await persistPartial(params.taskId, params.setId, results, '完成', 100);

  // 全部失败才算任务失败（例如 provider 额度不足）
  if (results.length === 0 && firstError) {
    throw firstError;
  }

  return {
    setId: params.setId,
    results,
    processedImageId: results[0]?.processedImageId,
    processedImageUrl: results[0]?.processedImageUrl,
  };
}
