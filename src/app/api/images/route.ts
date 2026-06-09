import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkImageExists, deleteImage } from '@/lib/storage';
import { normalizeImageUrlForClient } from '@/lib/image-url';

// 图片查询结果类型
interface ImageQueryResult {
  id: string;
  filename: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  processType: string;
  status: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  qualityScore: number | null;
  createdAt: Date;
  metadata?: string | null;
  project: {
    id: string;
    name: string;
  } | null;
  taskQueue?: {
    id: string;
    status: string;
    type: string;
  }[];
}

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
    const processTypes = searchParams.get('processTypes'); // 支持多个类型过滤
    // 限制最大返回数量，防止单次查询过多数据
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    // 图片尺寸优化参数
    const includeFullSize = searchParams.get('includeFullSize') === 'true'; // 是否包含完整尺寸图片
    // 文件存在性验证（默认关闭，可通过参数开启）
    // 注意：开启后会验证本地文件是否存在，不存在的记录会被自动清理
    const checkFiles = searchParams.get('checkFiles') === 'true';

    // 构建查询条件
    const where: any = {
      userId: session.user.id,
      // 默认只返回成功的图片
      status: status || 'COMPLETED'
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

    // status 参数已在初始化时处理
    if (status && status !== 'COMPLETED') {
      where.status = status;
    }

    if (type) {
      where.processType = type;
    }

    // 支持多个processType过滤
    if (processTypes) {
      const typesArray = processTypes.split(',').filter(Boolean);
      if (typesArray.length > 0) {
        where.processType = {
          in: typesArray
        };
      }
    }

    // 为了正确过滤不存在的文件，我们需要多查询一些数据
    // 因为可能有些图片文件不存在，需要过滤掉
    const queryLimit = checkFiles ? limit * 2 : limit; // 查询更多以弥补可能被过滤的数量
    
    // 查询图片 - 使用固定的 select 避免类型推断问题
    const rawImages = await prisma.processedImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: queryLimit,
      skip: offset,
      select: {
        id: true,
        filename: true,
        thumbnailUrl: true,
        originalUrl: true,
        processedUrl: true,
        processType: true,
        status: true,
        fileSize: true,
        width: true,
        height: true,
        qualityScore: true,
        createdAt: true,
        metadata: true,
        project: {
          select: {
            id: true,
            name: true
          }
        },
        taskQueue: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            type: true
          }
        }
      }
    });
    
    let images: ImageQueryResult[] = rawImages as ImageQueryResult[];

    // 验证本地文件是否存在，过滤掉不存在的图片
    if (checkFiles && images.length > 0) {
      const validImages: ImageQueryResult[] = [];
      const invalidImageIds: string[] = [];
      
      for (const image of images) {
        // 检查处理后的图片或原图是否存在
        const urlToCheck = image.processedUrl || image.originalUrl;
        
        // 如果没有 URL，视为无效
        if (!urlToCheck) {
          invalidImageIds.push(image.id);
          continue;
        }
        
        const exists = await checkImageExists(urlToCheck, session.user.id);
        
        if (exists) {
          validImages.push(image);
        } else {
          invalidImageIds.push(image.id);
        }
        
        // 如果已经收集够了有效图片，就停止
        if (validImages.length >= limit) {
          break;
        }
      }
      
      // 异步清理不存在文件的数据库记录（不阻塞响应）
      if (invalidImageIds.length > 0) {
        // 使用 setImmediate 或 Promise 异步删除，不阻塞响应
        prisma.processedImage.deleteMany({
          where: { id: { in: invalidImageIds } }
        }).catch(err => {
          console.error('清理无效图片记录失败:', err);
        });
      }
      
      images = validImages;
    }

    // 限制返回数量
    images = images.slice(0, limit);

    // 统一 URL，避免 /uploads 在某些部署环境中无法直接访问
    images = images.map((img) => ({
      ...img,
      originalUrl: normalizeImageUrlForClient(img.originalUrl),
      processedUrl: normalizeImageUrlForClient(img.processedUrl),
      thumbnailUrl: normalizeImageUrlForClient(img.thumbnailUrl),
    }));
    
    const finalImages = includeFullSize
      ? images
      : images.map(img => {
          const { originalUrl, processedUrl, metadata, ...rest } = img;
          return rest;
        });

    // 获取总数（这个总数可能包含文件不存在的记录，但作为近似值使用）
    const total = await prisma.processedImage.count({ where });

    return NextResponse.json({
      success: true,
      images: finalImages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: finalImages.length === limit // 基于实际返回的数量判断
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

    const deleteImageFiles = async (imagesToDelete: { originalUrl: string | null; processedUrl: string | null; thumbnailUrl: string | null }[]) => {
      const extractFilename = (url: string): string | null => {
        try {
          return url.startsWith('/') ? url.substring(1) : url;
        } catch {
          return url;
        }
      };

      for (const image of imagesToDelete) {
        for (const url of [image.originalUrl, image.processedUrl, image.thumbnailUrl]) {
          if (!url) continue;
          try {
            const filename = extractFilename(url);
            if (filename) {
              await deleteImage(filename, session.user.id);
            }
          } catch (deleteError) {
            console.error('删除图片文件失败:', deleteError);
          }
        }
      }
    };

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
        await deleteImageFiles(images);
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
