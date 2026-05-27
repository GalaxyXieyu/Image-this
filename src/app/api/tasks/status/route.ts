import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        errorMessage: true,
        processedImageId: true,
        outputData: true,
      },
    });

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Get task status error:', error);
    return NextResponse.json(
      { error: '获取任务状态失败' },
      { status: 500 }
    );
  }
}
