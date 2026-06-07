import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { adaptLegacyTaskToSummary } from '@/lib/workbench/api-contract';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskIds = (searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (taskIds.length === 0) {
      return NextResponse.json({ error: '缺少任务 ID 列表' }, { status: 400 });
    }

    const tasks = await prisma.taskQueue.findMany({
      where: {
        userId: session.user.id,
        id: { in: taskIds },
      },
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        currentStep: true,
        totalSteps: true,
        completedSteps: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
        processedImageId: true,
        projectId: true,
        inputData: true,
        outputData: true,
      },
    });

    const normalizedTasks = tasks.map((task) => {
      const summary = adaptLegacyTaskToSummary(task);
      return {
        id: task.id,
        type: task.type,
        workflowType: summary.workflowType,
        legacyStatus: task.status,
        status: summary.status,
        progress: task.progress,
        currentStep: task.currentStep,
        totalSteps: task.totalSteps,
        completedSteps: task.completedSteps,
        errorMessage: task.errorMessage,
        processedImageId: task.processedImageId,
        projectId: task.projectId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        resultImageUrl: summary.resultImageUrl,
        originalImageUrl: summary.originalImageUrl,
        videoUrl: summary.videoUrl,
        usedModel: summary.usedModel,
      };
    });

    return NextResponse.json({
      success: true,
      tasks: normalizedTasks,
    });
  } catch (error) {
    console.error('Get task status error:', error);
    return NextResponse.json(
      { error: '获取任务状态失败' },
      { status: 500 }
    );
  }
}
