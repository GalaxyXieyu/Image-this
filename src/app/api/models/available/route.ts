import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserConfig } from '@/lib/user-config';

/**
 * GET /api/models/available
 * 返回当前用户已启用的「生图模型」清单（provider + modelName），供对比工作室多选。
 * 只下发模型标识，不下发任何密钥/baseUrl。
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    const config = await getUserConfig(user.id);
    const models: { provider: string; modelName: string }[] = [];

    const collect = (provider: string, list?: { id: string; enabled: boolean; kind?: string }[]) => {
      for (const m of list ?? []) {
        if (m.enabled && m.kind !== 'llm') models.push({ provider, modelName: m.id });
      }
    };
    collect('gpt', config.gpt?.models);
    collect('gemini', config.gemini?.models);
    collect('jimeng', config.jimeng?.models);

    return NextResponse.json({ models });
  } catch (error) {
    console.error('获取可用模型失败:', error);
    return NextResponse.json({ error: '获取可用模型失败' }, { status: 500 });
  }
}
