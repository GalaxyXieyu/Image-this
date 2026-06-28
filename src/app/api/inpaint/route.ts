import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { saveInputAsset } from '@/lib/storage';
import { getInternalWorkerUrl } from '@/lib/internal-worker-url';

type InpaintAction = 'inpaint' | 'remove' | 'enhance';
type InpaintStrength = 'low' | 'medium' | 'high';

function dataUrlToBuffer(input: string): { buffer: Buffer; mimeType: string } | null {
  if (!input.startsWith('data:')) return null;
  const comma = input.indexOf(',');
  if (comma < 0) return null;
  const header = input.slice(5, comma); // e.g. image/png;base64
  const mimeType = header.split(';')[0] || 'image/png';
  return { mimeType, buffer: Buffer.from(input.slice(comma + 1), 'base64') };
}

/**
 * 创建一个局部重绘（圈画 / mask）任务。
 * 客户端传入原图与蒙版的 data URL，这里落盘成 input asset（保持 inputData 轻量），
 * 再创建 INPAINT 任务交给 worker 异步处理。
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
      maskDataUrl,
      sourceImageUrl,
      prompt = '',
      action = 'inpaint',
      strength = 'medium',
      provider = 'gemini',
      modelName,
      projectId,
    } = body as {
      imageDataUrl?: string;
      maskDataUrl?: string;
      sourceImageUrl?: string;
      prompt?: string;
      action?: InpaintAction;
      strength?: InpaintStrength;
      provider?: string;
      modelName?: string;
      projectId?: string;
    };

    if (!imageDataUrl || !maskDataUrl) {
      return NextResponse.json({ error: '缺少原图或蒙版数据' }, { status: 400 });
    }

    const source = dataUrlToBuffer(imageDataUrl);
    const mask = dataUrlToBuffer(maskDataUrl);
    if (!source || !mask) {
      return NextResponse.json({ error: '原图或蒙版格式不正确' }, { status: 400 });
    }

    const stamp = Date.now();
    const sourceExt = source.mimeType.includes('png') ? 'png' : 'jpg';
    const [inputAsset, maskAsset] = await Promise.all([
      saveInputAsset(source.buffer, `inpaint-src-${stamp}.${sourceExt}`, source.mimeType, userId),
      saveInputAsset(mask.buffer, `inpaint-mask-${stamp}.png`, 'image/png', userId),
    ]);

    const inputData = JSON.stringify({
      workflowType: 'inpaint',
      inputAsset,
      maskAsset,
      imageUrl: sourceImageUrl || inputAsset.clientUrl,
      prompt,
      action,
      strength,
      provider,
      modelName,
    });

    const task = await prisma.taskQueue.create({
      data: {
        type: 'INPAINT',
        inputData,
        priority: 2,
        totalSteps: 1,
        userId,
        projectId: projectId || undefined,
        currentStep: '任务已创建，等待处理',
        contractVersion: 2,
        workflowType: 'inpaint',
        handlerName: 'inpaint',
      },
    });

    // 触发 worker（loopback，避免 http→https 301 把 POST 降级为 GET）
    const workerUrl = getInternalWorkerUrl(request);
    void fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true, maxTasks: 1, taskIds: [task.id] }),
    }).catch((error) => {
      console.error('[局部重绘] 自动触发 worker 失败:', error);
    });

    return NextResponse.json({ success: true, taskId: task.id });
  } catch (error) {
    console.error('[局部重绘] 创建任务失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建任务失败' },
      { status: 500 }
    );
  }
}
