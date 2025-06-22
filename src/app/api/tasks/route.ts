import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 创建新任务
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      type, 
      inputData, 
      priority = 1, 
      projectId,
      totalSteps = 1 
    } = body;

    if (!type || !inputData) {
      return NextResponse.json(
        { error: '缺少必要参数：type, inputData' },
        { status: 400 }
      );
    }

    // 创建任务
    const task = await prisma.taskQueue.create({
      data: {
        type,
        inputData,
        priority,
        totalSteps,
        userId: session.user.id,
        projectId,
        currentStep: '任务已创建，等待处理'
      }
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        type: task.type,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        createdAt: task.createdAt
      }
    });

  } catch (error) {
    // console.error('Create task error:', error);
    return NextResponse.json(
      { error: '创建任务失败' },
      { status: 500 }
    );
  }
}

// 获取用户的任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = {
      userId: session.user.id
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // 查询任务
    const tasks = await prisma.taskQueue.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        project: {
          select: { id: true, name: true }
        },
        processedImage: {
          select: { id: true, filename: true, processedUrl: true }
        }
      }
    });

    // 获取总数
    const total = await prisma.taskQueue.count({ where });

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    // console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}