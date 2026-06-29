import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { addWatermarkToImage } from '@/lib/watermark';
import { getUserConfig, normalizeTaskConcurrency } from '@/lib/user-config';
import { resolveHandler } from '@/lib/workbench/worker-handlers';
import '@/lib/workbench/handlers/background-replace'; // registers handler on import
import '@/lib/workbench/handlers/outpaint';
import '@/lib/workbench/handlers/upscale';
import '@/lib/workbench/handlers/watermark';
import '@/lib/workbench/handlers/one-click';
import '@/lib/workbench/handlers/pipeline';
import '@/lib/workbench/handlers/inpaint';
import '@/lib/workbench/handlers/listing-set';
import '@/lib/workbench/handlers/video-generation';
import { validateTaskInput } from '@/lib/workbench/input-validation';
import fs from 'fs/promises';

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type ParsedTaskInput = Record<string, any> & {
  inputAsset?: TaskAssetRef;
  referenceAsset?: TaskAssetRef;
  watermarkLogoAsset?: TaskAssetRef;
};

type QueueTaskForProcessing = {
  id: string;
  type: string;
  inputData: string;
  totalSteps: number;
  userId: string;
  retryCount?: number;
  maxRetries?: number;
  contractVersion?: number;
  workflowType?: string | null;
  handlerName?: string | null;
};

type PersistedTaskResult = {
  processedImageId?: string | null;
  processedImageUrl?: string | null;
  usedModel?: string | null;
  prompt?: string | null;
  videoUrl?: string;
  jimengTaskId?: string;
  frames?: unknown;
  aspectRatio?: string;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset?.filePath) {
    return null;
  }

  const buffer = await fs.readFile(asset.filePath);
  const mimeType = asset.mimeType || 'application/octet-stream';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function resolveTaskInputData(rawInputData: string): Promise<ParsedTaskInput> {
  return JSON.parse(rawInputData) as ParsedTaskInput;
}

function getAssetClientUrl(asset?: TaskAssetRef): string {
  return asset?.clientUrl || '';
}

async function persistRecordUrl(source: string | undefined, filename: string, userId: string): Promise<string> {
  if (!source) {
    return '';
  }

  if (source.startsWith('data:')) {
    return uploadBase64Image(source, filename, userId);
  }

  return source;
}

// 告诉 Next.js 这是一个动态路由，不要在构建时预渲染
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 任务处理器
class TaskProcessor {
  private isProcessing = false;

  private buildPersistedResult(taskType: string, result: any): PersistedTaskResult {
    // 白名单：只允许已知的轻量字段进入 outputData，绝不允许 base64/imageData 入库
    const allowedFields = new Set([
      'processedImageId', 'processedImageUrl', 'usedModel', 'prompt',
      'videoUrl', 'jimengTaskId', 'frames', 'aspectRatio',
      'expandRatio', 'upscaleFactor', 'watermarkText', 'watermarkOpacity',
      'watermarkPosition', 'watermarkType', 'outputResolution', 'processSteps',
      'results', 'setId',
    ]);

    const raw: Record<string, unknown> =
      taskType === 'VIDEO_GENERATION'
        ? {
            videoUrl: result.videoUrl,
            jimengTaskId: result.jimengTaskId,
            prompt: result.prompt,
            frames: result.frames,
            aspectRatio: result.aspectRatio,
          }
        : {
            processedImageId: result.processedImageId || result.id || null,
            processedImageUrl: result.processedImageUrl || result.processedUrl || result.imageUrl || null,
            usedModel: result.usedModel || null,
            prompt: result.prompt || null,
            // 商品套图：保留整套结果（轻量，仅 url/id/类型）
            ...(result.results ? { results: result.results, setId: result.setId } : {}),
          };

    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (!allowedFields.has(key)) {
        console.warn(`[Worker] buildPersistedResult 丢弃非白名单字段: ${key}`);
        continue;
      }
      if (typeof value === 'string' && value.length > 10_000) {
        console.warn(`[Worker] buildPersistedResult 丢弃超长字符串字段: ${key} (长度 ${value.length})，疑似 base64`);
        continue;
      }
      if (key === 'imageData') {
        console.warn('[Worker] buildPersistedResult 拒绝将 imageData (base64) 写入 outputData');
        continue;
      }
      cleaned[key] = value;
    }

    return cleaned as PersistedTaskResult;
  }

  private async getConfiguredConcurrencyLimit(requestedMaxTasks?: number) {
    let configuredLimit = normalizeTaskConcurrency(process.env.MAX_CONCURRENT_TASKS ?? 2);
    const nextPendingTask = await prisma.taskQueue.findFirst({
      where: { status: 'PENDING' },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      select: { userId: true },
    });

    if (nextPendingTask) {
      const userConfig = await getUserConfig(nextPendingTask.userId);
      configuredLimit = normalizeTaskConcurrency(userConfig.taskRuntime?.concurrency);
    }

    if (typeof requestedMaxTasks === 'number') {
      return Math.min(configuredLimit, normalizeTaskConcurrency(requestedMaxTasks));
    }

    return configuredLimit;
  }

  private async getAvailableSlots(requestedMaxTasks?: number) {
    const runningTasks = await prisma.taskQueue.count({
      where: { status: 'PROCESSING' },
    });
    const concurrencyLimit = await this.getConfiguredConcurrencyLimit(requestedMaxTasks);
    const availableSlots = Math.max(0, concurrencyLimit - runningTasks);

    return {
      concurrencyLimit,
      runningTasks,
      availableSlots,
    };
  }

  private async claimPendingTasks(limit: number, taskIds?: string[]): Promise<QueueTaskForProcessing[]> {
    if (limit <= 0) {
      return [];
    }

    const scopedTaskIds = taskIds?.filter((id) => typeof id === 'string' && id.length > 0);
    const candidates = await prisma.taskQueue.findMany({
      where: {
        status: 'PENDING',
        ...(scopedTaskIds?.length ? { id: { in: scopedTaskIds } } : {}),
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        type: true,
        inputData: true,
        totalSteps: true,
        userId: true,
        retryCount: true,
        maxRetries: true,
        contractVersion: true,
        workflowType: true,
        handlerName: true,
      },
    });

    const claimedTasks: QueueTaskForProcessing[] = [];

    for (const task of candidates) {
      const retryCount = task.retryCount ?? 0;
      const retryInfo = retryCount > 0 ? ` (重试 ${retryCount} 次)` : '';
      const claimed = await prisma.taskQueue.updateMany({
        where: {
          id: task.id,
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          currentStep: `开始处理任务${retryInfo}`,
          progress: 0,
        },
      });

      if (claimed.count === 1) {
        claimedTasks.push(task);
      }
    }

    return claimedTasks;
  }

  async processNextTask(taskIds?: string[]) {
    if (this.isProcessing) {
      return { message: '处理器正在运行中' };
    }

    this.isProcessing = true;

    try {
      const { concurrencyLimit, runningTasks, availableSlots } = await this.getAvailableSlots(1);

      if (availableSlots <= 0) {
        return {
          message: `并发已满，当前 ${runningTasks}/${concurrencyLimit} 个任务处理中`,
          running: runningTasks,
          limit: concurrencyLimit,
        };
      }

      const [task] = await this.claimPendingTasks(1, taskIds);

      if (!task) {
        return { message: '没有待处理的任务', running: runningTasks, limit: concurrencyLimit };
      }

      // 根据任务类型处理
      // Phase 5: Try typed handler registry first, fall back to legacy switch
      let result;
      const handler = resolveHandler(task.handlerName, task.workflowType, task.type);

      if (handler && (task.contractVersion ?? 1) >= 2) {
        // Typed handler path (contract v2+)
        const parsedInput = JSON.parse(task.inputData) as Record<string, unknown>;

        // Inject user config (mirrors legacy processSingleTask)
        const userConfig = await getUserConfig(task.userId);
        parsedInput.volcengineConfig = userConfig.volcengine;
        parsedInput.imagehostingConfig = userConfig.imagehosting;

        const validatedInput = handler.validateInput(parsedInput.parameters ?? parsedInput);

        // Add timeout wrapper (10 min)
        const taskTimeout = 10 * 60 * 1000;
        let timeoutHandle: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(async () => {
            const currentTask = await prisma.taskQueue.findUnique({
              where: { id: task.id },
              select: { currentStep: true, progress: true },
            });
            const stepInfo = currentTask
              ? `当前步骤: ${currentTask.currentStep}, 进度: ${currentTask.progress}%`
              : '未知步骤';
            reject(new Error(`任务处理超时（10分钟）- ${stepInfo}`));
          }, taskTimeout);
        });

        result = await Promise.race([
          handler.execute(
            {
              task,
              userId: task.userId,
              updateProgress: async (step, progress, completedSteps) => {
                await prisma.taskQueue.update({
                  where: { id: task.id },
                  data: { currentStep: step, progress, completedSteps },
                });
              },
            },
            validatedInput,
            parsedInput
          ),
          timeoutPromise,
        ]);

        clearTimeout(timeoutHandle!);
      } else {
        // Legacy switch path (contract v1 or no registered handler)
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
          case 'VIDEO_GENERATION':
            result = await this.processVideoGeneration(task);
            break;
          default:
            throw new Error(`不支持的任务类型: ${task.type}`);
        }
      }

      const persistedResult = handler && (task.contractVersion ?? 1) >= 2
        ? handler.normalizeResult(result)
        : this.buildPersistedResult(task.type, result);

      // 更新任务为完成状态，并关联处理结果
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(persistedResult),
          completedSteps: task.totalSteps,
          processedImageId: persistedResult.processedImageId || null
        }
      });

      return { 
        message: '任务处理完成', 
        taskId: task.id,
        type: task.type,
        result: persistedResult
      };

    } catch (error) {
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

  async processBatch(maxTasks?: number, taskIds?: string[]) {
    try {
      let totalProcessed = 0;
      let totalSuccessful = 0;
      let totalFailed = 0;
      const { concurrencyLimit, runningTasks, availableSlots } = await this.getAvailableSlots(maxTasks);

      if (availableSlots <= 0) {
        return {
          message: `并发已满，当前 ${runningTasks}/${concurrencyLimit} 个任务处理中`,
          processedCount: 0,
          successful: 0,
          failed: 0,
          running: runningTasks,
          limit: concurrencyLimit,
        };
      }

      const pendingTasks = await this.claimPendingTasks(availableSlots, taskIds);

      if (pendingTasks.length === 0) {
        return {
          message: '没有待处理的任务',
          processedCount: 0,
          successful: 0,
          failed: 0,
          running: runningTasks,
          limit: concurrencyLimit,
        };
      }

      totalProcessed += pendingTasks.length;
      const results = await this.processConcurrently<QueueTaskForProcessing, any>(
        pendingTasks,
        (task) => this.processSingleTask(task),
        pendingTasks.length
      );

      totalSuccessful += results.filter(r => r.status === 'fulfilled').length;
      totalFailed += results.filter(r => r.status === 'rejected').length;

      return {
        message: totalProcessed > 0 ? `批量处理完成，本次领取 ${totalProcessed} 个任务` : '没有待处理的任务',
        processedCount: totalProcessed,
        successful: totalSuccessful,
        failed: totalFailed,
        running: runningTasks,
        limit: concurrencyLimit,
      };

    } catch (error) {
      console.error('批量处理失败:', error);
      throw error;
    }
  }

  private async processSingleTask(task: QueueTaskForProcessing) {
    try {
      const userConfig = await getUserConfig(task.userId);
      
      // 将用户配置注入到 inputData 中
      const inputData = await resolveTaskInputData(task.inputData);
      inputData.volcengineConfig = userConfig.volcengine;
      inputData.imagehostingConfig = userConfig.imagehosting;
      task.inputData = JSON.stringify(inputData);
      
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
      const persistedResult = this.buildPersistedResult(task.type, result);
      
      // 更新任务为完成状态，并关联处理结果
      await prisma.taskQueue.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          currentStep: '处理完成',
          completedAt: new Date(),
          outputData: JSON.stringify(persistedResult),
          completedSteps: task.totalSteps,
          processedImageId: persistedResult.processedImageId || null
        }
      });

      return persistedResult;

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
      case 'PIPELINE_WORKFLOW':
        result = await this.processPipeline(task);
        break;
      case 'INPAINT':
        result = await this.processInpaint(task);
        break;
      case 'LISTING_SET':
        result = await this.processListingSet(task);
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
      case 'VIDEO_GENERATION':
        result = await this.processVideoGeneration(task);
        break;
      default:
        throw new Error(`不支持的任务类型: ${task.type}`);
    }
    return result;
  }

  private async processPipeline(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl =
      (await readAssetAsDataUrl(inputData.inputAsset)) ||
      inputData.imageUrl ||
      getAssetClientUrl(inputData.inputAsset);
    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset) || '';

    const global = ((inputData as Record<string, unknown>).global as Record<string, unknown>) || {};
    const rawSteps = Array.isArray((inputData as Record<string, unknown>).steps)
      ? ((inputData as Record<string, unknown>).steps as Array<Record<string, unknown>>)
      : [];

    const steps = [];
    for (const s of rawSteps) {
      const stepType = (s.stepType as string) || (s.type as string) || '';
      let referenceImageUrl = (s.referenceImageUrl as string) || undefined;
      const refAsset = s.referenceAsset as Parameters<typeof readAssetAsDataUrl>[0];
      if (!referenceImageUrl && refAsset) {
        referenceImageUrl = (await readAssetAsDataUrl(refAsset)) || getAssetClientUrl(refAsset) || undefined;
      }
      steps.push({ ...s, stepType, referenceImageUrl });
    }

    const { executeOrderedPipeline } = await import(
      '@/app/api/images-process/workflow/one-click/service'
    );
    const result = await executeOrderedPipeline({
      imageUrl,
      steps,
      userId: task.userId,
      aiModel: (global.aiModel as string) || 'gemini',
      outputResolution: (global.resolution as string) || (global.outputResolution as string),
      originalImageUrlForRecord,
      volcengineConfig: inputData.volcengineConfig,
      imagehostingConfig: inputData.imagehostingConfig,
      onProgress: async (label: string, progress: number, completed: number) => {
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: { currentStep: label, progress, completedSteps: completed },
        });
      },
    });

    return {
      processedImageId: result.id,
      processedImageUrl: result.processedUrl,
      processSteps: result.processSteps,
    };
  }

  private async processInpaint(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const sourceImage =
      (await readAssetAsDataUrl(inputData.inputAsset)) ||
      inputData.imageUrl ||
      getAssetClientUrl(inputData.inputAsset);
    const maskImage =
      (await readAssetAsDataUrl((inputData as Record<string, unknown>).maskAsset as Parameters<typeof readAssetAsDataUrl>[0])) ||
      ((inputData as Record<string, unknown>).maskDataUrl as string) ||
      '';
    if (!sourceImage) throw new Error('缺少原图');
    if (!maskImage) throw new Error('缺少蒙版');

    const raw = inputData as Record<string, unknown>;
    const { executeInpaint } = await import('@/lib/workbench/inpaint-service');
    return executeInpaint({
      userId: task.userId,
      sourceImage,
      maskImage,
      prompt: raw.prompt as string | undefined,
      action: (raw.action as 'inpaint' | 'remove' | 'enhance') || 'inpaint',
      strength: (raw.strength as 'low' | 'medium' | 'high') || 'medium',
      originalUrlForRecord: getAssetClientUrl(inputData.inputAsset) || (raw.imageUrl as string) || '',
      provider: raw.provider as string | undefined,
      modelName: raw.modelName as string | undefined,
      onProgress: async (label: string, progress: number) => {
        await prisma.taskQueue.update({
          where: { id: task.id },
          data: { currentStep: label, progress, completedSteps: progress >= 100 ? 1 : 0 },
        });
      },
    });
  }

  private async processListingSet(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const raw = inputData as Record<string, unknown>;
    const sourceImage =
      (await readAssetAsDataUrl(inputData.inputAsset)) ||
      inputData.imageUrl ||
      getAssetClientUrl(inputData.inputAsset);
    if (!sourceImage) throw new Error('缺少商品图');

    const { executeListingSet } = await import('@/lib/workbench/listing-set-service');
    return executeListingSet({
      userId: task.userId,
      taskId: task.id,
      sourceImage,
      product: (raw.product as Record<string, unknown>) || {},
      setId: (raw.setId as string) || task.id,
      types: raw.types as ('main' | 'scene' | 'model' | 'detail' | 'sellingpoint')[] | undefined,
      prompts: raw.prompts as Partial<Record<'main' | 'scene' | 'model' | 'detail' | 'sellingpoint', string>> | undefined,
      originalUrlForRecord: getAssetClientUrl(inputData.inputAsset) || (raw.imageUrl as string) || '',
      provider: raw.provider as string | undefined,
      modelName: raw.modelName as string | undefined,
    });
  }

  private async processOneClickWorkflow(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const referenceImageUrl = (await readAssetAsDataUrl(inputData.referenceAsset)) || inputData.referenceImageUrl;
    const watermarkLogoUrl = (await readAssetAsDataUrl(inputData.watermarkLogoAsset)) || inputData.watermarkLogoUrl;
    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset)
      || await persistRecordUrl(inputData.imageUrl, `input-one-click-${task.id}.jpg`, task.userId);
    const referenceImageUrlForRecord = getAssetClientUrl(inputData.referenceAsset)
      || await persistRecordUrl(inputData.referenceImageUrl, `reference-one-click-${task.id}.jpg`, task.userId);
    const watermarkLogoUrlForRecord = getAssetClientUrl(inputData.watermarkLogoAsset)
      || await persistRecordUrl(inputData.watermarkLogoUrl, `logo-one-click-${task.id}.png`, task.userId);
    const { 
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
      outputResolution = 'original',
      aiModel = 'gemini',
      backgroundPrompt = '',
      outpaintPrompt = '',
      volcengineConfig,
      imagehostingConfig
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
        backgroundPrompt,
        outpaintPrompt,
        userId: task.userId,
        volcengineConfig,
        imagehostingConfig,
        originalImageUrlForRecord,
        referenceImageUrlForRecord,
        watermarkLogoUrlForRecord
      });
      
      await this.updateTaskProgress(task.id, 'Step 3/3: 处理完成', 100, 3);

      return {
        processedImageId: result.id,
        processedImageUrl: result.processedUrl,
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
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const referenceImageUrl = (await readAssetAsDataUrl(inputData.referenceAsset)) || inputData.referenceImageUrl;
    const {
      customPrompt,
      aiModel = 'gemini',
      provider: explicitProvider,
      modelName: explicitModelName,
      fallbackModels,
      volcengineConfig,
      imagehostingConfig
    } = inputData;

    // 兼容旧数据：如果没有 provider，从 aiModel 推断
    const provider = explicitProvider || (aiModel.startsWith('gpt') ? 'gpt' : aiModel.startsWith('gemini') ? 'gemini' : aiModel.startsWith('jimeng') || aiModel.startsWith('seedream') ? 'jimeng' : aiModel);
    // 如果 aiModel 只是 provider 简称（如 'gemini'/'gpt'/'jimeng'），modelName 用 undefined，让 service 从用户配置读取真实的 modelName
    const isProviderAlias = ['gemini', 'gpt', 'jimeng', 'seedream'].includes(aiModel);
    const modelName = explicitModelName || (isProviderAlias ? undefined : aiModel);

    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset)
      || await persistRecordUrl(inputData.imageUrl, `input-bg-replace-${task.id}.jpg`, task.userId);
    const referenceImageUrlForRecord = getAssetClientUrl(inputData.referenceAsset)
      || await persistRecordUrl(inputData.referenceImageUrl, `reference-bg-replace-${task.id}.jpg`, task.userId);

    await this.updateTaskProgress(task.id, `使用 ${modelName} 生成图像中...`, 30, 1);

    let lastError: Error | undefined;
    const attemptModels = [modelName, ...(fallbackModels || [])];

    for (const attemptModel of attemptModels) {
      try {
        // 构建提示词：如果有自定义提示词就用，否则使用默认的背景替换提示词
        let prompt = customPrompt || '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';

        const referenceImages = [imageUrl];
        if (referenceImageUrl) {
          referenceImages.push(referenceImageUrl);
        }

        let result;

        // 根据选择的 AI 模型调用不同的服务
        if (provider === 'gpt') {
        console.log('[Worker] 使用 GPT 模型');
        const { processWithGPT } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');
        
        const gptResult = await processWithGPT(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId,
          attemptModel
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
            originalUrl: originalImageUrlForRecord,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: gptResult.imageSize,
            metadata: JSON.stringify({
              provider: 'gpt',
              prompt,
              referenceImageUrl: referenceImageUrlForRecord,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageSize: gptResult.imageSize
        };
        console.log('[Worker] GPT 处理成功，已保存到数据库');
      } else if (provider === 'gemini') {
        console.log(`[Worker] 使用 Gemini 模型: ${attemptModel}`);
        const { processWithGemini } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');

        const resultImageUrl = await processWithGemini(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId,
          attemptModel
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
            originalUrl: originalImageUrlForRecord,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: resultImageUrl?.length || 0,
            metadata: JSON.stringify({
              provider: 'gemini',
              prompt,
              referenceImageUrl: referenceImageUrlForRecord,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageSize: resultImageUrl?.length || 0
        };
        console.log('[Worker] Gemini 处理成功，已保存到数据库');
      } else if (provider === 'jimeng') {
        console.log(`[Worker] 使用 Jimeng 模型: ${attemptModel}`);
        const { processWithJimeng } = await import('@/lib/image-processor/service');
        const { uploadBase64Image } = await import('@/lib/storage');
        const { prisma } = await import('@/lib/prisma');

        const jimengResult = await processWithJimeng(
          imageUrl,
          referenceImageUrl || imageUrl,
          prompt,
          task.userId,
          attemptModel
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
            originalUrl: originalImageUrlForRecord,
            processedUrl: processedUrl,
            processType: 'BACKGROUND_REMOVAL',
            status: 'COMPLETED',
            fileSize: jimengResult.imageSize,
            metadata: JSON.stringify({
              provider: 'jimeng',
              prompt,
              referenceImageUrl: referenceImageUrlForRecord,
              processingCompletedAt: new Date().toISOString()
            }),
            userId: task.userId
          }
        });
        
        result = {
          id: processedImage.id,
          processedUrl: processedUrl,
          imageSize: jimengResult.imageSize
        };
        console.log('[Worker] Jimeng 处理成功，已保存到数据库');
      } else {
        throw new Error(`不支持的 AI 模型: ${aiModel}，请使用 gpt、gemini 或 jimeng`);
      }
      
      await this.updateTaskProgress(task.id, `图像生成完成（${attemptModel}）`, 100, 1);

      return {
        processedImageId: result.id,
        processedImageUrl: result.processedUrl,
        prompt: prompt || customPrompt || '',
        usedModel: attemptModel,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[背景替换] 模型 ${attemptModel} 处理失败:`, lastError.message);
      await this.updateTaskProgress(task.id, `${attemptModel} 生成失败，尝试兜底...`, 0, 0);
      continue;
    }
  }

  // 所有模型都失败
  if (lastError) {
    console.error(`[背景替换] 所有模型处理失败`);
    await this.updateTaskProgress(task.id, '图像生成失败', 0, 0);
    throw lastError;
  }

  throw new Error('背景替换未返回结果');
}

  private async processImageExpansion(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const { xScale = 2.0, yScale = 2.0, prompt = '扩展图像，保持产品主体和风格完全一致，自然延伸背景', volcengineConfig, imagehostingConfig } = inputData;
    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset)
      || await persistRecordUrl(inputData.imageUrl, `input-outpaint-${task.id}.jpg`, task.userId);
    
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
        prompt,
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
          originalUrl: originalImageUrlForRecord,
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
        expandRatio: result.metadata?.expandRatio || { top, bottom, left, right }
      };

    } catch (error) {
      console.error(`[图像扩展] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '图像扩展失败', 0, 0);
      throw error;
    }
  }

  private async processImageUpscaling(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const { upscaleFactor = 2, aiModel = 'volcengine', volcengineConfig, imagehostingConfig } = inputData;
    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset)
      || await persistRecordUrl(inputData.imageUrl, `input-upscale-${task.id}.jpg`, task.userId);
    
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
          originalUrl: originalImageUrlForRecord,
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
        upscaleFactor
      };

    } catch (error) {
      console.error(`[智能画质增强] 处理失败:`, error);
      await this.updateTaskProgress(task.id, '智能画质增强失败', 0, 0);
      throw error;
    }
  }

  private async processWatermark(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const watermarkLogoUrl = (await readAssetAsDataUrl(inputData.watermarkLogoAsset)) || inputData.watermarkLogoUrl;
    const originalImageUrlForRecord = getAssetClientUrl(inputData.inputAsset)
      || await persistRecordUrl(inputData.imageUrl, `input-watermark-${task.id}.png`, task.userId);
    const watermarkLogoUrlForRecord = getAssetClientUrl(inputData.watermarkLogoAsset)
      || await persistRecordUrl(inputData.watermarkLogoUrl, `logo-watermark-${task.id}.png`, task.userId);
    const {
      watermarkText = 'Watermark',
      watermarkOpacity = 0.3,
      watermarkPosition = 'bottom-right',
      watermarkType = 'logo',
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
          originalUrl: originalImageUrlForRecord,
          processType: 'WATERMARK',
          status: 'PROCESSING',
          userId: task.userId,
          metadata: JSON.stringify({
            watermarkText,
            watermarkOpacity,
            watermarkPosition,
            watermarkType,
            watermarkLogoUrl: watermarkLogoUrlForRecord,
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
        processedImageUrl: uploadedUrl,
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

  private async processVideoGeneration(task: { id: string; inputData: string; userId: string }) {
    const inputData = await resolveTaskInputData(task.inputData);
    const imageUrl = (await readAssetAsDataUrl(inputData.inputAsset)) || inputData.imageUrl;
    const { prompt, frames = 121, aspectRatio = '16:9' } = inputData;

    await this.updateTaskProgress(task.id, '提交视频生成任务...', 10, 1);

    try {
      const { submitVideoTask, queryVideoTask, downloadAndSaveVideo } = await import('@/app/api/jimeng-video/service');

      // 提交任务 - imageUrl 实际是 base64 数据
      const { taskId: jimengTaskId } = await submitVideoTask(task.userId, {
        imageBase64: imageUrl,
        prompt,
        frames,
        aspectRatio,
      });

      // 轮询查询结果（最多5分钟）
      await this.updateTaskProgress(task.id, '视频生成中...', 30, 1);
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const result = await queryVideoTask(task.userId, jimengTaskId);

        if (result.status === 'done' && result.videoUrl) {
          await this.updateTaskProgress(task.id, '保存视频...', 90, 1);
          const localVideoUrl = await downloadAndSaveVideo(result.videoUrl, task.userId);

          await this.updateTaskProgress(task.id, '视频生成完成', 100, 1);
          return {
            videoUrl: localVideoUrl,
            jimengTaskId,
            prompt,
            frames,
            aspectRatio
          };
        }

        if (result.status === 'not_found' || result.status === 'expired') {
          throw new Error(result.error || '视频生成任务失败或已过期');
        }

        const progress = 30 + (i / maxAttempts) * 50;
        await this.updateTaskProgress(task.id, `视频生成中 (${i + 1}/${maxAttempts})...`, progress, 1);
        await this.delay(5000);
      }

      throw new Error('视频生成超时');
    } catch (error) {
      console.error('[视频生成] 处理失败:', error);
      await this.updateTaskProgress(task.id, '视频生成失败', 0, 0);
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
    const { batch = false, maxTasks } = body;
    const taskIds = Array.isArray(body.taskIds)
      ? body.taskIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : undefined;

    console.log(`Worker模式: ${batch ? '批量处理' : '单任务处理'}, 请求并发: ${maxTasks ?? '按设置'}, 任务范围: ${taskIds?.length ? taskIds.length : '全队列'}`);

    let result;
    if (batch) {
      console.log('开始批量处理任务...');
      result = await processor.processBatch(maxTasks, taskIds);
    } else {
      console.log('开始处理单个任务...');
      result = await processor.processNextTask(taskIds);
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
