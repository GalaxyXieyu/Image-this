import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recoverStuckTasks } from '@/lib/workbench/task-recovery';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 任务恢复 API —— 复用类型感知的恢复核心：
 * - LISTING_SET 按缺失续跑（不重复已成功的图）
 * - 其它类型整体重跑（retryCount<max 重置 PENDING，否则 FAILED）
 * 默认全量恢复所有 PROCESSING（mode=boot），也可传 ?mode=sweep 只回收掉线的。
 */
export async function POST(request: NextRequest) {
  try {
    // 可选：验证内部调用（通过 header 或 secret）
    const authHeader = request.headers.get('x-internal-secret');
    const internalSecret = process.env.INTERNAL_API_SECRET;

    // 如果设置了内部密钥，则验证
    if (internalSecret && authHeader !== internalSecret) {
      // 允许本地调用（用于开发和 instrumentation）
      const host = request.headers.get('host') || '';
      if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return NextResponse.json({ error: '未授权访问' }, { status: 401 });
      }
    }

    // 默认 sweep（仅回收掉线的，避免误伤在跑任务）；显式 ?mode=boot 才全量恢复
    const mode = new URL(request.url).searchParams.get('mode') === 'boot' ? 'boot' : 'sweep';
    const r = await recoverStuckTasks({ mode });

    return NextResponse.json({
      success: true,
      message: '任务恢复完成',
      recovered: r.recovered,
      resumed: r.resumed,
      failed: r.failed,
      total: r.scanned,
    });
  } catch (error) {
    console.error('[Task Recovery] 恢复任务失败:', error);
    return NextResponse.json(
      {
        error: '恢复任务失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET 方法：查看当前卡住的任务状态
export async function GET() {
  try {
    const stuckTasks = await prisma.taskQueue.findMany({
      where: {
        status: 'PROCESSING'
      },
      select: {
        id: true,
        type: true,
        retryCount: true,
        maxRetries: true,
        currentStep: true,
        progress: true,
        startedAt: true,
        updatedAt: true
      },
      orderBy: { startedAt: 'asc' }
    });

    // 计算任务卡住时间
    const tasksWithDuration = stuckTasks.map(task => ({
      ...task,
      stuckDuration: task.startedAt 
        ? Math.round((Date.now() - new Date(task.startedAt).getTime()) / 1000 / 60) 
        : null,
      stuckDurationUnit: 'minutes'
    }));

    return NextResponse.json({
      success: true,
      stuckCount: stuckTasks.length,
      tasks: tasksWithDuration
    });

  } catch (error) {
    console.error('[Task Recovery] 查询卡住任务失败:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}
