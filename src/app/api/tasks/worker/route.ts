import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 任务处理器
class TaskProcessor {
  private isProcessing = false;

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
          outputData: result,
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

  private async processOneClickWorkflow(task: any) {
    const { imageUrl, backgroundPrompt, xScale, yScale, upscaleFactor } = task.inputData;
    
    // 模拟三步处理流程
    // 步骤1: 背景替换
    await this.updateTaskProgress(task.id, 'Step 1/3: 背景替换中...', 33, 1);
    await this.delay(2000); // 模拟处理时间
    
    // 步骤2: 图像扩展
    await this.updateTaskProgress(task.id, 'Step 2/3: 图像扩展中...', 66, 2);
    await this.delay(2000);
    
    // 步骤3: 高清化
    await this.updateTaskProgress(task.id, 'Step 3/3: 高清化处理中...', 90, 3);
    await this.delay(2000);

    // 这里应该调用实际的API处理
    // 暂时返回模拟结果
    return {
      processedImageUrl: imageUrl, // 实际应该是处理后的图片URL
      steps: ['背景替换', '图像扩展', '高清化'],
      settings: { backgroundPrompt, xScale, yScale, upscaleFactor }
    };
  }

  private async processBackgroundRemoval(task: any) {
    const { imageUrl, prompt } = task.inputData;
    
    await this.updateTaskProgress(task.id, '背景替换处理中...', 50, 1);
    await this.delay(3000);
    
    return {
      processedImageUrl: imageUrl,
      prompt
    };
  }

  private async processImageExpansion(task: any) {
    const { imageUrl, xScale, yScale } = task.inputData;
    
    await this.updateTaskProgress(task.id, '图像扩展处理中...', 50, 1);
    await this.delay(4000);
    
    return {
      processedImageUrl: imageUrl,
      xScale,
      yScale
    };
  }

  private async processImageUpscaling(task: any) {
    const { imageUrl, upscaleFactor } = task.inputData;
    
    await this.updateTaskProgress(task.id, '高清化处理中...', 50, 1);
    await this.delay(3000);
    
    return {
      processedImageUrl: imageUrl,
      upscaleFactor
    };
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
    const result = await processor.processNextTask();
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    // console.error('Task processor error:', error);
    return NextResponse.json(
      {
        error: '任务处理失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 获取处理器状态
export async function GET() {
  try {
    // 获取队列统计信息
    const stats = await prisma.taskQueue.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    const statusCounts = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {} as Record<string, number>);

    // 获取最近的任务
    const recentTasks = await prisma.taskQueue.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        status: true,
        progress: true,
        currentStep: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        pending: statusCounts.PENDING || 0,
        processing: statusCounts.PROCESSING || 0,
        completed: statusCounts.COMPLETED || 0,
        failed: statusCounts.FAILED || 0,
        cancelled: statusCounts.CANCELLED || 0
      },
      recentTasks
    });

  } catch (error) {
    // console.error('Get processor status error:', error);
    return NextResponse.json(
      { error: '获取处理器状态失败' },
      { status: 500 }
    );
  }
}