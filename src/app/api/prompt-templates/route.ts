import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 创建提示词模板的验证 Schema
const createPromptTemplateSchema = z.object({
  name: z.string().min(1, '模板名称不能为空').max(100, '模板名称不能超过100个字符'),
  description: z.string().optional(),
  category: z.enum(['BACKGROUND_REPLACE', 'OUTPAINT', 'UPSCALE', 'ONE_CLICK'], {
    errorMap: () => ({ message: '无效的模板分类' })
  }),
  prompt: z.string().min(1, '提示词内容不能为空'),
  isDefault: z.boolean().optional().default(false),
});

// 更新提示词模板的验证 Schema
const updatePromptTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  prompt: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/prompt-templates
 * 获取用户的提示词模板列表
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

    // 获取用户的模板
    const templates = await prisma.promptTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // 默认模板排在前面
        { isSystem: 'desc' },  // 系统模板排在前面
        { createdAt: 'desc' }, // 最新的排在前面
      ],
    });

    // 如果需要包含系统模板且没有找到任何模板，创建默认系统模板
    if (includeSystem && templates.length === 0) {
      const systemTemplates = await createDefaultTemplates(user.id);
      return NextResponse.json({ templates: systemTemplates });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    return NextResponse.json(
      { error: '获取提示词模板失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompt-templates
 * 创建新的提示词模板
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
    const validatedData = createPromptTemplateSchema.parse(body);

    // 如果设置为默认模板，先取消同分类下其他模板的默认状态
    if (validatedData.isDefault) {
      await prisma.promptTemplate.updateMany({
        where: {
          userId: user.id,
          category: validatedData.category,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 创建新模板
    const template = await prisma.promptTemplate.create({
      data: {
        ...validatedData,
        userId: user.id,
        isSystem: false, // 用户创建的模板不是系统模板
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    console.error('创建提示词模板失败:', error);
    return NextResponse.json(
      { error: '创建提示词模板失败' },
      { status: 500 }
    );
  }
}

/**
 * 创建默认系统模板
 */
async function createDefaultTemplates(userId: string) {
  const defaultTemplates = [
    {
      name: '背景替换 - 默认',
      description: '保持产品主体不变，仅替换背景',
      category: 'BACKGROUND_REPLACE',
      prompt: '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率',
      isDefault: true,
      isSystem: true,
    },
    {
      name: '扩图 - 默认',
      description: '自然延伸背景，保持风格一致',
      category: 'OUTPAINT',
      prompt: '扩展图像，保持产品主体和风格完全一致，自然延伸背景',
      isDefault: true,
      isSystem: true,
    },
    {
      name: '一键增强 - 默认',
      description: '综合处理：背景替换 + 扩图 + 高清化',
      category: 'ONE_CLICK',
      prompt: '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率。扩图时：扩展图像，保持产品主体和风格完全一致，自然延伸背景',
      isDefault: true,
      isSystem: true,
    },
  ];

  const createdTemplates = await Promise.all(
    defaultTemplates.map((template) =>
      prisma.promptTemplate.create({
        data: {
          ...template,
          userId,
        },
      })
    )
  );

  return createdTemplates;
}
