import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 任务恢复 API
 * 用于服务重启后恢复卡住的 PROCESSING 状态任务
 * 
 * 逻辑：
 * 1. 查找所有 PROCESSING 状态的任务
 * 2. 如果 retryCount < maxRetries，重置为 PENDING 状态并增加 retryCount
 * 3. 如果 retryCount >= maxRetries，标记为 FAILED
 * 4. 自动触发 worker 处理队列
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

    // 查找所有卡住的 PROCESSING 任务
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
        startedAt: true
      }
    });

    if (stuckTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要恢复的任务',
        recovered: 0,
        failed: 0
      });
    }

    let recoveredCount = 0;
    let failedCount = 0;
    const results: Array<{ id: string; action: string; reason?: string }> = [];

    for (const task of stuckTasks) {
      const retryCount = task.retryCount ?? 0;
      const maxRetries = task.maxRetries ?? 3;

      if (retryCount < maxRetries) {
        // 可以重试：重置为 PENDING 状态
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            progress: 0,
            currentStep: `任务恢复中（第 ${retryCount + 1} 次重试）`,
            startedAt: null,
            errorMessage: `服务重启导致任务中断，自动重试 (${retryCount + 1}/${maxRetries})`
          }
        });
        recoveredCount++;
        results.push({ id: task.id, action: 'recovered' });
      } else {
        // 超过最大重试次数：标记为失败
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `任务重试次数已达上限 (${maxRetries} 次)，最后状态: ${task.currentStep || '未知'}`,
            currentStep: '重试次数已达上限'
          }
        });
        failedCount++;
        results.push({ 
          id: task.id, 
          action: 'failed', 
          reason: `超过最大重试次数 (${maxRetries})` 
        });
      }
    }

    // 如果有恢复的任务，自动触发 worker
    if (recoveredCount > 0) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
        await fetch(`${baseUrl}/api/tasks/worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: true })
        });
      } catch (e) {
        console.warn('[Task Recovery] 自动触发 worker 失败:', e);
      }
    }

    console.log(`[Task Recovery] 恢复完成: ${recoveredCount} 个任务已恢复, ${failedCount} 个任务标记为失败`);

    return NextResponse.json({
      success: true,
      message: `任务恢复完成`,
      recovered: recoveredCount,
      failed: failedCount,
      total: stuckTasks.length,
      details: results
    });

  } catch (error) {
    console.error('[Task Recovery] 恢复任务失败:', error);
    return NextResponse.json(
      { 
        error: '恢复任务失败', 
        details: error instanceof Error ? error.message : 'Unknown error' 
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
