/**
 * 套图「重试缺失」——只补齐失败/未生成的张，归入同一个 setId，避免整套重复。
 * 读原任务 inputData(counts/prompts/...) 与 outputData.results(已成功的 type+candidateIndex)，
 * 计算每类缺失的 variant，用同一 setId 新建一个只含缺失张的 LISTING_SET 任务。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInternalWorkerUrl } from '@/lib/internal-worker-url';
import { LISTING_TYPES, type ListingImageType } from '@/lib/workbench/listing-set';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { taskId } = (await request.json()) as { taskId?: string };
    if (!taskId) {
      return NextResponse.json({ error: '缺少 taskId' }, { status: 400 });
    }

    const original = await prisma.taskQueue.findFirst({
      where: {
        id: taskId,
        userId: session.user.id,
        type: 'LISTING_SET',
        status: { in: ['FAILED', 'CANCELLED', 'COMPLETED'] },
      },
      select: { id: true, inputData: true, outputData: true, priority: true, projectId: true },
    });
    if (!original) {
      return NextResponse.json({ error: '未找到可重试的套图任务' }, { status: 404 });
    }

    const input = JSON.parse(original.inputData || '{}') as {
      inputAsset?: unknown;
      imageUrl?: string;
      setId?: string;
      types?: ListingImageType[];
      counts?: Partial<Record<ListingImageType, number>>;
      prompts?: Partial<Record<ListingImageType, string | string[]>>;
      product?: unknown;
      provider?: string;
      modelName?: string;
    };

    // 已成功的 variant（按类型）
    const succeeded = new Map<string, Set<number>>();
    if (original.outputData) {
      try {
        const out = JSON.parse(original.outputData) as {
          results?: Array<{ listingType: string; candidateIndex?: number }>;
        };
        for (const r of out.results ?? []) {
          const set = succeeded.get(r.listingType) ?? new Set<number>();
          set.add(r.candidateIndex ?? 1);
          succeeded.set(r.listingType, set);
        }
      } catch {
        // 无 outputData（整套失败）→ 视为全部缺失
      }
    }

    // 计算每类缺失的 variant 与对应提示词
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

    if (missingTotal === 0) {
      return NextResponse.json({ error: '该套图没有缺失的图，无需重试' }, { status: 400 });
    }

    const missingTypes = Object.keys(missingCounts) as ListingImageType[];
    const setId = input.setId || `set-${Date.now()}`;

    const task = await prisma.taskQueue.create({
      data: {
        type: 'LISTING_SET',
        inputData: JSON.stringify({
          workflowType: 'listing_set',
          inputAsset: input.inputAsset,
          imageUrl: input.imageUrl,
          setId, // 同一套，缺失张并入同一分组
          types: missingTypes,
          counts: missingCounts,
          prompts: missingPrompts,
          product: input.product ?? {},
          provider: input.provider,
          modelName: input.modelName,
        }),
        priority: original.priority ?? 2,
        totalSteps: missingTotal,
        userId: session.user.id,
        projectId: original.projectId || undefined,
        currentStep: '任务已创建，等待处理（补齐缺失）',
        contractVersion: 2,
        workflowType: 'listing_set',
        handlerName: 'listing_set',
      },
    });

    void fetch(getInternalWorkerUrl(request), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true, maxTasks: 1, taskIds: [task.id] }),
    }).catch((e) => console.warn('[套图重试] 触发 worker 失败:', e));

    return NextResponse.json({ success: true, taskId: task.id, setId, missing: missingTotal });
  } catch (error) {
    console.error('[套图重试] 失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '重试失败' },
      { status: 500 }
    );
  }
}
