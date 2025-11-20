import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteImage } from '@/lib/storage';

// 获取单个图片详情
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
    const image = await prisma.processedImage.findFirst({
      where: {
        id,
        userId: session.user.id
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

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      image
    });

  } catch (error) {
    // console.error('Get image error:', error);
    return NextResponse.json(
      { error: '获取图片详情失败' },
      { status: 500 }
    );
  }
}

// 更新图片信息
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { filename, status, projectId, metadata } = body;
    const { id } = await params;

    // 验证图片是否存在且属于当前用户
    const existingImage = await prisma.processedImage.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existingImage) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
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

    // 更新图片信息
    const updatedImage = await prisma.processedImage.update({
      where: { id },
      data: {
        ...(filename && { filename }),
        ...(status && { status }),
        ...(projectId !== undefined && { projectId }),
        ...(metadata && { metadata })
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
      image: updatedImage
    });

  } catch (error) {
    // console.error('Update image error:', error);
    return NextResponse.json(
      { error: '更新图片信息失败' },
      { status: 500 }
    );
  }
}

// 删除图片
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
    // 验证图片是否存在且属于当前用户
    const image = await prisma.processedImage.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!image) {
      return NextResponse.json(
        { error: '图片不存在' },
        { status: 404 }
      );
    }

    // 从MinIO删除图片文件
    const extractObjectName = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        // 移除开头的 /bucket-name/ 部分，只保留对象名称
        const parts = pathname.split('/');
        if (parts.length >= 3) {
          return parts.slice(2).join('/'); // 跳过空字符串和bucket名称
        }
        return null;
      } catch (error) {
        return null;
      }
    };

    try {
      if (image.originalUrl && image.originalUrl.includes('minio')) {
        const originalObjectName = extractObjectName(image.originalUrl);
        if (originalObjectName) {
          await deleteImage(originalObjectName);
        }
      }

      if (image.processedUrl && image.processedUrl.includes('minio')) {
        const processedObjectName = extractObjectName(image.processedUrl);
        if (processedObjectName) {
          await deleteImage(processedObjectName);
        }
      }

      if (image.thumbnailUrl && image.thumbnailUrl.includes('minio')) {
        const thumbnailObjectName = extractObjectName(image.thumbnailUrl);
        if (thumbnailObjectName) {
          await deleteImage(thumbnailObjectName);
        }
      }
    } catch (minioError) {
      // console.error('删除MinIO文件失败:', minioError);
      // 继续删除数据库记录，即使MinIO删除失败
    }

    // 从数据库删除记录
    await prisma.processedImage.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: '图片删除成功'
    });

  } catch (error) {
    // console.error('Delete image error:', error);
    return NextResponse.json(
      { error: '删除图片失败' },
      { status: 500 }
    );
  }
}
