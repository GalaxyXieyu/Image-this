import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { processWithGemini, processWithGPT, processWithJimeng, outpaintWithVolcengine, enhanceWithVolcengine } from '@/lib/image-processor/service';

export interface OneClickWorkflowParams {
  imageUrl: string;
  referenceImageUrl?: string;
  xScale?: number;
  yScale?: number;
  upscaleFactor?: number;
  enableBackgroundReplace?: boolean;
  enableOutpaint?: boolean;
  enableUpscale?: boolean;
  enableWatermark?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  watermarkType?: 'text' | 'logo';
  watermarkLogoUrl?: string;
  outputResolution?: string;
  aiModel?: string;
  userId: string;
  volcengineConfig?: { accessKey: string; secretKey: string };
  imagehostingConfig?: { superbedToken: string };
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
  };
  errors?: {
    backgroundReplace?: string;
    outpaint?: string;
    upscale?: string;
    watermark?: string;
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
    enableWatermark = false,
    watermarkText = 'Sample Watermark',
    watermarkOpacity = 0.3,
    watermarkPosition = 'bottom-right',
    watermarkType = 'text',
    watermarkLogoUrl,
    outputResolution = 'original',
    aiModel = 'jimeng',
    userId,
    volcengineConfig,
    imagehostingConfig
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
      originalUrl: imageUrl,
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
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        watermarkType,
        outputResolution,
        aiModel,
        referenceImageUrl,
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
        const prompt = '保持第一张图的产品主体完全不变，仅替换第二张图的背景为类似参考场景的风格（要完全把第二张图的产品去掉），不要有同时出现的情况，保持第一张产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
        
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
        console.error('背景替换失败，继续使用原图:', error);
        stepErrors.backgroundReplace = error instanceof Error ? error.message : String(error);
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
          '扩展图像，保持产品主体和风格完全一致，自然延伸背景',
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
        console.error('扩图失败，继续使用当前图片:', error);
        stepErrors.outpaint = error instanceof Error ? error.message : String(error);
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
        console.error('智能画质增强失败，继续使用当前图片:', error);
        stepErrors.upscale = error instanceof Error ? error.message : String(error);
      }
    } else {
      console.log('=== 跳过智能画质增强步骤 ===');
    }

    // 步骤4：添加水印
    if (enableWatermark) {
      console.log('=== 步骤4/4：开始添加水印 ===');
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
        console.error('水印添加失败，继续使用当前图片:', error);
        stepErrors.watermark = error instanceof Error ? error.message : String(error);
      }
    } else {
      console.log('=== 跳过水印步骤 ===');
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
            watermark: enableWatermark
          },
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
        watermark: enableWatermark
      },
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
