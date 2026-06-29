import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeImageUrlForClient } from '@/lib/image-url';
import { normalizeTaskStatus } from '@/lib/workbench/task-compat';

/**
 * 商品套图任务状态：返回整体进度 + 已完成各类型结果（串行渐进填格用）。
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权访问' }, { status: 401 });
  }

  const taskId = request.nextUrl.searchParams.get('taskId');
  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId' }, { status: 400 });
  }

  const task = await prisma.taskQueue.findFirst({
    where: { id: taskId, userId: session.user.id },
    select: { id: true, status: true, progress: true, currentStep: true, errorMessage: true, outputData: true },
  });
  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  let results: Array<{ listingType: string; index: string; label: string; processedImageUrl: string }> = [];
  try {
    if (task.outputData) {
      const parsed = JSON.parse(task.outputData) as { results?: typeof results };
      results = (parsed.results || []).map((r) => ({
        ...r,
        processedImageUrl: normalizeImageUrlForClient(r.processedImageUrl) || r.processedImageUrl,
      }));
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    success: true,
    status: normalizeTaskStatus(task.status),
    progress: task.progress,
    currentStep: task.currentStep,
    errorMessage: task.errorMessage,
    results,
  });
}
