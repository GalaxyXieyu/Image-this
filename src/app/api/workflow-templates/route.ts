import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// WorkflowStep 接口定义（与 combo/page.tsx 对齐）
interface WorkflowStep {
  id: string;
  order: number;
  type: string; // "scene" | "background" | "upscale" | "watermark" | "outpaint" | 为 Phase 3 预留 "workflow"
  name: string;
  description: string;
  params: Record<string, any>;
  refTemplateId?: string; // Phase 3 预留：嵌套模板引用
}

// 创建工作流模板的验证 Schema
const createWorkflowTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符'),
  description: z.string().optional(),
  category: z.string().optional(),
  steps: z.array(z.record(z.any())).min(1, '工作流步骤不能为空'),
  globalParams: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  isDefault: z.boolean().optional().default(false),
});

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
 * GET /api/workflow-templates
 * 获取用户的工作流模板列表
 * 查询参数:
 * - category: 按分类筛选 (可选)
 * - includeSystem: 是否包含系统预设模板 (默认 true)
 */
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    // 构建查询条件
    const where: any = {
      userId: user.id,
    };

    if (category) {
      where.category = category;
    }

    // 获取用户的模板（包含系统模板）
    const templates = await prisma.workflowTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // 默认模板排在前面
        { isSystem: 'desc' },  // 系统模板排在前面
        { createdAt: 'desc' }, // 最新的排在前面
      ],
    });

    // 反序列化 steps 和 globalParams
    const parsedTemplates = templates.map(t => ({
      ...t,
      steps: JSON.parse(t.steps),
      globalParams: t.globalParams ? JSON.parse(t.globalParams) : null,
      tags: t.tags ? JSON.parse(t.tags) : [],
    }));

    return NextResponse.json({ templates: parsedTemplates });
  } catch (error) {
    console.error('获取工作流模板失败:', error);
    return NextResponse.json(
      { error: '获取工作流模板失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflow-templates
 * 创建新的工作流模板
 */
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validatedData = createWorkflowTemplateSchema.parse(body);

    // 如果设置为默认模板，先取消其他默认模板的状态
    if (validatedData.isDefault) {
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

    // 序列化 steps 和 globalParams
    const template = await prisma.workflowTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        steps: JSON.stringify(validatedData.steps),
        globalParams: validatedData.globalParams
          ? JSON.stringify(validatedData.globalParams)
          : null,
        tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
        isDefault: validatedData.isDefault,
        userId: user.id,
        isSystem: false, // 用户创建的模板不是系统模板
      },
    });

    // 返回时反序列化
    return NextResponse.json(
      {
        template: {
          ...template,
          steps: JSON.parse(template.steps),
          globalParams: template.globalParams
            ? JSON.parse(template.globalParams)
            : null,
          tags: template.tags ? JSON.parse(template.tags) : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    console.error('创建工作流模板失败:', error);
    return NextResponse.json(
      { error: '创建工作流模板失败' },
      { status: 500 }
    );
  }
}
