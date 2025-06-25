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
    
    // 检查是否是批量任务请求
    if (Array.isArray(body)) {
      // 批量创建任务
      const taskPromises = body.map(task => {
        const { 
          type, 
          inputData, 
          priority = 1, 
          projectId,
          totalSteps = 1 
        } = task;

        if (!type || !inputData) {
          throw new Error('缺少必要参数：type, inputData');
        }

        return prisma.taskQueue.create({
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
      });

      // 使用Promise.all并行创建所有任务
      const createdTasks = await Promise.all(taskPromises);
      
      // 返回创建的任务ID列表
      return NextResponse.json({
        success: true,
        tasks: createdTasks.map(task => ({
          id: task.id,
          type: task.type,
          status: task.status,
          progress: task.progress,
          currentStep: task.currentStep,
          createdAt: task.createdAt
        }))
      });
    } else {
      // 单个任务创建 (保持原有逻辑)
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
    }

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: '创建任务失败', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const taskIds = searchParams.get('ids')?.split(','); // 新增：按ID列表查询

    // 构建查询条件
    const where: Record<string, unknown> = {
      userId: session.user.id
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // 如果提供了任务ID列表，则按ID查询
    if (taskIds && taskIds.length > 0) {
      where.id = { in: taskIds };
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
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}

// 批量删除任务
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { taskIds, deleteAll = false } = body;

    let deleteResult;

    if (deleteAll) {
      // 删除用户的所有任务
      deleteResult = await prisma.taskQueue.deleteMany({
        where: {
          userId: session.user.id
        }
      });
    } else if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      // 批量删除指定的任务
      // 首先验证所有任务都属于当前用户
      const tasks = await prisma.taskQueue.findMany({
        where: {
          id: { in: taskIds },
          userId: session.user.id
        },
        select: { id: true }
      });

      if (tasks.length !== taskIds.length) {
        return NextResponse.json(
          { error: '部分任务不存在或无权限删除' },
          { status: 403 }
        );
      }

      // 删除任务
      deleteResult = await prisma.taskQueue.deleteMany({
        where: {
          id: { in: taskIds },
          userId: session.user.id
        }
      });
    } else {
      return NextResponse.json(
        { error: '请提供要删除的任务ID列表或设置deleteAll为true' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `已删除 ${deleteResult.count} 个任务`,
      deletedCount: deleteResult.count
    });

  } catch (error) {
    console.error('Delete tasks error:', error);
    return NextResponse.json(
      { error: '批量删除任务失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}