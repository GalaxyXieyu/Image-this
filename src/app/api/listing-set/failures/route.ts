/**
 * 套图失败 feed —— 供图库展示失败/部分失败的占位卡与「重试缺失」。
 * 覆盖两类：
 *  - 整套失败：status='FAILED'
 *  - 部分失败：status='COMPLETED' 且 outputData.failed > 0
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeImageUrlForClient } from '@/lib/image-url';
import { mapProviderErrorMessage } from '@/lib/provider-error-utils';

function deriveOriginalUrl(inputData: string | null, fallback?: string | null): string | null {
  if (fallback) return normalizeImageUrlForClient(fallback) || fallback;
  if (!inputData) return null;
  try {
    const d = JSON.parse(inputData) as Record<string, unknown> & {
      inputAsset?: { clientUrl?: string; url?: string };
    };
    return normalizeImageUrlForClient(
      (d.imageUrl as string) ||
        (d.originalUrl as string) ||
        d.inputAsset?.clientUrl ||
        d.inputAsset?.url ||
        null
    );
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const tasks = await prisma.taskQueue.findMany({
      where: {
        userId: session.user.id,
        type: 'LISTING_SET',
        status: { in: ['FAILED', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: {
        id: true,
        status: true,
        errorMessage: true,
        createdAt: true,
        inputData: true,
        outputData: true,
        processedImage: { select: { originalUrl: true } },
      },
    });

    const failures = [];
    for (const t of tasks) {
      let total: number | null = null;
      let failed = 0;
      let setId: string | null = null;
      let partialError: string | null = null;
      if (t.outputData) {
        try {
          const o = JSON.parse(t.outputData) as {
            total?: number | null;
            failed?: number | null;
            setId?: string | null;
            partialError?: string | null;
          };
          total = o.total ?? null;
          failed = o.failed ?? 0;
          setId = o.setId ?? null;
          partialError = o.partialError ?? null;
        } catch {
          // ignore
        }
      }

      const isTotalFail = t.status === 'FAILED';
      const isPartialFail = t.status === 'COMPLETED' && failed > 0;
      if (!isTotalFail && !isPartialFail) continue;

      failures.push({
        id: t.id,
        setId,
        status: t.status,
        total,
        failed: isTotalFail && !failed ? total : failed,
        reason: (() => {
          const raw = partialError || t.errorMessage;
          return raw ? mapProviderErrorMessage(raw) : null;
        })(),
        originalImageUrl: deriveOriginalUrl(t.inputData, t.processedImage?.originalUrl),
        createdAt: t.createdAt,
      });
    }

    return NextResponse.json({ success: true, failures });
  } catch (error) {
    console.error('Get listing-set failures error:', error);
    return NextResponse.json({ error: '获取失败任务失败' }, { status: 500 });
  }
}
