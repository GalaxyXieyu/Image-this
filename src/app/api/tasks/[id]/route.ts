import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取单个任务详情
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const task = await prisma.taskQueue.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        project: {
          select: { id: true, name: true }
        },
        processedImage: {
          select: { 
            id: true, 
            filename: true, 
            originalUrl: true,
            processedUrl: true,
            thumbnailUrl: true,
            fileSize: true,
            width: true,
            height: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task
    });

  } catch (error) {
    // console.error('Get task error:', error);
    return NextResponse.json(
      { error: '获取任务详情失败' },
      { status: 500 }
    );
  }
}

// 更新任务状态
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      status, 
      progress, 
      currentStep, 
      completedSteps,
      outputData,
      errorMessage,
      processedImageId
    } = body;

    // 验证任务所有权
    const existingTask = await prisma.taskQueue.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 准备更新数据
    const updateData: any = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status;
      
      if (status === 'PROCESSING' && !existingTask.startedAt) {
        updateData.startedAt = new Date();
      }
      
      if (status === 'COMPLETED' || status === 'FAILED') {
        updateData.completedAt = new Date();
      }
    }

    if (progress !== undefined) {
      updateData.progress = Math.max(0, Math.min(100, progress));
    }

    if (currentStep) {
      updateData.currentStep = currentStep;
    }

    if (completedSteps !== undefined) {
      updateData.completedSteps = completedSteps;
    }

    if (outputData) {
      updateData.outputData = outputData;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    if (processedImageId) {
      updateData.processedImageId = processedImageId;
    }

    // 更新任务
    const updatedTask = await prisma.taskQueue.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: {
          select: { id: true, name: true }
        },
        processedImage: {
          select: { 
            id: true, 
            filename: true, 
            processedUrl: true 
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      task: updatedTask
    });

  } catch (error) {
    // console.error('Update task error:', error);
    return NextResponse.json(
      { error: '更新任务失败' },
      { status: 500 }
    );
  }
}

// 取消任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证任务所有权
    const task = await prisma.taskQueue.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 只能取消未开始或进行中的任务
    if (task.status === 'COMPLETED' || task.status === 'FAILED') {
      return NextResponse.json(
        { error: '无法取消已完成或失败的任务' },
        { status: 400 }
      );
    }

    // 更新任务状态为已取消
    const updatedTask = await prisma.taskQueue.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
        currentStep: '任务已取消'
      }
    });

    return NextResponse.json({
      success: true,
      message: '任务已取消',
      task: updatedTask
    });

  } catch (error) {
    // console.error('Cancel task error:', error);
    return NextResponse.json(
      { error: '取消任务失败' },
      { status: 500 }
    );
  }
}