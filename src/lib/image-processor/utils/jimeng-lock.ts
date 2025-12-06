/**
 * 即梦 API 全局调用锁
 * 确保即梦 API 调用串行执行，避免并发限制
 */

class JimengApiLock {
  private queue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;
  private lastCallTime = 0;
  private minInterval = 1000; // 最小调用间隔 1 秒
  private cooldownUntil = 0; // 冷却结束时间戳（429 错误后等待）

  /**
   * 将即梦 API 调用加入队列，确保串行执行
   */
  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * 设置冷却时间（429 错误后调用）
   * @param seconds 冷却秒数
   */
  setCooldown(seconds: number) {
    this.cooldownUntil = Date.now() + seconds * 1000;
    console.log(`[Jimeng Lock] 设置冷却时间 ${seconds} 秒，直到 ${new Date(this.cooldownUntil).toLocaleTimeString()}`);
  }

  /**
   * 获取当前队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 检查是否正在冷却中
   */
  isInCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  /**
   * 获取剩余冷却时间（毫秒）
   */
  getRemainingCooldown(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;

      try {
        // 检查冷却时间
        if (this.isInCooldown()) {
          const waitTime = this.getRemainingCooldown();
          console.log(`[Jimeng Lock] 冷却中，等待 ${Math.ceil(waitTime / 1000)} 秒...`);
          await this.sleep(waitTime);
        }

        // 确保最小调用间隔
        const now = Date.now();
        const elapsed = now - this.lastCallTime;
        if (elapsed < this.minInterval) {
          await this.sleep(this.minInterval - elapsed);
        }

        this.lastCallTime = Date.now();
        console.log(`[Jimeng Lock] 开始执行 API 调用，队列剩余: ${this.queue.length}`);

        const result = await task.execute();
        task.resolve(result);
      } catch (error) {
        // 检查是否是 429 错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('429') || errorMessage.includes('CONCURRENT_LIMIT') || errorMessage.includes('Concurrent Limit')) {
          // 设置 60 秒冷却时间
          this.setCooldown(60);
          console.log(`[Jimeng Lock] 检测到 429 并发限制，已设置 60 秒冷却`);
        }
        task.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 全局单例
export const jimengApiLock = new JimengApiLock();
