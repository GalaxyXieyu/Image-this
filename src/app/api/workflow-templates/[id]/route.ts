import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 更新工作流模板的验证 Schema
const updateWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.record(z.any())).optional(),
  globalParams: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/workflow-templates/[id]
 * 获取单个工作流模板详情
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

    const template = await prisma.workflowTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    // 反序列化返回
    return NextResponse.json({
      template: {
        ...template,
        steps: JSON.parse(template.steps),
        globalParams: template.globalParams
          ? JSON.parse(template.globalParams)
          : null,
        tags: template.tags ? JSON.parse(template.tags) : [],
      },
    });
  } catch (error) {
    console.error('获取工作流模板失败:', error);
    return NextResponse.json(
      { error: '获取工作流模板失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflow-templates/[id]
 * 更新工作流模板
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
    const existingTemplate = await prisma.workflowTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateWorkflowTemplateSchema.parse(body);

    // 如果设置为默认模板，先取消其他默认模板的状态
    if (validatedData.isDefault && !existingTemplate.isDefault) {
      await prisma.workflowTemplate.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 准备更新数据，只有提供了值才更新
    const updateData: any = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description;
    if (validatedData.category !== undefined)
      updateData.category = validatedData.category;
    if (validatedData.steps !== undefined)
      updateData.steps = JSON.stringify(validatedData.steps);
    if (validatedData.globalParams !== undefined)
      updateData.globalParams = validatedData.globalParams
        ? JSON.stringify(validatedData.globalParams)
        : null;
    if (validatedData.tags !== undefined)
      updateData.tags = validatedData.tags
        ? JSON.stringify(validatedData.tags)
        : null;
    if (validatedData.isDefault !== undefined)
      updateData.isDefault = validatedData.isDefault;

    // 更新模板
    const template = await prisma.workflowTemplate.update({
      where: { id },
      data: updateData,
    });

    // 反序列化返回
    return NextResponse.json({
      template: {
        ...template,
        steps: JSON.parse(template.steps),
        globalParams: template.globalParams
          ? JSON.parse(template.globalParams)
          : null,
        tags: template.tags ? JSON.parse(template.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    console.error('更新工作流模板失败:', error);
    return NextResponse.json(
      { error: '更新工作流模板失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow-templates/[id]
 * 删除工作流模板
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
    const template = await prisma.workflowTemplate.findFirst({
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
    await prisma.workflowTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除工作流模板失败:', error);
    return NextResponse.json(
      { error: '删除工作流模板失败' },
      { status: 500 }
    );
  }
}
