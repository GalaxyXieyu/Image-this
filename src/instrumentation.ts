/**
 * Next.js Instrumentation
 * 服务器启动时执行：boot 恢复所有中断任务（类型感知，套图按缺失续跑）。
 * 并常驻一个 60s 心跳：定期回收「掉线」的 PROCESSING + 排空 PENDING —— 生产 standalone
 * 无 Electron 8s 调度，靠这个心跳保证中断任务能自动续跑、排队任务不会永久静止。
 *
 * 参考: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

const SWEEP_INTERVAL_MS = 60 * 1000;
let sweepStarted = false;

export async function register() {
  // 只在 Node.js 运行时执行（不在 Edge 运行时）
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  console.log('[Instrumentation] Next.js 服务启动中...');

  // boot：延迟 3s 确保数据库连接已建立，恢复所有中断任务
  setTimeout(async () => {
    try {
      const { recoverStuckTasks } = await import('@/lib/workbench/task-recovery');
      await recoverStuckTasks({ mode: 'boot' });
    } catch (e) {
      console.error('[Task Recovery] boot 恢复出错:', e);
    }
  }, 3000);

  // 常驻心跳：回收掉线 PROCESSING + 驱动 PENDING
  if (!sweepStarted) {
    sweepStarted = true;
    setInterval(async () => {
      try {
        const { recoverStuckTasks, pokeWorker } = await import('@/lib/workbench/task-recovery');
        await recoverStuckTasks({ mode: 'sweep' });
        await pokeWorker();
      } catch {
        // 心跳出错不影响服务
      }
    }, SWEEP_INTERVAL_MS);
    console.log(`[Instrumentation] 已启动 ${SWEEP_INTERVAL_MS / 1000}s 任务回收/驱动心跳`);
  }
}
