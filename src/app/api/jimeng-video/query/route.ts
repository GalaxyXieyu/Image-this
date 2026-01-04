import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryVideoTask } from '../service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const taskId = request.nextUrl.searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ success: false, error: '缺少taskId参数' }, { status: 400 });
    }

    const result = await queryVideoTask(user.id, taskId);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[视频生成] 查询失败:', error);
    const message = error instanceof Error ? error.message : '查询失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
