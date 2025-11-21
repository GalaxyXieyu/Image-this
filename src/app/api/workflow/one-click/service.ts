import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { generateWithJimeng } from '@/app/api/jimeng/service';
import { outpaintWithQwen } from '@/app/api/qwen/service';
import { enhanceWithVolcengine } from '@/app/api/volcengine/service';

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
  userId: string;
  volcengineConfig?: { accessKey: string; secretKey: string };
  imagehostingConfig?: { superbedToken: string };
}

export interface OneClickWorkflowResult {
  id: string;
  imageData: string;
  imageSize: number;
  minioUrl: string;
  processSteps: {
    backgroundReplace: boolean;
    outpaint: boolean;
    upscale: boolean;
    watermark: boolean;
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

    console.log('=== 开始一键增强处理流程 ===');
    console.log('初始图片URL:', imageUrl);
    console.log('参考图片URL:', referenceImageUrl);
    console.log('处理选项:', { enableBackgroundReplace, enableOutpaint, enableUpscale });

    const startTime = Date.now();

    // 步骤1：背景替换
    if (enableBackgroundReplace && referenceImageUrl) {
      console.log('=== 步骤1/4：开始背景替换 ===');
      const bgStartTime = Date.now();
      try {
        const prompt = '保持产品主体完全不变，仅替换背景为类似参考场景的风格，保持产品的形状、材质、特征比例、摆放角度及数量完全一致，专业摄影，高质量，4K分辨率';
        const result = await generateWithJimeng(
          userId,
          prompt,
          [imageUrl, referenceImageUrl],
          2048,
          2048,
          volcengineConfig,
          imagehostingConfig
        );
        processedImageUrl = result.imageData;
        hasBackgroundReplace = true;
        const bgDuration = ((Date.now() - bgStartTime) / 1000).toFixed(2);
        console.log(`背景替换完成，耗时: ${bgDuration}秒`);
      } catch (error) {
        console.error('背景替换失败，继续使用原图:', error);
      }
    } else {
      console.log('=== 跳过背景替换步骤 ===');
    }

    // 步骤2：扩图
    if (enableOutpaint) {
      console.log('=== 步骤2/4：开始扩图处理 ===');
      console.log('扩图参数: xScale=' + xScale + ', yScale=' + yScale);
      const outpaintStartTime = Date.now();
      try {
        const result = await outpaintWithQwen(
          userId,
          processedImageUrl,
          xScale,
          yScale,
          false,
          true,
          volcengineConfig ? { apiKey: volcengineConfig.accessKey } : undefined
        );
        processedImageUrl = result.imageData;
        hasOutpaint = true;
        const outpaintDuration = ((Date.now() - outpaintStartTime) / 1000).toFixed(2);
        console.log(`扩图处理完成，图片大小: ${Math.round(result.imageSize / 1024)}KB, 耗时: ${outpaintDuration}秒`);
      } catch (error) {
        console.error('扩图失败，继续使用当前图片:', error);
      }
    } else {
      console.log('=== 跳过扩图步骤 ===');
    }

    // 步骤3：智能画质增强
    if (enableUpscale) {
      console.log('=== 步骤3/4：开始智能画质增强 ===');
      const enhanceStartTime = Date.now();
      try {
        const result = await enhanceWithVolcengine(
          userId,
          processedImageUrl,
          '720p',
          false,
          false,
          1,
          95,
          true, // 跳过数据库保存，这是工作流中间步骤
          volcengineConfig,
          imagehostingConfig
        );
        processedImageUrl = result.imageData;
        const enhanceDuration = ((Date.now() - enhanceStartTime) / 1000).toFixed(2);
        console.log(`智能画质增强完成，耗时: ${enhanceDuration}秒`);
      } catch (error) {
        console.error('智能画质增强失败，继续使用当前图片:', error);
      }
    } else {
      console.log('=== 跳过智能画质增强步骤 ===');
    }

    // 步骤4：添加水印
    if (enableWatermark) {
      console.log('=== 步骤4/4：开始添加水印 ===');
      console.log('水印参数:', { watermarkText, watermarkOpacity, watermarkPosition, watermarkType, outputResolution });
      try {
        const { addWatermarkToImage } = await import('@/lib/watermark');
        processedImageUrl = await addWatermarkToImage({
          imageUrl: processedImageUrl,
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType,
          watermarkLogoUrl,
          outputResolution
        });
        console.log('水印添加完成');
      } catch (error) {
        console.error('水印添加失败，继续使用当前图片:', error);
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

    console.log('=== 开始上传到MinIO ===');
    const minioStartTime = Date.now();
    // 上传到MinIO
    const minioUrl = await uploadBase64Image(finalImageData, `one-click-${processedImage.id}.jpg`);
    const minioDuration = ((Date.now() - minioStartTime) / 1000).toFixed(2);
    console.log(`MinIO上传完成，耗时: ${minioDuration}秒`);
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`=== 一键增强流程全部完成，总耗时: ${totalDuration}秒 ===`);

    // 更新数据库记录
    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        processedUrl: minioUrl,
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
          }
        })
      }
    });

    return {
      id: updatedImage.id,
      imageData: finalImageData,
      imageSize,
      minioUrl,
      processSteps: {
        backgroundReplace: hasBackgroundReplace,
        outpaint: hasOutpaint,
        upscale: enableUpscale,
        watermark: enableWatermark
      }
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
