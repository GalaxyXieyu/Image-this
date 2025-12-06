import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/storage';

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
    // 限制最大返回数量
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
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

    // 查询任务 - 排除大型 JSON 字段以提升性能
    const tasks = await prisma.taskQueue.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        status: true,
        priority: true,
        progress: true,
        currentStep: true,
        totalSteps: true,
        completedSteps: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
        userId: true,
        projectId: true,
        processedImageId: true,
        // 注意：不包含 inputData 和 outputData 以提升性能
        project: {
          select: { id: true, name: true }
        },
        processedImage: {
          select: { id: true, filename: true, originalUrl: true, processedUrl: true }
        }
      }
    });

    // 并行获取总数和状态统计（一次数据库往返）
    const [total, statusCounts] = await Promise.all([
      prisma.taskQueue.count({ where }),
      // 使用 groupBy 一次查询获取所有状态统计
      prisma.taskQueue.groupBy({
        by: ['status'],
        where: { userId: session.user.id },
        _count: { status: true }
      })
    ]);

    // 转换状态统计
    const stats = { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 };
    for (const item of statusCounts) {
      const count = item._count.status;
      stats.total += count;
      switch (item.status) {
        case 'PENDING': stats.pending = count; break;
        case 'PROCESSING': stats.processing = count; break;
        case 'COMPLETED': stats.completed = count; break;
        case 'FAILED': stats.failed = count; break;
      }
    }

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      // 直接返回统计，前端不需要额外请求
      stats
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

    // 辅助函数：删除图片文件和数据库记录
    const deleteAssociatedImages = async (tasks: { processedImageId: string | null }[]) => {
      const imageIds = tasks
        .filter(t => t.processedImageId)
        .map(t => t.processedImageId as string);
      
      if (imageIds.length === 0) return;

      // 获取图片详情
      const images = await prisma.processedImage.findMany({
        where: { id: { in: imageIds } },
        select: {
          id: true,
          originalUrl: true,
          processedUrl: true,
          thumbnailUrl: true
        }
      });

      // 删除本地文件
      const extractFilename = (url: string): string | null => {
        try {
          return url.startsWith('/') ? url.substring(1) : url;
        } catch {
          return url;
        }
      };

      for (const image of images) {
        try {
          if (image.originalUrl) {
            const filename = extractFilename(image.originalUrl);
            if (filename) await deleteImage(filename, session.user.id);
          }
          if (image.processedUrl) {
            const filename = extractFilename(image.processedUrl);
            if (filename) await deleteImage(filename, session.user.id);
          }
          if (image.thumbnailUrl) {
            const filename = extractFilename(image.thumbnailUrl);
            if (filename) await deleteImage(filename, session.user.id);
          }
        } catch (deleteError) {
          console.error('删除本地文件失败:', deleteError);
        }
      }

      // 删除图片数据库记录
      await prisma.processedImage.deleteMany({
        where: { id: { in: imageIds } }
      });
    };

    let deleteResult;

    if (deleteAll) {
      // 获取所有任务及其关联的图片
      const allTasks = await prisma.taskQueue.findMany({
        where: { userId: session.user.id },
        select: { processedImageId: true }
      });

      // 删除关联的图片
      await deleteAssociatedImages(allTasks);

      // 删除用户的所有任务
      deleteResult = await prisma.taskQueue.deleteMany({
        where: {
          userId: session.user.id
        }
      });
    } else if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      // 批量删除指定的任务
      // 首先验证所有任务都属于当前用户，并获取关联的图片
      const tasks = await prisma.taskQueue.findMany({
        where: {
          id: { in: taskIds },
          userId: session.user.id
        },
        select: { id: true, processedImageId: true }
      });

      if (tasks.length !== taskIds.length) {
        return NextResponse.json(
          { error: '部分任务不存在或无权限删除' },
          { status: 403 }
        );
      }

      // 删除关联的图片
      await deleteAssociatedImages(tasks);

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
      message: `已删除 ${deleteResult.count} 个任务及关联图片`,
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