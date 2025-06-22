import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取单个项目详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            processedImages: true,
            taskQueue: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    // console.error('Get project error:', error);
    return NextResponse.json(
      { error: '获取项目详情失败' },
      { status: 500 }
    );
  }
}

// 更新项目信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // 验证项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingProject) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 如果要更新名称，检查是否与其他项目重名
    if (name && name.trim() !== existingProject.name) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          name: name.trim(),
          userId: session.user.id,
          id: { not: id } // 排除当前项目
        }
      });

      if (duplicateProject) {
        return NextResponse.json(
          { error: '已存在同名项目' },
          { status: 400 }
        );
      }
    }

    // 更新项目
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null })
      },
      include: {
        _count: {
          select: {
            processedImages: true,
            taskQueue: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      project: updatedProject
    });

  } catch (error) {
    // console.error('Update project error:', error);
    return NextResponse.json(
      { error: '更新项目失败' },
      { status: 500 }
    );
  }
}

// 删除项目
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { id } = await params;

    // 验证项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            processedImages: true,
            taskQueue: true
          }
        }
      }
    });

    if (!existingProject) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 检查项目是否包含图片或任务
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    if (!force && (existingProject._count.processedImages > 0 || existingProject._count.taskQueue > 0)) {
      return NextResponse.json({
        error: '项目包含图片或任务，无法删除',
        details: {
          imageCount: existingProject._count.processedImages,
          taskCount: existingProject._count.taskQueue
        }
      }, { status: 400 });
    }

    // 如果强制删除，先将项目中的图片移动到"未分类"
    if (force && existingProject._count.processedImages > 0) {
      await prisma.processedImage.updateMany({
        where: {
          projectId: id,
          userId: session.user.id
        },
        data: {
          projectId: null
        }
      });
    }

    // 删除项目中的任务
    if (existingProject._count.taskQueue > 0) {
      await prisma.taskQueue.deleteMany({
        where: {
          projectId: id,
          userId: session.user.id
        }
      });
    }

    // 删除项目
    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: '项目删除成功'
    });

  } catch (error) {
    // console.error('Delete project error:', error);
    return NextResponse.json(
      { error: '删除项目失败' },
      { status: 500 }
    );
  }
}
