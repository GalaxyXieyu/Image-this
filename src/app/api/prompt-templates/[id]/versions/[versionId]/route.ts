import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateVersionSchema = z.object({
  label: z.string().max(60).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

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

/** PATCH /api/prompt-templates/[id]/versions/[versionId] —— 改版本名/备注（内容不可变，改内容请新建版本） */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const owned = await resolveOwnedTemplate(id);
    if (owned.error) return owned.error;

    const version = await prisma.promptTemplateVersion.findFirst({ where: { id: versionId, templateId: id } });
    if (!version) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    const data = updateVersionSchema.parse(await request.json());
    const updated = await prisma.promptTemplateVersion.update({
      where: { id: versionId },
      data: { label: data.label ?? undefined, note: data.note ?? undefined },
    });

    return NextResponse.json({ version: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }
    console.error('更新提示词版本失败:', error);
    return NextResponse.json({ error: '更新提示词版本失败' }, { status: 500 });
  }
}

/** DELETE /api/prompt-templates/[id]/versions/[versionId] —— 删除版本（禁止删当前版本 / 最后一个版本） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const owned = await resolveOwnedTemplate(id);
    if (owned.error) return owned.error;

    const version = await prisma.promptTemplateVersion.findFirst({ where: { id: versionId, templateId: id } });
    if (!version) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }
    if (owned.template.activeVersionId === versionId) {
      return NextResponse.json({ error: '不能删除当前生效版本，请先切换到其他版本' }, { status: 400 });
    }
    const count = await prisma.promptTemplateVersion.count({ where: { templateId: id } });
    if (count <= 1) {
      return NextResponse.json({ error: '至少保留一个版本' }, { status: 400 });
    }

    await prisma.promptTemplateVersion.delete({ where: { id: versionId } });
    return NextResponse.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除提示词版本失败:', error);
    return NextResponse.json({ error: '删除提示词版本失败' }, { status: 500 });
  }
}
