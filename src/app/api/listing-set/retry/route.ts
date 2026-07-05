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
import { createListingSetResumeTask } from '@/lib/workbench/listing-set-resume';

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
      select: { id: true, userId: true, inputData: true, outputData: true, priority: true, projectId: true },
    });
    if (!original) {
      return NextResponse.json({ error: '未找到可重试的套图任务' }, { status: 404 });
    }

    const resume = await createListingSetResumeTask(original);
    if (!resume) {
      return NextResponse.json({ error: '该套图没有缺失的图，无需重试' }, { status: 400 });
    }

    void fetch(getInternalWorkerUrl(request), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true, maxTasks: 1, taskIds: [resume.id] }),
    }).catch((e) => console.warn('[套图重试] 触发 worker 失败:', e));

    return NextResponse.json({ success: true, taskId: resume.id, setId: resume.setId, missing: resume.missingTotal });
  } catch (error) {
    console.error('[套图重试] 失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '重试失败' },
      { status: 500 }
    );
  }
}
