/**
 * Next.js Instrumentation
 * 在服务器启动时执行，用于恢复卡住的任务
 * 
 * 参考: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 只在 Node.js 运行时执行（不在 Edge 运行时）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Next.js 服务启动中...');
    
    // 延迟执行，确保数据库连接已建立
    setTimeout(async () => {
      await recoverStuckTasks();
    }, 3000); // 3秒后执行恢复
  }
}

async function recoverStuckTasks() {
  try {
    // 动态导入 Prisma 客户端，避免在构建时出错
    const { prisma } = await import('@/lib/prisma');
    
    console.log('[Task Recovery] 检查是否有卡住的任务...');
    
    // 查找所有卡住的 PROCESSING 任务
    const stuckTasks = await prisma.taskQueue.findMany({
      where: {
        status: 'PROCESSING'
      },
      select: {
        id: true,
        type: true,
        retryCount: true,
        maxRetries: true,
        currentStep: true
      }
    });

    if (stuckTasks.length === 0) {
      console.log('[Task Recovery] 没有需要恢复的任务');
      return;
    }

    console.log(`[Task Recovery] 发现 ${stuckTasks.length} 个卡住的任务，开始恢复...`);

    let recoveredCount = 0;
    let failedCount = 0;

    for (const task of stuckTasks) {
      const retryCount = task.retryCount ?? 0;
      const maxRetries = task.maxRetries ?? 3;

      if (retryCount < maxRetries) {
        // 可以重试：重置为 PENDING 状态
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            progress: 0,
            currentStep: `任务恢复中（第 ${retryCount + 1} 次重试）`,
            startedAt: null,
            errorMessage: `服务重启导致任务中断，自动重试 (${retryCount + 1}/${maxRetries})`
          }
        });
        recoveredCount++;
        console.log(`[Task Recovery] 任务 ${task.id} (${task.type}) 已恢复，重试次数: ${retryCount + 1}/${maxRetries}`);
      } else {
        // 超过最大重试次数：标记为失败
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `任务重试次数已达上限 (${maxRetries} 次)，最后状态: ${task.currentStep || '未知'}`,
            currentStep: '重试次数已达上限'
          }
        });
        failedCount++;
        console.log(`[Task Recovery] 任务 ${task.id} (${task.type}) 重试次数已达上限，标记为失败`);
      }
    }

    console.log(`[Task Recovery] 恢复完成: ${recoveredCount} 个任务已恢复, ${failedCount} 个任务标记为失败`);

    // 如果有恢复的任务，触发 worker 处理
    if (recoveredCount > 0) {
      // 再延迟一点触发 worker，确保服务完全启动
      setTimeout(async () => {
        try {
          const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
          console.log(`[Task Recovery] 触发 worker 处理恢复的任务...`);
          
          const response = await fetch(`${baseUrl}/api/tasks/worker`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batch: true })
          });
          
          if (response.ok) {
            console.log('[Task Recovery] Worker 已触发');
          } else {
            console.warn('[Task Recovery] Worker 触发失败:', response.status);
          }
        } catch (e) {
          console.warn('[Task Recovery] 触发 worker 失败:', e);
        }
      }, 2000);
    }

  } catch (error) {
    console.error('[Task Recovery] 恢复任务时出错:', error);
  }
}
