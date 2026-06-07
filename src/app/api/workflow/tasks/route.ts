/**
 * Typed Workflow Task API
 *
 * POST /api/workflow/tasks — Create a typed workflow task
 * GET  /api/workflow/tasks — List tasks with filtering
 *
 * Contract version: 2 (typed workflow contract)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasHandler, getHandlerByWorkflowType } from '@/lib/workbench/worker-handlers';
import { adaptLegacyTaskToSummary } from '@/lib/workbench/api-contract';
import type {
  WorkflowType,
  ToolParameters,
  InputAssetRef,
} from '@/types/workbench';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST — Create typed workflow task
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();

    // Detect batch request
    if (body.items && Array.isArray(body.items)) {
      return createBatchTasks(body, session.user.id, request);
    }

    return createSingleTask(body, session.user.id, request);
  } catch (error) {
    console.error('[Workflow API] Create task error:', error);
    return NextResponse.json(
      { error: '创建任务失败', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function createSingleTask(
  body: Record<string, unknown>,
  userId: string,
  request: NextRequest
) {
  const workflowType = body.workflowType as WorkflowType | undefined;
  const parameters = body.parameters as ToolParameters | undefined;
  const inputAssets = body.inputAssets as InputAssetRef[] | undefined;
  const projectId = body.projectId as string | undefined;
  const priority = typeof body.priority === 'number' ? body.priority : 1;

  if (!workflowType) {
    return NextResponse.json({ error: '缺少必要参数：workflowType' }, { status: 400 });
  }

  if (!parameters) {
    return NextResponse.json({ error: '缺少必要参数：parameters' }, { status: 400 });
  }

  // Validate that a handler exists for this workflow type
  const handler = getHandlerByWorkflowType(workflowType);
  if (!handler) {
    return NextResponse.json(
      { error: `不支持的 workflowType: ${workflowType}` },
      { status: 400 }
    );
  }

  // Build inputData with typed structure
  const inputData = JSON.stringify({
    workflowType,
    parameters,
    inputAssets,
  });

  // Map workflowType to legacy type for backward compatibility
  const legacyType = workflowTypeToLegacyType(workflowType);

  const task = await prisma.taskQueue.create({
    data: {
      type: legacyType,
      inputData,
      priority,
      totalSteps: 1,
      userId,
      projectId: projectId ?? null,
      currentStep: '任务已创建，等待处理',
      contractVersion: 2,
      workflowType,
      handlerName: handler.name,
    },
  });

  triggerWorker(request);

  return NextResponse.json({
    success: true,
    task: adaptLegacyTaskToSummary(task),
  });
}

async function createBatchTasks(
  body: Record<string, unknown>,
  userId: string,
  request: NextRequest
) {
  const workflowType = body.workflowType as WorkflowType | undefined;
  const items = body.items as Array<{ inputAssets: InputAssetRef[]; parameters: ToolParameters }> | undefined;
  const projectId = body.projectId as string | undefined;
  const priority = typeof body.priority === 'number' ? body.priority : 1;

  if (!workflowType) {
    return NextResponse.json({ error: '缺少必要参数：workflowType' }, { status: 400 });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: '缺少必要参数：items' }, { status: 400 });
  }

  const handler = getHandlerByWorkflowType(workflowType);
  if (!handler) {
    return NextResponse.json(
      { error: `不支持的 workflowType: ${workflowType}` },
      { status: 400 }
    );
  }

  const legacyType = workflowTypeToLegacyType(workflowType);

  const taskPromises = items.map(async (item) => {
    const inputData = JSON.stringify({
      workflowType,
      parameters: item.parameters,
      inputAssets: item.inputAssets,
    });

    return prisma.taskQueue.create({
      data: {
        type: legacyType,
        inputData,
        priority,
        totalSteps: 1,
        userId,
        projectId: projectId ?? null,
        currentStep: '任务已创建，等待处理',
        contractVersion: 2,
        workflowType,
        handlerName: handler.name,
      },
    });
  });

  const createdTasks = await Promise.all(taskPromises);
  triggerWorker(request);

  return NextResponse.json({
    success: true,
    tasks: createdTasks.map((task) => adaptLegacyTaskToSummary(task)),
    batchGroup: null, // TODO: create BatchGroup if needed
  });
}

// ---------------------------------------------------------------------------
// GET — List tasks
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const workflowType = searchParams.get('workflowType') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status.toUpperCase();
    if (workflowType) where.workflowType = workflowType;

    const [tasks, total, stats] = await Promise.all([
      prisma.taskQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.taskQueue.count({ where }),
      prisma.taskQueue.groupBy({
        by: ['status'],
        where: { userId: session.user.id },
        _count: { status: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    };
    for (const s of stats) {
      statusCounts[s.status] = s._count.status;
    }

    return NextResponse.json({
      success: true,
      tasks: tasks.map((task) => adaptLegacyTaskToSummary(task)),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats: {
        pending: statusCounts.PENDING,
        processing: statusCounts.PROCESSING,
        completed: statusCounts.COMPLETED,
        failed: statusCounts.FAILED,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    console.error('[Workflow API] List tasks error:', error);
    return NextResponse.json(
      { error: '获取任务列表失败', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function workflowTypeToLegacyType(workflowType: WorkflowType): string {
  const map: Record<string, string> = {
    scene_generation: 'BACKGROUND_REMOVAL',
    background_replace: 'BACKGROUND_REMOVAL',
    watermark: 'WATERMARK',
    upscale: 'IMAGE_UPSCALING',
    outpaint: 'IMAGE_EXPANSION',
    one_click: 'ONE_CLICK_WORKFLOW',
    video_generation: 'VIDEO_GENERATION',
  };
  return map[workflowType] || workflowType;
}

function triggerWorker(request: NextRequest) {
  const workerUrl = new URL('/api/tasks/worker', request.url);
  void fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch: true, maxTasks: 1 }),
  }).catch((error) => {
    console.error('[Workflow API] 自动触发 worker 失败:', error);
  });
}
