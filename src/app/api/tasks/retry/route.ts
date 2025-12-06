import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 重试任务 - 支持单个和批量重试（包括已完成的任务）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { taskIds } = body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: '请提供要重试的任务ID列表' },
        { status: 400 }
      );
    }

    // 查找原始任务
    const originalTasks = await prisma.taskQueue.findMany({
      where: {
        id: { in: taskIds },
        userId: session.user.id,
        status: { in: ['FAILED', 'CANCELLED', 'COMPLETED'] } // 允许重试失败、取消或已完成的任务
      },
      select: {
        id: true,
        type: true,
        inputData: true,
        priority: true,
        totalSteps: true,
        projectId: true
      }
    });

    if (originalTasks.length === 0) {
      return NextResponse.json(
        { error: '没有找到可重试的任务（可重试失败、已取消或已完成的任务）' },
        { status: 400 }
      );
    }

    // 创建新任务
    const newTasks = await Promise.all(
      originalTasks.map(task =>
        prisma.taskQueue.create({
          data: {
            type: task.type,
            inputData: task.inputData,
            priority: task.priority,
            totalSteps: task.totalSteps,
            userId: session.user.id,
            projectId: task.projectId,
            currentStep: '任务已创建，等待处理（重新运行）'
          }
        })
      )
    );

    // 自动触发任务处理器
    try {
      await fetch(new URL('/api/tasks/worker', request.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true })
      });
    } catch (e) {
      console.warn('自动触发任务处理器失败:', e);
    }

    return NextResponse.json({
      success: true,
      message: `已创建 ${newTasks.length} 个重试任务`,
      retryCount: newTasks.length,
      originalCount: taskIds.length,
      tasks: newTasks.map(task => ({
        id: task.id,
        type: task.type,
        status: task.status,
        createdAt: task.createdAt
      }))
    });

  } catch (error) {
    console.error('Retry tasks error:', error);
    return NextResponse.json(
      { error: '重试任务失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
