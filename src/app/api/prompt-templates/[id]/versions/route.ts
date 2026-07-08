import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createVersionSchema = z.object({
  content: z.string().min(1, '版本内容不能为空'),
  label: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
  activate: z.boolean().optional(), // 创建后是否立即设为当前版本
});

/** 解析当前用户 + 校验模板归属，复用现有范式 */
async function resolveOwnedTemplate(templateId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: '未授权' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return { error: NextResponse.json({ error: '用户不存在' }, { status: 404 }) };
  }
  const template = await prisma.promptTemplate.findFirst({ where: { id: templateId, userId: user.id } });
  if (!template) {
    return { error: NextResponse.json({ error: '模板不存在' }, { status: 404 }) };
  }
  return { user, template };
}

/** GET /api/prompt-templates/[id]/versions —— 列出该模板全部版本（新到旧） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owned = await resolveOwnedTemplate(id);
    if (owned.error) return owned.error;

    const versions = await prisma.promptTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { versionNo: 'desc' },
    });

    return NextResponse.json({ versions, activeVersionId: owned.template.activeVersionId });
  } catch (error) {
    console.error('获取提示词版本失败:', error);
    return NextResponse.json({ error: '获取提示词版本失败' }, { status: 500 });
  }
}

/** POST /api/prompt-templates/[id]/versions —— 新建版本（versionNo 自增，可选立即激活） */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const owned = await resolveOwnedTemplate(id);
    if (owned.error) return owned.error;
    const { user, template } = owned;

    const body = await request.json();
    const data = createVersionSchema.parse(body);

    // 模板内自增版本号
    const latest = await prisma.promptTemplateVersion.findFirst({
      where: { templateId: id },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    const versionNo = (latest?.versionNo ?? 0) + 1;

    const version = await prisma.promptTemplateVersion.create({
      data: {
        templateId: id,
        userId: user.id,
        versionNo,
        content: data.content,
        label: data.label,
        note: data.note,
      },
    });

    // 可选：创建后立即设为当前版本（同步镜像回 template.prompt）
    if (data.activate) {
      await prisma.promptTemplate.update({
        where: { id: template.id },
        data: { activeVersionId: version.id, prompt: version.content },
      });
    }

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }
    console.error('创建提示词版本失败:', error);
    return NextResponse.json({ error: '创建提示词版本失败' }, { status: 500 });
  }
}
