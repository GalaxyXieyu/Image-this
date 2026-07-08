import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/prompt-templates/[id]/versions/[versionId]/activate
 * 择优保存：把该版本设为模板的当前生效版本，并把内容镜像回 template.prompt。
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    const template = await prisma.promptTemplate.findFirst({ where: { id, userId: user.id } });
    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    const version = await prisma.promptTemplateVersion.findFirst({ where: { id: versionId, templateId: id } });
    if (!version) {
      return NextResponse.json({ error: '版本不存在' }, { status: 404 });
    }

    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: { activeVersionId: version.id, prompt: version.content },
    });

    return NextResponse.json({ template: updated, activeVersionId: version.id });
  } catch (error) {
    console.error('切换当前版本失败:', error);
    return NextResponse.json({ error: '切换当前版本失败' }, { status: 500 });
  }
}
