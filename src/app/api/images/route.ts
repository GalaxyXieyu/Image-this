import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 获取用户的图片列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    // 限制最大返回数量，防止单次查询过多数据
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = {
      userId: session.user.id
    };

    if (search) {
      where.filename = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.processType = type;
    }

    // 查询图片 - 优化字段选择，减少数据传输
    const images = await prisma.processedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        filename: true,
        originalUrl: true,
        processedUrl: true,
        thumbnailUrl: true,
        processType: true,
        status: true,
        fileSize: true,
        width: true,
        height: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // 获取总数
    const total = await prisma.processedImage.count({ where });

    return NextResponse.json({
      success: true,
      images,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    // console.error('Get images error:', error);
    return NextResponse.json(
      { error: '获取图片列表失败' },
      { status: 500 }
    );
  }
}

// 上传或创建图片记录
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      filename,
      originalUrl,
      processedUrl,
      thumbnailUrl,
      processType,
      status = 'PENDING',
      projectId,
      fileSize,
      width,
      height,
      metadata
    } = body;

    if (!filename || !originalUrl || !processType) {
      return NextResponse.json(
        { error: '缺少必要参数：filename, originalUrl, processType' },
        { status: 400 }
      );
    }

    // 如果指定了项目ID，验证项目是否存在且属于当前用户
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: session.user.id
        }
      });

      if (!project) {
        return NextResponse.json(
          { error: '指定的项目不存在' },
          { status: 400 }
        );
      }
    }

    // 创建图片记录
    const image = await prisma.processedImage.create({
      data: {
        filename,
        originalUrl,
        processedUrl,
        thumbnailUrl,
        processType,
        status,
        fileSize,
        width,
        height,
        metadata,
        userId: session.user.id,
        projectId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      image
    });

  } catch (error) {
    // console.error('Create image error:', error);
    return NextResponse.json(
      { error: '创建图片记录失败' },
      { status: 500 }
    );
  }
}

// 批量操作图片
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { imageIds, action, data } = body;

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return NextResponse.json(
        { error: '缺少图片ID列表' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: '缺少操作类型' },
        { status: 400 }
      );
    }

    // 验证所有图片都属于当前用户
    const images = await prisma.processedImage.findMany({
      where: {
        id: { in: imageIds },
        userId: session.user.id
      }
    });

    if (images.length !== imageIds.length) {
      return NextResponse.json(
        { error: '部分图片不存在或无权限操作' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'move': {
        const { projectId } = data;
        
        // 如果移动到项目，验证项目存在
        if (projectId) {
          const project = await prisma.project.findFirst({
            where: {
              id: projectId,
              userId: session.user.id
            }
          });

          if (!project) {
            return NextResponse.json(
              { error: '目标项目不存在' },
              { status: 400 }
            );
          }
        }

        result = await prisma.processedImage.updateMany({
          where: {
            id: { in: imageIds },
            userId: session.user.id
          },
          data: { projectId }
        });
        break;
      }

      case 'delete': {
        result = await prisma.processedImage.deleteMany({
          where: {
            id: { in: imageIds },
            userId: session.user.id
          }
        });
        break;
      }

      case 'update_status': {
        const { status } = data;
        if (!status) {
          return NextResponse.json(
            { error: '缺少状态参数' },
            { status: 400 }
          );
        }

        result = await prisma.processedImage.updateMany({
          where: {
            id: { in: imageIds },
            userId: session.user.id
          },
          data: { status }
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: '不支持的操作类型' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      affected: result.count,
      message: `成功操作 ${result.count} 张图片`
    });

  } catch (error) {
    // console.error('Batch update images error:', error);
    return NextResponse.json(
      { error: '批量操作失败' },
      { status: 500 }
    );
  }
}