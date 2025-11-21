import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { addWatermarkToImage } from '@/lib/watermark';

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
        case 'WATERMARK':
          result = await this.processWatermark(task);
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
      console.log(`=== 开始处理任务 ===`);
      console.log(`任务ID: ${task.id}, 类型: ${task.type}`);
      
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

      // 添加超时机制 - 10分钟超时
      const taskTimeout = 10 * 60 * 1000; // 10分钟
      const taskPromise = this.executeTaskWithType(task);
      
      let timeoutHandle: NodeJS.Timeout;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(async () => {
          // 获取当前任务状态，看看卡在哪一步了
          const currentTask = await prisma.taskQueue.findUnique({
            where: { id: task.id },
            select: { currentStep: true, progress: true }
          });
          const stepInfo = currentTask ? `当前步骤: ${currentTask.currentStep}, 进度: ${currentTask.progress}%` : '未知步骤';
          reject(new Error(`任务处理超时（10分钟）- ${stepInfo}`));
        }, taskTimeout);
      });
      
      const result = await Promise.race([
        taskPromise,
        timeoutPromise
      ]);
      
      clearTimeout(timeoutHandle!);

      console.log(`任务 ${task.id} 处理成功`);
      
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
      console.error(`=== 任务处理失败 ===`);
      console.error(`任务ID: ${task.id}, 类型: ${task.type}`);
      console.error(`错误信息:`, error);
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
      case 'WATERMARK':
        result = await this.processWatermark(task);
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
      enableUpscale = true,
      enableWatermark = false,
      watermarkText = 'Sample Watermark',
      watermarkOpacity = 0.3,
      watermarkPosition = 'bottom-right',
      watermarkType = 'text',
      watermarkLogoUrl,
      outputResolution = 'original'
    } = inputData;
    
    console.log(`[一键工作流] 开始处理任务 ${task.id}`);
    await this.updateTaskProgress(task.id, 'Step 1/3: 准备处理...', 10, 1);

    try {
      // 调用一键工作流API
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/workflow/one-click`
        : 'http://localhost:3000/api/workflow/one-click';
      
      console.log(`[一键工作流] 调用API: ${apiUrl}`);

      console.log(`[一键工作流] 发送请求，参数:`, { 
        xScale, yScale, upscaleFactor, 
        enableBackgroundReplace, enableOutpaint, enableUpscale,
        enableWatermark, watermarkType, outputResolution 
      });
      
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
          enableWatermark,
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType,
          watermarkLogoUrl,
          outputResolution,
          userId: task.userId,
          serverCall: true
        }),
      });
      
      console.log(`[一键工作流] API响应状态: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`一键工作流处理失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();
      console.log(`[一键工作流] 处理完成，任务ID: ${task.id}`);
      
      await this.updateTaskProgress(task.id, 'Step 3/3: 处理完成', 100, 3);

      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.minioUrl,
        imageData: result.data.imageData,
        processSteps: result.data.processSteps,
        settings: { 
          xScale, yScale, upscaleFactor, 
          enableBackgroundReplace, enableOutpaint, enableUpscale,
          enableWatermark, watermarkType, outputResolution
        }
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '处理失败', 0, 0);
      throw error;
    }
  }

  private async processBackgroundRemoval(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, referenceImageUrl, customPrompt } = inputData;
    
    console.log(`[背景替换] 任务ID: ${task.id}`);
    console.log(`[背景替换] 使用火山引擎即梦API（直接调用）`);
    
    await this.updateTaskProgress(task.id, '即梦图像生成中...', 30, 1);
    
    try {
      // 构建提示词：如果有自定义提示词就用，否则使用默认的背景替换提示词
      let prompt = customPrompt || '保持产品的形状、材质、特征比例、摆放角度及数量完全一致，仅替换背景，禁用背景虚化效果，确保画面清晰，专业摄影，高质量，4K分辨率';
      
      // 如果有参考图，在提示词中说明要参考场景风格
      if (referenceImageUrl && !customPrompt) {
        prompt = '保持产品主体完全不变，仅替换背景为类似参考场景的风格，保持产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
      }

      console.log(`[背景替换] 提示词: ${prompt.substring(0, 50)}...`);
      console.log(`[背景替换] 有产品图: ${!!imageUrl}`);
      console.log(`[背景替换] 有参考图: ${!!referenceImageUrl}`);
      console.log(`[背景替换] 开始直接调用即梦服务...`);

      // 直接调用即梦服务
      // 即梦API支持多张参考图（image_urls数组），会先上传到图床获取URL
      const { generateWithJimeng } = await import('@/app/api/jimeng/service');
      
      // 准备参考图数组：产品图 + 场景参考图（如果有）
      const referenceImages = [imageUrl];  // 产品图（base64 Data URL）
      if (referenceImageUrl) {
        referenceImages.push(referenceImageUrl);  // 场景参考图（base64 Data URL）
      }
      
      console.log(`[背景替换] 将上传${referenceImages.length}张图片到图床...`);
      
      const result = await generateWithJimeng(
        task.userId,
        prompt,
        referenceImages,  // 会自动上传到Superbed获取公网URL
        2048,
        2048
      );
      
      // 注意：
      // - imageUrl/referenceImageUrl: 虽然名字叫URL，实际是base64编码的图片数据（data:image/jpeg;base64,...）
      // - generateWithJimeng会自动上传到Superbed图床获取公网URL
      // - 即梦API支持0-10张参考图，通过image_urls数组传递

      console.log(`[背景替换] 服务调用成功`);
      console.log(`[背景替换] 生成图片ID: ${result.id}`);

      await this.updateTaskProgress(task.id, '图像生成完成', 100, 1);
      
      return {
        processedImageId: result.id,
        processedImageUrl: result.imageData,
        prompt: result.prompt
      };

    } catch (error) {
      console.error(`[背景替换] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '图像生成失败', 0, 0);
      throw error;
    }
  }

  private async processImageExpansion(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, xScale = 2.0, yScale = 2.0 } = inputData;
    
    console.log(`[图像扩展] 任务ID: ${task.id}`);
    console.log(`[图像扩展] 使用火山引擎扩图服务`);
    
    await this.updateTaskProgress(task.id, '图像扩展处理中...', 50, 1);
    
    try {
      // 将xScale/yScale转换为火山引擎的扩展比例
      // xScale=2表示左右各扩展50%，yScale=2表示上下各扩展50%
      const top = (yScale - 1) / 2;
      const bottom = (yScale - 1) / 2;
      const left = (xScale - 1) / 2;
      const right = (xScale - 1) / 2;

      console.log(`[图像扩展] 原始比例 - xScale: ${xScale}, yScale: ${yScale}`);
      console.log(`[图像扩展] 转换后扩展比例 - 上:${top} 下:${bottom} 左:${left} 右:${right}`);

      // 直接调用服务函数，避免HTTP超时问题
      const { outpaintWithVolcengine } = await import('@/app/api/volcengine/service');
      const result = await outpaintWithVolcengine(
        task.userId,
        imageUrl,
        '扩展图像，保持风格一致',
        top,
        bottom,
        left,
        right
      );

      console.log(`[图像扩展] 处理成功`);
      console.log(`[图像扩展] 生成图片ID: ${result.id}`);

      await this.updateTaskProgress(task.id, '图像扩展完成', 100, 1);
      
      return {
        processedImageId: result.id,
        processedImageUrl: result.imageData,
        expandRatio: result.expandRatio
      };

    } catch (error) {
      console.error(`[图像扩展] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '图像扩展失败', 0, 0);
      throw error;
    }
  }

  private async processImageUpscaling(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, upscaleFactor = 2 } = inputData;
    
    console.log(`[智能画质增强] 任务ID: ${task.id}`);
    console.log(`[智能画质增强] 使用火山引擎智能画质增强API`);
    
    await this.updateTaskProgress(task.id, '智能画质增强中...', 50, 1);
    
    try {
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `${process.env.NEXTAUTH_URL}/api/volcengine/enhance`
        : 'http://localhost:3000/api/volcengine/enhance';

      console.log(`[智能画质增强] API地址: ${apiUrl}`);

      // 火山画质增强需要3-5秒，设置2分钟超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          resolutionBoundary: '720p',
          enableHdr: false,
          enableWb: false,
          resultFormat: 1,
          jpgQuality: 95,
          userId: task.userId,
          serverCall: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`[智能画质增强] 开始调用API...`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[智能画质增强] API调用失败:`, errorData);
        throw new Error(`智能画质增强失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();
      console.log(`[智能画质增强] API调用成功`);
      console.log(`[智能画质增强] 生成图片ID: ${result.data?.id}`);

      await this.updateTaskProgress(task.id, '智能画质增强完成', 100, 1);
      
      return {
        processedImageId: result.data.id,
        processedImageUrl: result.data.imageData,
        upscaleFactor
      };

    } catch (error) {
      console.error(`[智能画质增强] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '智能画质增强失败', 0, 0);
      throw error;
    }
  }

  private async processWatermark(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const {
      imageUrl,
      watermarkText = 'Watermark',
      watermarkOpacity = 0.3,
      watermarkPosition = 'bottom-right',
      watermarkType = 'logo',
      watermarkLogoUrl,
      outputResolution = 'original'
    } = inputData;

    await this.updateTaskProgress(task.id, '水印添加中...', 50, 1);
    
    try {
      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `watermark-${Date.now()}.png`,
          originalUrl: imageUrl,
          processType: 'WATERMARK',
          status: 'PROCESSING',
          userId: task.userId,
          metadata: JSON.stringify({
            watermarkText,
            watermarkOpacity,
            watermarkPosition,
            watermarkType,
            watermarkLogoUrl,
            outputResolution,
          })
        }
      });

      const watermarkedImageData = await addWatermarkToImage({
        imageUrl,
        watermarkType,
        watermarkLogoUrl,
        watermarkPosition,
        watermarkOpacity,
        watermarkText,
        outputResolution
      });

      const minioUrl = await uploadBase64Image(
        watermarkedImageData,
        `watermark-${processedImage.id}.png`
      );

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          processedUrl: minioUrl,
          status: 'COMPLETED',
          fileSize: Buffer.from(watermarkedImageData.split(',')[1], 'base64').length,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            processingCompletedAt: new Date().toISOString(),
          })
        }
      });

      await this.updateTaskProgress(task.id, '水印添加完成', 100, 1);
      
      return {
        processedImageId: updatedImage.id,
        processedImageUrl: watermarkedImageData,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        watermarkType,
        outputResolution
      };

    } catch (error) {
      await this.updateTaskProgress(task.id, '水印添加失败', 0, 0);
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
    console.log('=== Worker收到触发请求 ===');
    const startTime = Date.now();
    
    const body = await request.json();
    const { batch = false, maxTasks = parseInt(process.env.MAX_CONCURRENT_TASKS || '2') } = body;

    console.log(`Worker模式: ${batch ? '批量处理' : '单任务处理'}, 最大并发: ${maxTasks}`);

    let result;
    if (batch) {
      console.log('开始批量处理任务...');
      result = await processor.processBatch(maxTasks);
    } else {
      console.log('开始处理单个任务...');
      result = await processor.processNextTask();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== Worker处理完成，总耗时: ${duration}秒 ===`);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('=== Worker处理失败 ===');
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