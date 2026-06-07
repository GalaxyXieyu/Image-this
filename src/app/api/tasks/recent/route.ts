import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeImageUrlForClient } from '@/lib/image-url';
import { inferWorkflowTypeFromTask } from '@/lib/workbench/task-compat';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const tasks = await prisma.taskQueue.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        currentStep: true,
        createdAt: true,
        inputData: true,
        outputData: true,
        processedImage: {
          select: {
            originalUrl: true,
            processedUrl: true,
          },
        },
      },
    });

    const normalizedTasks = tasks.map((task) => ({
      id: task.id,
      type: task.type,
      workflowType: inferWorkflowTypeFromTask(task.type, task.inputData),
      status: task.status,
      progress: task.progress,
      currentStep: task.currentStep,
      createdAt: task.createdAt,
      originalImageUrl:
        normalizeImageUrlForClient(task.processedImage?.originalUrl)
        || (() => {
          if (!task.inputData) return null;
          try {
            const inputData = JSON.parse(task.inputData);
            return normalizeImageUrlForClient(
              inputData.imageUrl || inputData.originalUrl || inputData.sourceUrl || null
            );
          } catch {
            return null;
          }
        })(),
      resultImageUrl:
        normalizeImageUrlForClient(task.processedImage?.processedUrl)
        || (() => {
          if (!task.outputData) return null;
          try {
            const outputData = JSON.parse(task.outputData);
            return normalizeImageUrlForClient(
              outputData.processedImageUrl
              || outputData.processedUrl
              || outputData.imageUrl
              || outputData.result?.processedUrl
              || outputData.result?.processedImageUrl
              || null
            );
          } catch {
            return null;
          }
        })(),
      videoUrl: (() => {
        if (task.type !== 'VIDEO_GENERATION' || !task.outputData) return null;
        try {
          const outputData = JSON.parse(task.outputData);
          return normalizeImageUrlForClient(outputData.videoUrl || null);
        } catch {
          return null;
        }
      })(),
      usedModel: (() => {
        if (!task.outputData) return null;
        try {
          const outputData = JSON.parse(task.outputData);
          return outputData.usedModel || outputData.modelName || null;
        } catch {
          return null;
        }
      })(),
    }));

    return NextResponse.json({
      success: true,
      tasks: normalizedTasks,
    });
  } catch (error) {
    console.error('Get recent tasks error:', error);
    return NextResponse.json(
      { error: '获取最近任务失败' },
      { status: 500 }
    );
  }
}
