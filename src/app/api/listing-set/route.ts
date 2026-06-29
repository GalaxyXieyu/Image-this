import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveInputAsset } from '@/lib/storage';
import { getInternalWorkerUrl } from '@/lib/internal-worker-url';
import { LISTING_TYPES, type ListingProductInfo } from '@/lib/workbench/listing-set';

function dataUrlToBuffer(input: string): { buffer: Buffer; mimeType: string } | null {
  if (!input.startsWith('data:')) return null;
  const comma = input.indexOf(',');
  if (comma < 0) return null;
  const mimeType = input.slice(5, comma).split(';')[0] || 'image/png';
  return { mimeType, buffer: Buffer.from(input.slice(comma + 1), 'base64') };
}

/**
 * AI 商品套图：上传一张商品图，一次性创建 5 个套图任务（每类一张），
 * 共享同一个 setId，便于前端按套分组展示。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    const userId = session.user.id;

    const body = await request.json();
    const {
      imageDataUrl,
      product = {},
      provider = 'gemini',
      modelName,
      types,
      projectId,
    } = body as {
      imageDataUrl?: string;
      product?: ListingProductInfo;
      provider?: string;
      modelName?: string;
      types?: string[];
      projectId?: string;
    };

    if (!imageDataUrl) {
      return NextResponse.json({ error: '缺少商品图' }, { status: 400 });
    }
    const decoded = dataUrlToBuffer(imageDataUrl);
    if (!decoded) {
      return NextResponse.json({ error: '商品图格式不正确' }, { status: 400 });
    }

    const stamp = Date.now();
    const ext = decoded.mimeType.includes('png') ? 'png' : 'jpg';
    const inputAsset = await saveInputAsset(
      decoded.buffer,
      `listing-src-${stamp}.${ext}`,
      decoded.mimeType,
      userId
    );

    const setId = `set-${stamp}`;
    const selectedTypes = LISTING_TYPES.filter(
      (t) => !types || types.length === 0 || types.includes(t.type)
    ).map((t) => t.type);

    // 单任务：worker 内部串行生成 5 张，尊重 provider 并发限制
    const task = await prisma.taskQueue.create({
      data: {
        type: 'LISTING_SET',
        inputData: JSON.stringify({
          workflowType: 'listing_set',
          inputAsset,
          imageUrl: inputAsset.clientUrl,
          setId,
          types: selectedTypes,
          product,
          provider,
          modelName,
        }),
        priority: 2,
        totalSteps: selectedTypes.length,
        userId,
        projectId: projectId || undefined,
        currentStep: '任务已创建，等待处理',
        contractVersion: 2,
        workflowType: 'listing_set',
        handlerName: 'listing_set',
      },
    });

    const workerUrl = getInternalWorkerUrl(request);
    void fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true, maxTasks: 1, taskIds: [task.id] }),
    }).catch((error) => {
      console.error('[商品套图] 自动触发 worker 失败:', error);
    });

    return NextResponse.json({
      success: true,
      setId,
      taskId: task.id,
      types: LISTING_TYPES.filter((t) => selectedTypes.includes(t.type)),
    });
  } catch (error) {
    console.error('[商品套图] 创建任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建任务失败' },
      { status: 500 }
    );
  }
}
