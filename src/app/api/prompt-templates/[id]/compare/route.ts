import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getInternalWorkerUrl } from '@/lib/internal-worker-url';
import { z } from 'zod';

// 对比矩阵上限，防止一次跑量过大（成本 + 并发保护）
const MAX_CELLS = 12;

const assetSchema = z.object({
  assetId: z.string(),
  filePath: z.string(),
  clientUrl: z.string(),
  mimeType: z.string().optional(),
  originalFilename: z.string().optional(),
  sizeBytes: z.number().optional(),
});

const compareSchema = z.object({
  inputAsset: assetSchema, // 由 /api/input-assets 上传测试图后返回
  versions: z.array(z.object({ versionId: z.string(), versionNo: z.number(), content: z.string().min(1) })).min(1),
  models: z.array(z.object({ provider: z.string(), modelName: z.string() })).min(1),
  note: z.string().max(200).optional(),
});

/**
 * POST /api/prompt-templates/[id]/compare
 * 展开「版本 × 模型」为多个 background_replace 任务并发提交，落 Comparison + Cell 便于回看/轮询。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const userId = session.user.id;

    const template = await prisma.promptTemplate.findFirst({ where: { id, userId } });
    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 404 });
    }

    const data = compareSchema.parse(await request.json());

    const cellCount = data.versions.length * data.models.length;
    if (cellCount > MAX_CELLS) {
      return NextResponse.json(
        { error: `一次最多对比 ${MAX_CELLS} 格（当前 ${cellCount}），请减少版本或模型数量` },
        { status: 400 }
      );
    }

    // 校验版本归属
    const versionIds = data.versions.map((v) => v.versionId);
    const ownedVersions = await prisma.promptTemplateVersion.findMany({
      where: { id: { in: versionIds }, templateId: id },
      select: { id: true },
    });
    if (ownedVersions.length !== versionIds.length) {
      return NextResponse.json({ error: '存在不属于该模板的版本' }, { status: 400 });
    }

    // 创建对比实验
    const comparison = await prisma.promptComparison.create({
      data: { templateId: id, userId, testImageUrl: data.inputAsset.clientUrl, note: data.note },
    });

    // 展开矩阵：每格 = 一个 background_replace 任务 + 一个 Cell
    const createdTaskIds: string[] = [];
    const cells: { id: string; versionId: string; versionNo: number; provider: string; modelName: string; taskId: string; status: string }[] = [];

    for (const v of data.versions) {
      for (const m of data.models) {
        const inputData = {
          inputAsset: data.inputAsset,
          customPrompt: v.content,
          aiModel: m.modelName,
          provider: m.provider,
          modelName: m.modelName,
        };
        const task = await prisma.taskQueue.create({
          data: {
            // legacy type 必须是 BACKGROUND_REMOVAL（见 WORKFLOW_TO_LEGACY_TYPE），
            // 这样 typed handler 命中则走 handler，未命中也能走 legacy switch 的 BACKGROUND_REMOVAL 兜底
            type: 'BACKGROUND_REMOVAL',
            inputData: JSON.stringify(inputData),
            priority: 1,
            totalSteps: 1,
            userId,
            currentStep: '任务已创建，等待处理',
            contractVersion: 2,
            workflowType: 'background_replace',
            handlerName: 'background_replace',
          },
        });
        const cell = await prisma.promptComparisonCell.create({
          data: {
            comparisonId: comparison.id,
            versionId: v.versionId,
            versionNo: v.versionNo,
            provider: m.provider,
            modelName: m.modelName,
            taskId: task.id,
            status: 'PENDING',
          },
        });
        createdTaskIds.push(task.id);
        cells.push({ id: cell.id, versionId: v.versionId, versionNo: v.versionNo, provider: m.provider, modelName: m.modelName, taskId: task.id, status: 'PENDING' });
      }
    }

    // 触发 worker（loopback，批量）
    const workerUrl = getInternalWorkerUrl(request);
    void fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true, maxTasks: createdTaskIds.length, taskIds: createdTaskIds }),
    }).catch((error) => {
      console.error('[提示词对比] 触发 worker 失败:', error);
    });

    return NextResponse.json({ comparisonId: comparison.id, cells }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.errors }, { status: 400 });
    }
    console.error('创建对比失败:', error);
    return NextResponse.json({ error: '创建对比失败' }, { status: 500 });
  }
}
