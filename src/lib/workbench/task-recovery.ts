/**
 * 全局任务断点恢复核心（类型感知）。
 * - 服务重启 / 进程被杀会把长任务冻结在 PROCESSING（进程内超时看门狗随进程消失）。
 * - boot 模式：所有 PROCESSING 都恢复（进程确已重启）。
 * - sweep 模式：仅回收「updatedAt 超过 STALE_MS 无心跳」的 PROCESSING，避免误杀在跑任务。
 *
 * 恢复策略按类型：
 * - LISTING_SET（多产出、持久化分步）：原子把原任务置 COMPLETED（保留已成功的图），
 *   再用同一 setId 新建「只含缺失张」的续跑任务 —— 不重复已成功的、不重复计费。
 * - 其它类型（单产出/多步链）：整体重跑安全，沿用「重置 PENDING + retryCount，超限则 FAILED」。
 * 所有状态变更用 updateMany 原子守卫（count===1 才生效），防多实例/多次 sweep 重复处理。
 */

import { prisma } from '@/lib/prisma';
import { createListingSetResumeTask } from '@/lib/workbench/listing-set-resume';

const STALE_MS = 5 * 60 * 1000; // 5 分钟无心跳视为掉线（安全高于单张出图耗时）

function workerBaseUrl(): string {
  // 不能用 NEXTAUTH_URL 公网地址自调用：生产 nginx 会把 http POST 301 到 https，
  // fetch 跟随重定向时 POST 降级为 GET，worker 只回状态不处理任务（同 internal-worker-url.ts）。
  // 必须走 127.0.0.1 回环直连本进程；端口取 PORT，退化时从 NEXTAUTH_URL 解析（本地 dev 未设 PORT）。
  const portFromEnv = process.env.PORT;
  const portFromAuthUrl = (() => {
    try {
      return new URL(process.env.NEXTAUTH_URL || '').port;
    } catch {
      return '';
    }
  })();
  return `http://127.0.0.1:${portFromEnv || portFromAuthUrl || 3000}`;
}

/** 触发 worker 批处理，排空 PENDING */
export async function pokeWorker(): Promise<void> {
  try {
    await fetch(`${workerBaseUrl()}/api/tasks/worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: true }),
    });
  } catch (e) {
    console.warn('[Task Recovery] 触发 worker 失败:', e);
  }
}

export interface RecoveryResult {
  recovered: number; // 重置为 PENDING 重跑
  resumed: number; // 套图按缺失续跑
  failed: number; // 超过重试上限标记失败
  scanned: number;
}

export async function recoverStuckTasks({ mode }: { mode: 'boot' | 'sweep' }): Promise<RecoveryResult> {
  const result: RecoveryResult = { recovered: 0, resumed: 0, failed: 0, scanned: 0 };
  try {
    const select = {
      id: true,
      type: true,
      status: true,
      retryCount: true,
      maxRetries: true,
      currentStep: true,
      userId: true,
      inputData: true,
      outputData: true,
      priority: true,
      projectId: true,
    } as const;

    const processingWhere =
      mode === 'sweep'
        ? { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - STALE_MS) } }
        : { status: 'PROCESSING' };
    const stuckProcessing = await prisma.taskQueue.findMany({ where: processingWhere, select });

    // 套图残局：被（旧逻辑或其它）盲目重置为 PENDING、但已有部分结果的任务。
    // 直接排空会整体重跑 → 重复已成功的图；这里也按缺失续跑处理。
    const abandonedSets = await prisma.taskQueue.findMany({
      where: { type: 'LISTING_SET', status: 'PENDING', completedSteps: { gt: 0 } },
      select,
    });

    const stuck = [...stuckProcessing, ...abandonedSets];
    result.scanned = stuck.length;
    if (stuck.length === 0) return result;

    console.log(`[Task Recovery] (${mode}) 发现 ${stuck.length} 个中断任务，开始恢复...`);

    for (const task of stuck) {
      if (task.type === 'LISTING_SET') {
        // 原子占用：把原任务（PROCESSING 或残局 PENDING）置 COMPLETED（保留已成功图，按 setId 归组）
        const claimed = await prisma.taskQueue.updateMany({
          where: { id: task.id, status: task.status },
          data: { status: 'COMPLETED', completedAt: new Date(), currentStep: '已中断，自动补齐缺失' },
        });
        if (claimed.count !== 1) continue; // 已被其它 sweeper 处理
        try {
          const resume = await createListingSetResumeTask(task);
          if (resume) {
            result.resumed++;
            console.log(`[Task Recovery] 套图 ${task.id} → 续跑缺失 ${resume.missingTotal} 张 (新任务 ${resume.id}, setId ${resume.setId})`);
          } else {
            console.log(`[Task Recovery] 套图 ${task.id} 无缺失，直接标记完成`);
          }
        } catch (e) {
          console.warn(`[Task Recovery] 套图 ${task.id} 续跑失败:`, e);
        }
        continue;
      }

      // 其它类型：整体重跑（这些只来自 PROCESSING 扫描）
      const retryCount = task.retryCount ?? 0;
      const maxRetries = task.maxRetries ?? 3;
      if (retryCount < maxRetries) {
        const claimed = await prisma.taskQueue.updateMany({
          where: { id: task.id, status: task.status },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            progress: 0,
            startedAt: null,
            currentStep: `任务恢复中（第 ${retryCount + 1} 次重试）`,
            errorMessage: `服务中断导致任务中断，自动重试 (${retryCount + 1}/${maxRetries})`,
          },
        });
        if (claimed.count === 1) result.recovered++;
      } else {
        const claimed = await prisma.taskQueue.updateMany({
          where: { id: task.id, status: task.status },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `任务重试次数已达上限 (${maxRetries} 次)`,
            currentStep: '重试次数已达上限',
          },
        });
        if (claimed.count === 1) result.failed++;
      }
    }

    console.log(
      `[Task Recovery] (${mode}) 完成：重跑 ${result.recovered}、套图续跑 ${result.resumed}、失败 ${result.failed}`
    );

    if (result.recovered > 0 || result.resumed > 0) {
      // boot 稍等服务完全起来再触发；sweep 立即触发
      setTimeout(() => void pokeWorker(), mode === 'boot' ? 2000 : 0);
    }
  } catch (error) {
    const maybePrisma = error as { code?: string };
    if (maybePrisma?.code === 'P2021') {
      console.warn('[Task Recovery] 数据库表不存在，跳过任务恢复（请先 npx prisma db push）');
      return result;
    }
    console.error('[Task Recovery] 恢复任务时出错:', error);
  }
  return result;
}
