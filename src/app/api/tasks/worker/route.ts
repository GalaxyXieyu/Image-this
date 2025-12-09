import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { addWatermarkToImage } from '@/lib/watermark';
import { getUserConfig } from '@/lib/user-config';

// 告诉 Next.js 这是一个动态路由，不要在构建时预渲染
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 任务处理器
class TaskProcessor {
  private isProcessing = false;
  private maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS || '1'); // 串行处理，避免即梦API并发限制

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

      // 更新任务为完成状态，并关联处理结果
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(result),
          completedSteps: task.totalSteps,
          processedImageId: (result as { processedImageId?: string })?.processedImageId || null
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
  /**
   * 并发控制：限制同时执行的任务数量
   * @param items 要处理的任务列表
   * @param processor 处理函数
   * @param concurrency 最大并发数
   */
  private async processConcurrently<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number
  ): Promise<PromiseSettledResult<R>[]> {
    const results: PromiseSettledResult<R>[] = [];
    const executing: Promise<void>[] = [];
    let completed = 0;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const promise = processor(item)
        .then(
          (value: R) => {
            completed++;
            results.push({ status: 'fulfilled', value });
          },
          (reason: any) => {
            completed++;
            results.push({ status: 'rejected', reason });
          }
        )
        .then(() => {
          executing.splice(executing.indexOf(promise), 1);
        });
      
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }
    
    await Promise.all(executing);
    return results;
  }

  async processBatch(maxTasks = 10, maxRounds = 5) {
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

        const results = await this.processConcurrently<typeof pendingTasks[0], any>(
          pendingTasks,
          (task) => this.processSingleTask(task as { id: string; type: string; inputData: string; totalSteps: number; userId: string }),
          1
        );

        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        totalSuccessful += successful;
        totalFailed += failed;
        rounds++;

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

  private async processSingleTask(task: { id: string; type: string; inputData: string; totalSteps: number; userId: string; retryCount?: number; maxRetries?: number }) {
    try {
      const userConfig = await getUserConfig(task.userId);
      
      // 将用户配置注入到 inputData 中
      const inputData = JSON.parse(task.inputData);
      inputData.volcengineConfig = userConfig.volcengine;
      inputData.imagehostingConfig = userConfig.imagehosting;
      task.inputData = JSON.stringify(inputData);
      
      const retryCount = task.retryCount ?? 0;
      const retryInfo = retryCount > 0 ? ` (重试 ${retryCount} 次)` : '';
      
      // 更新任务状态为处理中
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          currentStep: `开始处理任务${retryInfo}`,
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
      
      // 更新任务为完成状态，并关联处理结果
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(result),
          completedSteps: task.totalSteps,
          processedImageId: (result as { processedImageId?: string })?.processedImageId || null
        }
      });

      return result;

    } catch (error) {
      console.error(`=== 任务处理失败 ===`);
      console.error(`任务ID: ${task.id}, 类型: ${task.type}`);
      console.error(`错误信息:`, error);
      
      // 获取当前重试信息
      const currentTask = await prisma.taskQueue.findUnique({
        where: { id: task.id },
        select: { retryCount: true, maxRetries: true }
      });
      
      const retryCount = currentTask?.retryCount ?? 0;
      const maxRetries = currentTask?.maxRetries ?? 3;
      
      if (retryCount < maxRetries) {
        // 还可以重试：增加重试次数，重置为 PENDING 状态
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'PENDING',
            retryCount: retryCount + 1,
            progress: 0,
            currentStep: `等待重试 (${retryCount + 1}/${maxRetries})`,
            startedAt: null,
            errorMessage: `处理失败: ${error instanceof Error ? error.message : '未知错误'}，准备第 ${retryCount + 1} 次重试`
          }
        });
        console.log(`[Task Worker] 任务 ${task.id} 处理失败，将进行第 ${retryCount + 1} 次重试`);
      } else {
        // 超过最大重试次数：标记为失败
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage: `重试 ${maxRetries} 次后仍然失败: ${error instanceof Error ? error.message : '未知错误'}`,
            currentStep: '处理失败（已达最大重试次数）'
          }
        });
        console.log(`[Task Worker] 任务 ${task.id} 已达最大重试次数 (${maxRetries})，标记为失败`);
      }
      
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
      outputResolution = 'original',
      aiModel = 'gemini',
      volcengineConfig
    } = inputData;
    
    await this.updateTaskProgress(task.id, 'Step 1/3: 准备处理...', 10, 1);

    try {
      const { executeOneClickWorkflow } = await import('@/app/api/images-process/workflow/one-click/service');
      
      const result = await executeOneClickWorkflow({
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
        watermarkPosition: watermarkPosition as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
        watermarkType: watermarkType as 'text' | 'logo',
        watermarkLogoUrl,
        outputResolution,
        aiModel,
        userId: task.userId,
        volcengineConfig
      });
      
      await this.updateTaskProgress(task.id, 'Step 3/3: 处理完成', 100, 3);

      return {
        processedImageId: result.id,
        processedImageUrl: result.processedUrl,
        imageData: result.imageData,
        processSteps: result.processSteps,
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
    const { imageUrl, referenceImageUrl, customPrompt, aiModel = 'gemini', volcengineConfig, imagehostingConfig } = inputData;
    
    await this.updateTaskProgress(task.id, `使用 ${aiModel} 生成图像中...`, 30, 1);
    
    try {
      // 构建提示词：如果有自定义提示词就用，否则使用默认的背景替换提示词
      let prompt = customPrompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

      const referenceImages = [imageUrl];
      if (referenceImageUrl) {
        referenceImages.push(referenceImageUrl);
      }
      
      let result;
      
      // 根据选择的 AI 模型调用不同的服务
      if (aiModel === 'gpt') {
        console.log('[Worker] 使用 GPT 模型');
        const { processWithGPT } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');
        
        const gptResult = await processWithGPT(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId
        );
        
        // 保存到本地存储（使用用户配置的保存路径）
        const processedUrl = await uploadBase64Image(
          gptResult.imageData,
          `gpt-bg-replace-${Date.now()}.jpg`,
          task.userId
        );
        
        const processedImage = await prisma.processedImage.create({
          data: {
            filename: `gpt-bg-replace-${Date.now()}.jpg`,
            originalUrl: imageUrl,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: gptResult.imageSize,
            metadata: JSON.stringify({
              provider: 'gpt',
              prompt,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageData: gptResult.imageData,
          imageSize: gptResult.imageSize
        };
        console.log('[Worker] GPT 处理成功，已保存到数据库');
      } else if (aiModel === 'gemini') {
        console.log('[Worker] 使用 Gemini 模型');
        const { processWithGemini } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');
        
        const resultImageUrl = await processWithGemini(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId
        );
        
        // 保存到本地存储（使用用户配置的保存路径）
        const processedUrl = await uploadBase64Image(
          resultImageUrl || '',
          `gemini-bg-replace-${Date.now()}.jpg`,
          task.userId
        );
        
        const processedImage = await prisma.processedImage.create({
          data: {
            filename: `gemini-bg-replace-${Date.now()}.jpg`,
            originalUrl: imageUrl,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: resultImageUrl?.length || 0,
            metadata: JSON.stringify({
              provider: 'gemini',
              prompt,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageData: resultImageUrl || '',
          imageSize: resultImageUrl?.length || 0
        };
        console.log('[Worker] Gemini 处理成功，已保存到数据库');
      } else if (aiModel === 'jimeng') {
        console.log('[Worker] 使用 Jimeng 模型');
        const { processWithJimeng } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');
        
        const jimengResult = await processWithJimeng(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId
        );
        
        // 保存到本地存储（使用用户配置的保存路径）
        const processedUrl = await uploadBase64Image(
          jimengResult.imageData,
          `jimeng-bg-replace-${Date.now()}.jpg`,
          task.userId
        );
        
        const processedImage = await prisma.processedImage.create({
          data: {
            filename: `jimeng-bg-replace-${Date.now()}.jpg`,
            originalUrl: imageUrl,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: jimengResult.imageSize,
            metadata: JSON.stringify({
              provider: 'jimeng',
              prompt,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageData: jimengResult.imageData,
          imageSize: jimengResult.imageSize
        };
        console.log('[Worker] Jimeng 处理成功，已保存到数据库');
      } else {
        throw new Error(`不支持的 AI 模型: ${aiModel}，请使用 gpt、gemini 或 jimeng`);
      }
      
      await this.updateTaskProgress(task.id, '图像生成完成', 100, 1);
      
      return {
        processedImageId: result.id,
        processedImageUrl: result.processedUrl,
        imageData: result.imageData,
        prompt: prompt || customPrompt || ''
      };

    } catch (error) {
      console.error(`[背景替换] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '图像生成失败', 0, 0);
      throw error;
    }
  }

  private async processImageExpansion(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, xScale = 2.0, yScale = 2.0, volcengineConfig, imagehostingConfig } = inputData;
    
    await this.updateTaskProgress(task.id, '图像扩展处理中...', 50, 1);
    
    try {
      // 将xScale/yScale转换为火山引擎的扩展比例
      // xScale=2表示左右各扩展50%，yScale=2表示上下各扩展50%
      const top = (yScale - 1) / 2;
      const bottom = (yScale - 1) / 2;
      const left = (xScale - 1) / 2;
      const right = (xScale - 1) / 2;

      const { outpaintWithVolcengine } = await import('@/lib/image-processor/service');
      const { uploadBase64Image } = await import('@/lib/storage');
      const { prisma } = await import('@/lib/prisma');
      
      const result = await outpaintWithVolcengine(
        task.userId,
        imageUrl,
        '扩展图像，保持风格一致',
        top,
        bottom,
        left,
        right,
        1920,
        1920,
        volcengineConfig,
        imagehostingConfig
      );

      // 保存到本地存储（使用用户配置的保存路径）
      const processedUrl = await uploadBase64Image(
        result.imageData,
        `outpaint-${Date.now()}.jpg`,
        task.userId
      );
      
      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `outpaint-${Date.now()}.jpg`,
          originalUrl: imageUrl,
          processedUrl: processedUrl,
          processType: 'IMAGE_OUTPAINTING',
          status: 'COMPLETED',
          fileSize: result.imageSize,
          metadata: JSON.stringify({
            provider: 'volcengine',
            expandRatio: { top, bottom, left, right },
            processingCompletedAt: new Date().toISOString()
          }),
          userId: task.userId
        }
      });

      await this.updateTaskProgress(task.id, '图像扩展完成', 100, 1);
      
      return {
        processedImageId: processedImage.id,
        processedImageUrl: processedUrl,
        imageData: result.imageData,
        expandRatio: result.metadata?.expandRatio || { top, bottom, left, right }
      };

    } catch (error) {
      console.error(`[图像扩展] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '图像扩展失败', 0, 0);
      throw error;
    }
  }

  private async processImageUpscaling(task: { id: string; inputData: string; userId: string }) {
    const inputData = JSON.parse(task.inputData);
    const { imageUrl, upscaleFactor = 2, aiModel = 'volcengine', volcengineConfig, imagehostingConfig } = inputData;
    
    await this.updateTaskProgress(task.id, '智能画质增强中...', 50, 1);
    
    try {
      // 直接调用 service，不通过 HTTP
      const { enhanceWithVolcengine } = await import('@/lib/image-processor/service');
      const { uploadBase64Image } = await import('@/lib/storage');
      const { prisma } = await import('@/lib/prisma');
      
      const result = await enhanceWithVolcengine(
        task.userId,
        imageUrl,
        '720p',
        false,
        false,
        1,
        95,
        false, // skipDbSave
        volcengineConfig,
        imagehostingConfig
      );

      // 保存到本地存储（使用用户配置的保存路径）
      const processedUrl = await uploadBase64Image(
        result.imageData,
        `enhance-${Date.now()}.jpg`,
        task.userId
      );
      
      const processedImage = await prisma.processedImage.create({
        data: {
          filename: `enhance-${Date.now()}.jpg`,
          originalUrl: imageUrl,
          processedUrl: processedUrl,
          processType: 'IMAGE_UPSCALING',
          status: 'COMPLETED',
          fileSize: result.imageSize,
          metadata: JSON.stringify({
            provider: 'volcengine',
            upscaleFactor,
            processingCompletedAt: new Date().toISOString()
          }),
          userId: task.userId
        }
      });

      await this.updateTaskProgress(task.id, '智能画质增强完成', 100, 1);
      
      return {
        processedImageId: processedImage.id,
        processedImageUrl: processedUrl,
        imageData: result.imageData,
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
    
    console.log('[Worker WATERMARK] 收到水印任务:', {
      taskId: task.id,
      imageUrlPrefix: imageUrl.substring(0, 30),
      watermarkType,
      hasLogoUrl: !!watermarkLogoUrl,
      logoUrlPrefix: watermarkLogoUrl?.substring(0, 30)
    });
    
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
      
      console.log('[Worker WATERMARK] 水印处理完成:', {
        taskId: task.id,
        resultPrefix: watermarkedImageData.substring(0, 30)
      });

      const uploadedUrl = await uploadBase64Image(
        watermarkedImageData,
        `watermark-${processedImage.id}.png`,
        task.userId
      );
      
      console.log('[Worker WATERMARK] 上传完成:', {
        taskId: task.id,
        uploadedUrl
      });

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          processedUrl: uploadedUrl,
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

// 获取任务处理器状态（按用户过滤）
export async function GET(request: NextRequest) {
  try {
    const { getServerSession } = await import('next-auth/next');
    const { authOptions } = await import('@/lib/auth');
    
    const session = await getServerSession(authOptions);
    
    // 构建查询条件 - 如果有用户登录则只统计该用户的任务
    const userFilter = session?.user?.id ? { userId: session.user.id } : {};
    
    // 使用 groupBy 替代 4 次独立查询，大幅提升性能
    const statusCounts = await prisma.taskQueue.groupBy({
      by: ['status'],
      where: userFilter,
      _count: { status: true }
    });
    
    // 转换为统计对象
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: 0
    };
    
    for (const item of statusCounts) {
      const count = item._count.status;
      stats.total += count;
      switch (item.status) {
        case 'PENDING': stats.pending = count; break;
        case 'PROCESSING': stats.processing = count; break;
        case 'COMPLETED': stats.completed = count; break;
        case 'FAILED': stats.failed = count; break;
      }
    }

    return NextResponse.json({
      success: true,
      status: stats
    });
  } catch (error) {
    console.error('Get worker status error:', error);
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    );
  }
}