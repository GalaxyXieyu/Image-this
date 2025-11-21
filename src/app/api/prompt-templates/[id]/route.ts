import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 更新提示词模板的验证 Schema
const updatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  prompt: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/prompt-templates/[id]
 * 获取单个提示词模板详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const template = await prisma.promptTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    return NextResponse.json(
      { error: '获取提示词模板失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/prompt-templates/[id]
 * 更新提示词模板
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查模板是否存在且属于当前用户
    const existingTemplate = await prisma.promptTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 系统预设模板不允许修改名称和分类
    const body = await request.json();
    const validatedData = updatePromptTemplateSchema.parse(body);

    // 如果设置为默认模板，先取消同分类下其他模板的默认状态
    if (validatedData.isDefault && !existingTemplate.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: {
          userId: user.id,
          category: existingTemplate.category,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 更新模板
    const template = await prisma.promptTemplate.update({
      where: { id },
      data: validatedData,
    });

    return NextResponse.json({ template });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    console.error('更新提示词模板失败:', error);
    return NextResponse.json(
      { error: '更新提示词模板失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompt-templates/[id]
 * 删除提示词模板
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查模板是否存在且属于当前用户
    const template = await prisma.promptTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 系统预设模板不允许删除
    if (template.isSystem) {
      return NextResponse.json(
        { error: '系统预设模板不允许删除' },
        { status: 403 }
      );
    }

    // 删除模板
    await prisma.promptTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除提示词模板失败:', error);
    return NextResponse.json(
      { error: '删除提示词模板失败' },
      { status: 500 }
    );
  }
}
