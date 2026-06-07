/**
 * Workflow Task Batch Status API
 *
 * GET /api/workflow/tasks/status?ids=id1,id2,id3
 *
 * Returns lightweight status for multiple tasks at once.
 * Preferred polling endpoint for the frontend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adaptLegacyTaskToSummary } from '@/lib/workbench/api-contract';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: '缺少 ids 参数' }, { status: 400 });
    }

    const ids = idsParam.split(',').filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ success: true, tasks: [] });
    }

    if (ids.length > 50) {
      return NextResponse.json({ error: '单次查询最多 50 个任务' }, { status: 400 });
    }

    const tasks = await prisma.taskQueue.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      tasks: tasks.map((task) => adaptLegacyTaskToSummary(task)),
    });
  } catch (error) {
    console.error('[Workflow API] Batch status error:', error);
    return NextResponse.json(
      { error: '获取任务状态失败', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
