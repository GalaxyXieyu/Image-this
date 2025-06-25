import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 任务处理器
class TaskProcessor {
  private isProcessing = false;
  private maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS || '2'); // 最大并发任务数，从环境变量读取，默认2

  async processNextTask() {
    if (this.isProcessing) {
      return { message: '处理器正在运行中' };
    }

    this.isProcessing = true;

    try {
      // 获取下一个待处理任务（按优先级和创建时间排序）
      const task = await prisma.taskQueue.findFirst({
        where: {
          status: 'PENDING'
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      if (!task) {
        return { message: '没有待处理的任务' };
      }

      // 更新任务状态为处理中
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          currentStep: '开始处理任务',
          progress: 0
        }
      });

      // 根据任务类型处理
      let result;
      switch (task.type) {
        case 'ONE_CLICK_WORKFLOW':
          result = await this.processOneClickWorkflow(task);
          break;
        case 'BACKGROUND_REMOVAL':
          result = await this.processBackgroundRemoval(task);
          break;
        case 'IMAGE_EXPANSION':
          result = await this.processImageExpansion(task);
          break;
        case 'IMAGE_UPSCALING':
          result = await this.processImageUpscaling(task);
          break;
        default:
          throw new Error(`不支持的任务类型: ${task.type}`);
      }

      // 更新任务为完成状态
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(result),
          completedSteps: task.totalSteps
        }
      });

      return { 
        message: '任务处理完成', 
        taskId: task.id,
        type: task.type,
        result 
      };

    } catch (error) {
      // 如果有当前任务，更新为失败状态
      const currentTask = await prisma.taskQueue.findFirst({
        where: { status: 'PROCESSING' },
        orderBy: { updatedAt: 'desc' }
      });

      if (currentTask) {
        await prisma.taskQueue.update({
          where: { id: currentTask.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: error instanceof Error ? error.message : '未知错误',
            currentStep: '处理失败'
          }
        });
      }

      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // 批量处理多个任务 - 修复：循环处理直到队列清空
  async processBatch(maxTasks = this.maxConcurrentTasks) {
    try {
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      let rounds = 0;
      const maxRounds = 10; // 防止无限循环

      while (rounds < maxRounds) {
        // 获取待处理任务
        const pendingTasks = await prisma.taskQueue.findMany({
          where: { status: 'PENDING' },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ],
          take: maxTasks
        });

        if (pendingTasks.length === 0) {
          break; // 没有更多任务，退出循环
        }

        console.log(`第${rounds + 1}轮处理: 发现${pendingTasks.length}个待处理任务`);

        // 并行处理这批任务
        const results = await Promise.allSettled(
          pendingTasks.map(task => this.processSingleTask(task))
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        totalProcessed += pendingTasks.length;
        totalSuccessful += successful;
        totalFailed += failed;
        rounds++;

        console.log(`第${rounds}轮完成: 成功${successful}个, 失败${failed}个`);

        // 如果处理的任务数少于maxTasks，说明队列基本清空了
        if (pendingTasks.length < maxTasks) {
          break;
        }

        // 短暂延迟，避免过于频繁的数据库查询
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        message: totalProcessed > 0 ? `批量处理完成，共${rounds}轮` : '没有待处理的任务',
        processedCount: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        rounds
      };

    } catch (error) {
      console.error('批量处理失败:', error);
      throw error;
    }
  }

  private async processSingleTask(task: { id: string; type: string; inputData: string; totalSteps: number; userId: string }) {
    try {
      // 更新任务状态为处理中
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          currentStep: '开始处理任务',
          progress: 0
        }
      });

      // 添加超时机制 - 5分钟超时
      const taskTimeout = 5 * 60 * 1000; // 5分钟
      const taskPromise = this.executeTaskWithType(task);
      
      const result = await Promise.race([
        taskPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('任务处理超时')), taskTimeout)
        )
      ]);

      // 更新任务为完成状态
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(result),
          completedSteps: task.totalSteps
        }
      });

      return result;

    } catch (error) {
      console.error(`[任务处理] 任务失败 ID: ${task.id}, 类型: ${task.type}`, error);
      // 更新任务为失败状态
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : '未知错误',
          currentStep: '处理失败'
        }
      });
      throw error;
    }
  }

  private async executeTaskWithType(task: { id: string; type: string; inputData: string; userId: string }) {
    let result;
    switch (task.type) {
      case 'ONE_CLICK_WORKFLOW':
        result = await this.processOneClickWorkflow(task);
        break;
      case 'BACKGROUND_REMOVAL':
        result = await this.processBackgroundRemoval(task);
        break;
      case 'IMAGE_EXPANSION':
        result = await this.processImageExpansion(task);
        break;
      case 'IMAGE_UPSCALING':
        result = await this.processImageUpscaling(task);
        break;
      default:
        throw new Error(`不支持的任务类型: ${task.type}`);
    }
    return result;
  }

  private async processOneClickWorkflow(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { 
      imageUrl, 
      referenceImageUrl,
      xScale = 2.0, 
      yScale = 2.0, 
      upscaleFactor = 2,
      enableBackgroundReplace = false,
      enableOutpaint = true,
      enableUpscale = true
    } = inputData;
    
    await this.updateTaskProgress(task.id, 'Step 1/3: 准备处理...', 10, 1);

    try {
      // 调用一键工作流API
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/workflow/one-click`
        : 'http://localhost:3000/api/workflow/one-click';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          referenceImageUrl,
          xScale,
          yScale,
          upscaleFactor,
          enableBackgroundReplace,
          enableOutpaint,
          enableUpscale,
          userId: task.userId,
          serverCall: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`一键工作流处理失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();
      
      await this.updateTaskProgress(task.id, 'Step 3/3: 处理完成', 100, 3);

      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.minioUrl,
        imageData: result.data.imageData,
        processSteps: result.data.processSteps,
        settings: { xScale, yScale, upscaleFactor, enableBackgroundReplace, enableOutpaint, enableUpscale }
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '处理失败', 0, 0);
      throw error;
    }
  }

  private async processBackgroundRemoval(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, referenceImageUrl, customPrompt } = inputData;
    
    await this.updateTaskProgress(task.id, '背景替换处理中...', 30, 1);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/gpt/background-replace`
        : 'http://localhost:3000/api/gpt/background-replace';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalImageUrl: imageUrl,
          referenceImageUrl,
          customPrompt,
          userId: task.userId,
          serverCall: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`背景替换失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();

      await this.updateTaskProgress(task.id, '背景替换完成', 100, 1);
      
      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.imageData,
        prompt: result.data.prompt
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '背景替换失败', 0, 0);
      throw error;
    }
  }

  private async processImageExpansion(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, xScale = 2.0, yScale = 2.0 } = inputData;
    
    await this.updateTaskProgress(task.id, '图像扩展处理中...', 50, 1);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/qwen/outpaint`
        : 'http://localhost:3000/api/qwen/outpaint';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          xScale,
          yScale,
          userId: task.userId,
          serverCall: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`扩图失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();

      await this.updateTaskProgress(task.id, '图像扩展完成', 100, 1);
      
      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.imageData,
        xScale,
        yScale
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '图像扩展失败', 0, 0);
      throw error;
    }
  }

  private async processImageUpscaling(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, upscaleFactor = 2 } = inputData;
    
    await this.updateTaskProgress(task.id, '高清化处理中...', 50, 1);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/qwen/upscale`
        : 'http://localhost:3000/api/qwen/upscale';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          upscaleFactor,
          userId: task.userId,
          serverCall: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`高清化失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();

      await this.updateTaskProgress(task.id, '高清化完成', 100, 1);
      
      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.imageData,
        upscaleFactor
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '高清化失败', 0, 0);
      throw error;
    }
  }

  private async updateTaskProgress(
    taskId: string, 
    currentStep: string, 
    progress: number, 
    completedSteps: number
  ) {
    await prisma.taskQueue.update({
      where: { id: taskId },
      data: {
        currentStep,
        progress,
        completedSteps,
        updatedAt: new Date()
      }
    });
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const processor = new TaskProcessor();

// 手动触发任务处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batch = false, maxTasks = parseInt(process.env.MAX_CONCURRENT_TASKS || '2') } = body;

    let result;
    if (batch) {
      result = await processor.processBatch(maxTasks);
    } else {
      result = await processor.processNextTask();
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Task worker error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '任务处理失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 获取任务处理器状态
export async function GET() {
  try {
    // 获取队列统计信息
    const [pendingCount, processingCount, completedCount, failedCount] = await Promise.all([
      prisma.taskQueue.count({ where: { status: 'PENDING' } }),
      prisma.taskQueue.count({ where: { status: 'PROCESSING' } }),
      prisma.taskQueue.count({ where: { status: 'COMPLETED' } }),
      prisma.taskQueue.count({ where: { status: 'FAILED' } })
    ]);

    return NextResponse.json({
      success: true,
      status: {
        pending: pendingCount,
        processing: processingCount,
        completed: completedCount,
        failed: failedCount,
        total: pendingCount + processingCount + completedCount + failedCount
      }
    });
  } catch (error) {
    console.error('Get worker status error:', error);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}