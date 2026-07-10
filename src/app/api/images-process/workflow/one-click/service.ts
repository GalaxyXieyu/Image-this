import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { processWithGemini, processWithGPT, processWithJimeng, outpaintWithVolcengine, enhanceWithVolcengine } from '@/lib/image-processor/service';

const DEFAULT_BACKGROUND_PROMPT = '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
const DEFAULT_OUTPAINT_PROMPT = '扩展图像，保持产品主体和风格完全一致，自然延伸背景';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stopWorkflow(stepName: string, error: unknown): never {
  throw new Error(`${stepName}失败，已停止后续步骤：${getErrorMessage(error)}`);
}

// ---------------------------------------------------------------------------
// 通用有序流水线：按 steps 顺序逐步处理，上一步输出作为下一步输入
// ---------------------------------------------------------------------------

export interface OrderedPipelineStep {
  stepType: 'scene' | 'background' | 'outpaint' | 'upscale' | 'watermark' | string;
  customPrompt?: string;
  referenceImageUrl?: string;
  aiModel?: string;
  // outpaint
  ratio?: number;
  direction?: string; // 扩图方向：'all'/'horizontal'/'vertical'
  xScale?: number;
  yScale?: number;
  outpaintPrompt?: string;
  // watermark
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | string;
  watermarkType?: 'text' | 'logo' | string;
  watermarkLogoUrl?: string;
  watermarkScale?: number; // 水印大小（占图宽比例）
  outputResolution?: string;
  // upscale
  upscaleFactor?: number; // 放大倍数（真实按倍数缩放分辨率）
}

export interface OrderedPipelineParams {
  imageUrl: string;
  steps: OrderedPipelineStep[];
  userId: string;
  aiModel?: string;
  outputResolution?: string;
  originalImageUrlForRecord?: string;
  volcengineConfig?: { accessKey: string; secretKey: string };
  imagehostingConfig?: { superbedToken: string };
  onProgress?: (label: string, progress: number, completedSteps: number) => Promise<void>;
}

const STEP_LABELS: Record<string, string> = {
  scene: '生成场景图',
  background: 'AI 换背景',
  outpaint: '智能扩图',
  upscale: '高清放大',
  watermark: '水印与尺寸',
};

export async function executeOrderedPipeline(params: OrderedPipelineParams) {
  const {
    imageUrl,
    steps,
    userId,
    aiModel: globalAiModel = 'gemini',
    outputResolution,
    originalImageUrlForRecord,
    volcengineConfig,
    imagehostingConfig,
    onProgress,
  } = params;

  if (!imageUrl) throw new Error('缺少必要参数：imageUrl');
  if (!Array.isArray(steps) || steps.length === 0) throw new Error('流水线没有可执行步骤');

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: `pipeline-${Date.now()}.jpg`,
      userId,
      originalUrl: originalImageUrlForRecord || (imageUrl.startsWith('data:') ? '' : imageUrl),
      processType: 'ONE_CLICK_WORKFLOW',
      status: 'PROCESSING',
      metadata: JSON.stringify({ pipeline: steps.map((s) => s.stepType) }),
    },
  });

  try {
    let current = imageUrl;
    const done: string[] = [];
    const total = steps.length;

    for (let i = 0; i < total; i++) {
      const step = steps[i];
      const label = `第 ${i + 1}/${total} 步：${STEP_LABELS[step.stepType] || step.stepType}`;
      if (onProgress) await onProgress(label, Math.round((i / total) * 100) + 2, i);

      try {
        if (step.stepType === 'background' || step.stepType === 'scene') {
          const prompt = step.customPrompt || DEFAULT_BACKGROUND_PROMPT;
          // 无参考图（如纯色棚拍/白底）时，用输入图自身占位，避免向 provider 传空 URL
          const ref = step.referenceImageUrl || current;
          const model = step.aiModel || globalAiModel;
          let out: string | undefined;
          if (model === 'gpt') {
            out = (await processWithGPT(current, ref, prompt, userId)).imageData;
          } else if (model === 'jimeng') {
            out = (await processWithJimeng(current, ref, prompt, userId)).imageData;
          } else {
            const r = await processWithGemini(current, ref, prompt, userId);
            out = r || undefined;
          }
          if (!out) throw new Error('返回结果为空');
          current = out;
        } else if (step.stepType === 'outpaint') {
          const each = Math.min(0.5, Math.max(0.05, (step.ratio ?? 25) / 100));
          const dir = (step.direction as string) || 'all';
          const horiz = dir === 'all' || dir === 'horizontal';
          const vert  = dir === 'all' || dir === 'vertical';
          const left = horiz ? each : 0;
          const right = horiz ? each : 0;
          const top  = vert  ? each : 0;
          const bottom = vert  ? each : 0;
          const r = await outpaintWithVolcengine(
            userId,
            current,
            step.outpaintPrompt || step.customPrompt || DEFAULT_OUTPAINT_PROMPT,
            top,
            bottom,
            left,
            right,
            2048,
            2048,
            volcengineConfig,
            imagehostingConfig
          );
          current = r.imageData;
        } else if (step.stepType === 'upscale') {
          const r = await enhanceWithVolcengine(
            userId,
            current,
            '720p',
            false,
            false,
            1,
            95,
            true,
            volcengineConfig,
            imagehostingConfig
          );
          current = r.imageData;
          // 真正按用户选的倍数缩放分辨率（旧逻辑倍数不生效）
          const factor = Number(step.upscaleFactor) || 0;
          if (factor > 0 && Math.abs(factor - 1) > 0.001) {
            const { scaleImageByFactor } = await import('@/lib/image-scale');
            current = await scaleImageByFactor(current, factor);
          }
        } else if (step.stepType === 'watermark') {
          const { addWatermarkToImage } = await import('@/lib/watermark');
          current = await addWatermarkToImage({
            imageUrl: current,
            watermarkText: step.watermarkText || '@品牌名',
            watermarkOpacity: step.watermarkOpacity ?? 0.7,
            watermarkPosition:
              (step.watermarkPosition as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center') ||
              'bottom-right',
            watermarkType: (step.watermarkType as 'text' | 'logo') || 'text',
            watermarkLogoUrl: step.watermarkLogoUrl,
            watermarkScale: step.watermarkScale,
            outputResolution: step.outputResolution || outputResolution,
          });
        } else {
          continue; // 未知步骤跳过
        }
      } catch (error) {
        stopWorkflow(STEP_LABELS[step.stepType] || step.stepType, error);
      }

      done.push(step.stepType);
    }

    if (onProgress) await onProgress('处理完成', 100, total);

    const imageSize = current.startsWith('data:')
      ? Math.floor(current.split(',')[1].length * 0.75)
      : 0;
    const savedUrl = current.startsWith('data:')
      ? await uploadBase64Image(current, `pipeline-${processedImage.id}.jpg`, userId)
      : current;

    const updated = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        processedUrl: savedUrl,
        status: 'COMPLETED',
        fileSize: imageSize,
        metadata: JSON.stringify({
          pipeline: done,
          processingCompletedAt: new Date().toISOString(),
        }),
      },
    });

    return { id: updated.id, processedUrl: savedUrl, imageData: current, processSteps: done };
  } catch (error) {
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'pipeline error',
      },
    });
    throw error;
  }
}

export interface OneClickWorkflowParams {
  imageUrl: string;
  referenceImageUrl?: string;
  xScale?: number;
  yScale?: number;
  upscaleFactor?: number;
  enableBackgroundReplace?: boolean;
  enableOutpaint?: boolean;
  enableUpscale?: boolean;
  backgroundPrompt?: string;
  outpaintPrompt?: string;
  enableWatermark?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkType?: 'text' | 'logo';
  watermarkLogoUrl?: string;
  outputResolution?: string;
  aiModel?: string;
  // 视频生成相关参数
  enableVideo?: boolean;
  videoPrompt?: string;
  videoFrames?: number;      // 121(5s) | 241(10s)
  videoAspectRatio?: string; // "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9"
  videoSeed?: number;
  userId: string;
  volcengineConfig?: { accessKey: string; secretKey: string };
  imagehostingConfig?: { superbedToken: string };
  originalImageUrlForRecord?: string;
  referenceImageUrlForRecord?: string;
  watermarkLogoUrlForRecord?: string;
}

export interface OneClickWorkflowResult {
  id: string;
  imageData: string;
  imageSize: number;
  processedUrl: string;
  processSteps: {
    backgroundReplace: boolean;
    outpaint: boolean;
    upscale: boolean;
    watermark: boolean;
    video: boolean;
  };
  videoTaskId?: string;
  videoUrl?: string;
  errors?: {
    backgroundReplace?: string;
    outpaint?: string;
    upscale?: string;
    watermark?: string;
    video?: string;
  };
}

/**
 * 执行一键工作流处理
 * 这是核心业务逻辑，可以被 API 路由和 Worker 共同使用
 */
export async function executeOneClickWorkflow(
  params: OneClickWorkflowParams
): Promise<OneClickWorkflowResult> {
  const {
    imageUrl,
    referenceImageUrl,
    xScale = 2.0,
    yScale = 2.0,
    upscaleFactor = 2,
    enableBackgroundReplace = true,
    enableOutpaint = true,
    enableUpscale = true,
    backgroundPrompt = '',
    outpaintPrompt = '',
    enableWatermark = false,
    watermarkText = 'Sample Watermark',
    watermarkOpacity = 0.3,
    watermarkPosition = 'bottom-right',
    watermarkType = 'text',
    watermarkLogoUrl,
    outputResolution = 'original',
    aiModel = 'gemini',
    // 视频生成参数
    enableVideo = false,
    videoPrompt = '',
    videoFrames = 121,
    videoAspectRatio = '16:9',
    videoSeed = -1,
    userId,
    volcengineConfig,
    imagehostingConfig,
    originalImageUrlForRecord,
    referenceImageUrlForRecord,
    watermarkLogoUrlForRecord
  } = params;

  // 参数验证
  if (!imageUrl) {
    throw new Error('缺少必要参数：imageUrl');
  }

  if (enableBackgroundReplace && !referenceImageUrl) {
    throw new Error('启用背景替换时需要提供参考图片：referenceImageUrl');
  }

  // 配置会在具体调用时检查，这里不再预先检查

  // 创建处理记录
  const processedImage = await prisma.processedImage.create({
    data: {
      filename: `one-click-${Date.now()}.jpg`,
      originalUrl: originalImageUrlForRecord || imageUrl,
      processType: 'ONE_CLICK_WORKFLOW',
      status: 'PROCESSING',
      userId: userId,
      metadata: JSON.stringify({
        xScale,
        yScale,
        upscaleFactor,
        enableBackgroundReplace,
        enableOutpaint,
        enableUpscale,
        backgroundPrompt,
        outpaintPrompt,
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        watermarkType,
        outputResolution,
        aiModel,
        referenceImageUrl: referenceImageUrlForRecord || referenceImageUrl,
        watermarkLogoUrl: watermarkLogoUrlForRecord || watermarkLogoUrl,
        isWorkflowFinal: true
      })
    }
  });

  console.log('=== 创建一键增强处理记录 ===', processedImage.id);

  try {
    let processedImageUrl = imageUrl;
    let hasBackgroundReplace = false;
    let hasOutpaint = false;
    const stepErrors: Record<string, string> = {};

    console.log('=== 开始一键增强处理流程 ===');
    console.log('处理选项:', { enableBackgroundReplace, enableOutpaint, enableUpscale });

    const startTime = Date.now();

    // 步骤1：背景替换
    if (enableBackgroundReplace && referenceImageUrl) {
      console.log(`=== 步骤1/4：开始背景替换 (使用 ${aiModel}) ===`);
      const bgStartTime = Date.now();
      try {
        const prompt = backgroundPrompt || DEFAULT_BACKGROUND_PROMPT;
        
        let bgResultImageData: string | undefined;

        // 根据选择的 AI 模型调用不同的服务
        if (aiModel === 'gpt') {
          const result = await processWithGPT(imageUrl, referenceImageUrl, prompt, userId);
          bgResultImageData = result.imageData;
        } else if (aiModel === 'gemini') {
          const result = await processWithGemini(imageUrl, referenceImageUrl, prompt, userId);
          if (result) bgResultImageData = result;
        } else if (aiModel === 'jimeng') {
          const result = await processWithJimeng(imageUrl, referenceImageUrl, prompt, userId);
          bgResultImageData = result.imageData;
        } else {
          throw new Error(`不支持的 AI 模型: ${aiModel}，请使用 gpt, gemini 或 jimeng`);
        }
        
        if (bgResultImageData) {
          processedImageUrl = bgResultImageData;
          hasBackgroundReplace = true;
          const bgDuration = ((Date.now() - bgStartTime) / 1000).toFixed(2);
          console.log(`背景替换完成 (${aiModel})，耗时: ${bgDuration}秒`);
        } else {
          throw new Error('背景替换返回结果为空');
        }
      } catch (error) {
        console.error('背景替换失败，停止一键增强流程:', error);
        stepErrors.backgroundReplace = getErrorMessage(error);
        stopWorkflow('背景替换', error);
      }
    } else {
      console.log('=== 跳过背景替换步骤 ===');
    }

    // 步骤2：扩图（使用火山引擎）
    if (enableOutpaint) {
      console.log('=== 步骤2/4：开始扩图处理（火山引擎）===');
      console.log('扩图参数: xScale=' + xScale + ', yScale=' + yScale);
      const outpaintStartTime = Date.now();
      try {
        // 将 xScale/yScale 转换为火山引擎的扩展比例
        // xScale=2 表示宽度扩展到原来的2倍，即左右各扩展50%
        const expandRatio = Math.max(xScale - 1, yScale - 1) / 2;
        const top = expandRatio;
        const bottom = expandRatio;
        const left = expandRatio;
        const right = expandRatio;
        
        // 使用统一的服务函数，自动从数据库读取配置
        // 如果传入了 volcengineConfig 则使用传入的配置，否则从数据库读取
        const result = await outpaintWithVolcengine(
          userId,
          processedImageUrl,
          outpaintPrompt || DEFAULT_OUTPAINT_PROMPT,
          top,
          bottom,
          left,
          right,
          2048,
          2048,
          volcengineConfig, // 如果为空，函数内部会从数据库读取
          imagehostingConfig // 图床配置
        );
        processedImageUrl = result.imageData;
        hasOutpaint = true;
        const outpaintDuration = ((Date.now() - outpaintStartTime) / 1000).toFixed(2);
        console.log(`扩图处理完成，图片大小: ${Math.round(result.imageSize / 1024)}KB, 耗时: ${outpaintDuration}秒`);
      } catch (error) {
        console.error('扩图失败，停止一键增强流程:', error);
        stepErrors.outpaint = getErrorMessage(error);
        stopWorkflow('扩图', error);
      }
    } else {
      console.log('=== 跳过扩图步骤 ===');
    }

    // 步骤3：智能画质增强
    if (enableUpscale) {
      console.log(`=== 步骤3/4：开始智能画质增强 (使用 ${aiModel}) ===`);
      const enhanceStartTime = Date.now();
      try {
        // 使用统一的服务函数，自动从数据库读取配置
        const result = await enhanceWithVolcengine(
          userId,
          processedImageUrl,
          '720p',
          false, // enableHdr
          false, // enableWb
          1,     // resultFormat
          95,    // jpgQuality
          true,  // skipDbSave
          volcengineConfig, // 如果为空，函数内部会从数据库读取
          imagehostingConfig // 图床配置
        );
        processedImageUrl = result.imageData;
        
        const enhanceDuration = ((Date.now() - enhanceStartTime) / 1000).toFixed(2);
        console.log(`智能画质增强完成 (${aiModel})，耗时: ${enhanceDuration}秒`);
      } catch (error) {
        console.error('智能画质增强失败，停止一键增强流程:', error);
        stepErrors.upscale = getErrorMessage(error);
        stopWorkflow('智能画质增强', error);
      }
    } else {
      console.log('=== 跳过智能画质增强步骤 ===');
    }

    // 步骤4：添加水印
    if (enableWatermark) {
      console.log('=== 步骤4/5：开始添加水印 ===');
      try {
        const { addWatermarkToImage } = await import('@/lib/watermark');
        processedImageUrl = await addWatermarkToImage({
          imageUrl: processedImageUrl,
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType,
          watermarkLogoUrl,
          outputResolution,
          xScale,
          yScale
        });
        console.log('水印添加完成');
      } catch (error) {
        console.error('水印添加失败，停止一键增强流程:', error);
        stepErrors.watermark = getErrorMessage(error);
        stopWorkflow('水印添加', error);
      }
    } else {
      console.log('=== 跳过水印步骤 ===');
    }

    // 步骤5：视频生成
    let videoTaskId: string | undefined;
    let hasVideo = false;
    if (enableVideo) {
      console.log('=== 步骤5/5：开始视频生成 ===');
      const videoStartTime = Date.now();
      try {
        const { submitVideoTask } = await import('@/app/api/jimeng-video/service');
        const finalPrompt = videoPrompt || '高质量产品视频，流畅自然的动态效果';

        // 使用处理后的图片作为视频首帧
        const videoResult = await submitVideoTask(userId, {
          imageBase64: processedImageUrl,
          prompt: finalPrompt,
          frames: videoFrames,
          aspectRatio: videoAspectRatio,
          seed: videoSeed
        });

        videoTaskId = videoResult.taskId;
        hasVideo = true;
        const videoDuration = ((Date.now() - videoStartTime) / 1000).toFixed(2);
        console.log(`视频生成任务已提交，任务ID: ${videoTaskId}，耗时: ${videoDuration}秒`);
      } catch (error) {
        console.error('视频生成失败:', error);
        stepErrors.video = getErrorMessage(error);
        stopWorkflow('视频生成', error);
      }
    } else {
      console.log('=== 跳过视频生成步骤 ===');
    }

    // 获取最终结果
    let finalImageData = processedImageUrl;
    
    // 计算图片大小
    const imageSize = finalImageData.startsWith('data:')
      ? Math.floor(finalImageData.split(',')[1].length * 0.75)
      : 0;

    console.log('=== 开始保存图片 ===');
    const saveStartTime = Date.now();
    // 保存到本地存储（使用用户配置的保存路径）
    const savedUrl = await uploadBase64Image(finalImageData, `one-click-${processedImage.id}.jpg`, userId);
    const saveDuration = ((Date.now() - saveStartTime) / 1000).toFixed(2);
    console.log(`图片保存完成，耗时: ${saveDuration}秒`);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== 一键增强流程全部完成，总耗时: ${totalDuration}秒 ===`);

    // 更新数据库记录
    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        processedUrl: savedUrl,
        status: 'COMPLETED',
        fileSize: imageSize,
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          processingCompletedAt: new Date().toISOString(),
          processSteps: {
            backgroundReplace: hasBackgroundReplace,
            outpaint: hasOutpaint,
            upscale: enableUpscale,
            watermark: enableWatermark,
            video: hasVideo
          },
          videoTaskId, // 保存视频任务ID
          stepErrors // 记录每一步的错误
        })
      }
    });

    return {
      id: updatedImage.id,
      imageData: finalImageData,
      imageSize,
      processedUrl: savedUrl,
      processSteps: {
        backgroundReplace: hasBackgroundReplace,
        outpaint: hasOutpaint,
        upscale: enableUpscale,
        watermark: enableWatermark,
        video: hasVideo
      },
      videoTaskId,
      errors: stepErrors
    };

  } catch (processingError) {
    // 更新记录状态为失败
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        errorMessage: processingError instanceof Error ? processingError.message : 'Unknown processing error'
      }
    });

    throw processingError;
  }
}
