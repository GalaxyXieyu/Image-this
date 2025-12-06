import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/storage';

// 获取单个任务详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const task = await prisma.taskQueue.findFirst({
      where: {
        id: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
        id: id,
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
      where: { id: id },
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

// 取消/删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证任务所有权，同时获取关联的图片信息
    const task = await prisma.taskQueue.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        processedImage: {
          select: {
            id: true,
            originalUrl: true,
            processedUrl: true,
            thumbnailUrl: true
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    // 如果任务关联了图片，先删除图片记录和本地文件
    if (task.processedImage) {
      const image = task.processedImage;
      
      // 删除本地文件
      const extractFilename = (url: string): string | null => {
        try {
          return url.startsWith('/') ? url.substring(1) : url;
        } catch {
          return url;
        }
      };

      try {
        if (image.originalUrl) {
          const filename = extractFilename(image.originalUrl);
          if (filename) {
            await deleteImage(filename, session.user.id);
          }
        }
        if (image.processedUrl) {
          const filename = extractFilename(image.processedUrl);
          if (filename) {
            await deleteImage(filename, session.user.id);
          }
        }
        if (image.thumbnailUrl) {
          const filename = extractFilename(image.thumbnailUrl);
          if (filename) {
            await deleteImage(filename, session.user.id);
          }
        }
      } catch (deleteError) {
        console.error('删除本地文件失败:', deleteError);
        // 继续删除数据库记录
      }

      // 删除图片数据库记录
      await prisma.processedImage.delete({
        where: { id: image.id }
      });
    }

    // 删除任务
    await prisma.taskQueue.delete({
      where: { id: id }
    });

    return NextResponse.json({
      success: true,
      message: '任务及关联图片已删除'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: '删除任务失败' },
      { status: 500 }
    );
  }
}