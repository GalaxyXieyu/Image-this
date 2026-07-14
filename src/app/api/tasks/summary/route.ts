import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const statusCounts = await prisma.taskQueue.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true },
    });

    const status = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const item of statusCounts) {
      const count = item._count.status;
      status.total += count;
      if (item.status === 'PENDING') status.pending = count;
      if (item.status === 'PROCESSING') status.processing = count;
      if (item.status === 'COMPLETED') status.completed = count;
      if (item.status === 'FAILED') status.failed = count;
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error('Get task summary error:', error);
    return NextResponse.json({ error: '获取任务摘要失败' }, { status: 500 });
  }
}
