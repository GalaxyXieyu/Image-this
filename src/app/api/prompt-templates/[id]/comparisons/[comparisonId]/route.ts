import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adaptLegacyTaskToSummary } from '@/lib/workbench/api-contract';

type CellStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

function mapStatus(summaryStatus: string | undefined): CellStatus {
  if (summaryStatus === 'completed') return 'COMPLETED';
  if (summaryStatus === 'failed' || summaryStatus === 'cancelled') return 'FAILED';
  if (summaryStatus === 'processing') return 'PROCESSING';
  return 'PENDING';
}

/**
 * GET /api/prompt-templates/[id]/comparisons/[comparisonId]
 * 返回一次对比的每格状态与结果图，供工作室轮询；并把终态回写到 Cell 便于历史回看。
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; comparisonId: string }> }
) {
  try {
    const { id, comparisonId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const userId = session.user.id;

    const comparison = await prisma.promptComparison.findFirst({
      where: { id: comparisonId, templateId: id, userId },
      include: { cells: true },
    });
    if (!comparison) {
      return NextResponse.json({ error: '对比记录不存在' }, { status: 404 });
    }

    // 批量取任务状态
    const taskIds = comparison.cells.map((c) => c.taskId).filter(Boolean) as string[];
    const tasks = taskIds.length
      ? await prisma.taskQueue.findMany({ where: { id: { in: taskIds }, userId } })
      : [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    const cells = comparison.cells.map((cell) => {
      const task = cell.taskId ? taskMap.get(cell.taskId) : undefined;
      let status: CellStatus = (cell.status as CellStatus) || 'PENDING';
      let resultUrl: string | null = null;
      let errorMessage: string | null = cell.errorMessage ?? null;
      let processedImageId: string | null = cell.processedImageId ?? null;

      if (task) {
        const summary = adaptLegacyTaskToSummary(task);
        status = mapStatus(summary.status);
        resultUrl = summary.resultImageUrl ?? null;
        errorMessage = task.errorMessage ?? errorMessage;
        processedImageId = task.processedImageId ?? processedImageId;
      }

      return {
        id: cell.id,
        versionId: cell.versionId,
        versionNo: cell.versionNo,
        provider: cell.provider,
        modelName: cell.modelName,
        status,
        resultUrl,
        processedImageId,
        errorMessage,
      };
    });

    // 回写终态（COMPLETED/FAILED）到 Cell，便于历史回看；仅在变化时写
    await Promise.all(
      cells
        .filter((c) => c.status === 'COMPLETED' || c.status === 'FAILED')
        .map((c) => {
          const orig = comparison.cells.find((x) => x.id === c.id);
          if (orig && orig.status === c.status && orig.processedImageId === c.processedImageId) return null;
          return prisma.promptComparisonCell.update({
            where: { id: c.id },
            data: { status: c.status, processedImageId: c.processedImageId ?? undefined, errorMessage: c.errorMessage ?? undefined },
          });
        })
        .filter(Boolean) as Promise<unknown>[]
    );

    return NextResponse.json({
      comparison: { id: comparison.id, testImageUrl: comparison.testImageUrl, createdAt: comparison.createdAt },
      cells,
    });
  } catch (error) {
    console.error('获取对比状态失败:', error);
    return NextResponse.json({ error: '获取对比状态失败' }, { status: 500 });
  }
}
