import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '项目名称不能为空' },
        { status: 400 }
      );
    }

    // 检查是否已存在同名项目
    const existingProject = await prisma.project.findFirst({
      where: {
        name: name.trim(),
        userId: session.user.id
      }
    });

    if (existingProject) {
      return NextResponse.json(
        { error: '已存在同名项目' },
        { status: 400 }
      );
    }

    // 创建项目
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            processedImages: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      project
    });

  } catch (error) {
    // console.error('Create project error:', error);
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    );
  }
}

// 获取用户的项目列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const where: any = {
      userId: session.user.id
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // 查询项目
    const projects = await prisma.project.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            processedImages: true,
            taskQueue: true
          }
        }
      }
    });

    // 获取总数
    const total = await prisma.project.count({ where });

    return NextResponse.json({
      success: true,
      projects,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    // console.error('Get projects error:', error);
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}