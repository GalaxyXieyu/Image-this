/**
 * 套图「按缺失续跑」共享逻辑。
 * 从原任务 inputData(counts/prompts/...) 与 outputData.results(已成功的 type+candidateIndex)
 * 计算每类缺失的 variant，并可用同一 setId 新建只含缺失张的 LISTING_SET 任务。
 * 被「手动重试缺失」接口与「全局任务恢复」共用。
 */

import { prisma } from '@/lib/prisma';
import { LISTING_TYPES, type ListingImageType } from '@/lib/workbench/listing-set';

interface ListingSetInput {
  inputAsset?: unknown;
  imageUrl?: string;
  setId?: string;
  types?: ListingImageType[];
  counts?: Partial<Record<ListingImageType, number>>;
  prompts?: Partial<Record<ListingImageType, string | string[]>>;
  product?: unknown;
  provider?: string;
  modelName?: string;
}

export interface MissingListingSet {
  input: ListingSetInput;
  setId: string;
  missingTypes: ListingImageType[];
  missingCounts: Partial<Record<ListingImageType, number>>;
  missingPrompts: Partial<Record<ListingImageType, string[]>>;
  missingTotal: number;
}

/** 计算某套图任务还缺哪几张（按 type × variant），并给出对应提示词切片 */
export function computeMissingListingSet(inputDataStr: string | null, outputDataStr: string | null): MissingListingSet {
  const input = JSON.parse(inputDataStr || '{}') as ListingSetInput;

  const succeeded = new Map<string, Set<number>>();
  let setIdFromOutput: string | undefined;
  if (outputDataStr) {
    try {
      const out = JSON.parse(outputDataStr) as {
        results?: Array<{ listingType: string; candidateIndex?: number }>;
        setId?: string;
      };
      setIdFromOutput = out.setId;
      for (const r of out.results ?? []) {
        const set = succeeded.get(r.listingType) ?? new Set<number>();
        set.add(r.candidateIndex ?? 1);
        succeeded.set(r.listingType, set);
      }
    } catch {
      // 无/坏 outputData（整套失败）→ 视为全部缺失
    }
  }

  const expectedTypes = (input.types && input.types.length ? input.types : LISTING_TYPES.map((t) => t.type)) as ListingImageType[];
  const missingCounts: Partial<Record<ListingImageType, number>> = {};
  const missingPrompts: Partial<Record<ListingImageType, string[]>> = {};
  let missingTotal = 0;

  for (const type of expectedTypes) {
    const expected = Math.max(1, Math.floor(input.counts?.[type] ?? 1));
    const done = succeeded.get(type) ?? new Set<number>();
    const rawPrompts = input.prompts?.[type];
    const promptList = Array.isArray(rawPrompts) ? rawPrompts : rawPrompts ? [rawPrompts] : [];
    const missingVariants: number[] = [];
    for (let v = 1; v <= expected; v++) {
      if (!done.has(v)) missingVariants.push(v);
    }
    if (missingVariants.length > 0) {
      missingCounts[type] = missingVariants.length;
      missingPrompts[type] = missingVariants.map((v) => promptList[v - 1] ?? '');
      missingTotal += missingVariants.length;
    }
  }

  const setId = setIdFromOutput || input.setId || `set-${Date.now()}`;
  return {
    input,
    setId,
    missingTypes: Object.keys(missingCounts) as ListingImageType[],
    missingCounts,
    missingPrompts,
    missingTotal,
  };
}

/** 用同一 setId 新建一个只含缺失张的 LISTING_SET 任务；无缺失则返回 null。session-less，按 task.userId 归属 */
export async function createListingSetResumeTask(task: {
  userId: string;
  inputData: string;
  outputData: string | null;
  priority?: number | null;
  projectId?: string | null;
}): Promise<{ id: string; setId: string; missingTotal: number } | null> {
  const m = computeMissingListingSet(task.inputData, task.outputData);
  if (m.missingTotal === 0) return null;

  const created = await prisma.taskQueue.create({
    data: {
      type: 'LISTING_SET',
      inputData: JSON.stringify({
        workflowType: 'listing_set',
        inputAsset: m.input.inputAsset,
        imageUrl: m.input.imageUrl,
        setId: m.setId, // 同一套，缺失张并入同一分组
        types: m.missingTypes,
        counts: m.missingCounts,
        prompts: m.missingPrompts,
        product: m.input.product ?? {},
        provider: m.input.provider,
        modelName: m.input.modelName,
      }),
      priority: task.priority ?? 2,
      totalSteps: m.missingTotal,
      userId: task.userId,
      projectId: task.projectId || undefined,
      currentStep: '任务已创建，等待处理（补齐缺失）',
      contractVersion: 2,
      workflowType: 'listing_set',
      handlerName: 'listing_set',
    },
  });
  return { id: created.id, setId: m.setId, missingTotal: m.missingTotal };
}
