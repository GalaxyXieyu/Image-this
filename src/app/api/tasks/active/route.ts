/**
 * 进行中任务（PENDING / PROCESSING）——供图库展示"水位上涨"占位
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeImageUrlForClient } from '@/lib/image-url';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const tasks = await prisma.taskQueue.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        completedSteps: true,
        totalSteps: true,
        currentStep: true,
        createdAt: true,
        inputData: true,
        processedImage: { select: { originalUrl: true } },
      },
    });

    const normalized = tasks.map((task) => ({
      id: task.id,
      type: task.type,
      status: task.status,
      progress: task.progress ?? 0,
      completedSteps: task.completedSteps ?? 0,
      totalSteps: task.totalSteps ?? 0,
      currentStep: task.currentStep,
      createdAt: task.createdAt,
      originalImageUrl:
        normalizeImageUrlForClient(task.processedImage?.originalUrl)
        || (() => {
          if (!task.inputData) return null;
          try {
            const d = JSON.parse(task.inputData) as Record<string, unknown> & {
              inputAsset?: { clientUrl?: string; url?: string };
            };
            return normalizeImageUrlForClient(
              (d.imageUrl as string)
              || (d.originalUrl as string)
              || (d.sourceUrl as string)
              || d.inputAsset?.clientUrl
              || d.inputAsset?.url
              || null
            );
          } catch {
            return null;
          }
        })(),
    }));

    return NextResponse.json({ success: true, tasks: normalized });
  } catch (error) {
    console.error('Get active tasks error:', error);
    return NextResponse.json({ error: '获取进行中任务失败' }, { status: 500 });
  }
}
