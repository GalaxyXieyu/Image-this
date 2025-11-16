import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/storage';
import { generateWithJimeng } from '@/app/api/jimeng/service';
import { outpaintWithQwen } from '@/app/api/qwen/service';
import { enhanceWithVolcengine } from '@/app/api/volcengine/service';

// 带超时和重试的fetch函数
async function fetchWithTimeoutAndRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number = 500000, // 500秒超时
  maxRetries: number = 1
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('All retry attempts failed');
}



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,              // 要处理的图片URL
      referenceImageUrl,     // 参考图片URL（用于背景替换）
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
      outputResolution = 'original'
    } = body;

    // 一键增强只处理单张图片
    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    if (enableBackgroundReplace && !referenceImageUrl) {
      return NextResponse.json(
        { error: '启用背景替换时需要提供参考图片：referenceImageUrl' },
        { status: 400 }
      );
    }

    // 检查是否是服务端调用（包含userId参数）
    let userId: string;
    if (body.userId && body.serverCall) {
      // 服务端调用模式：直接使用传入的userId
      userId = body.userId;
    } else {
      // 正常客户端调用：验证用户身份
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: '用户未登录' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

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
          referenceImageUrl
        })
      }
    });

    console.log('=== 创建一键增强处理记录 ===', processedImage.id);

    try {
      // 检查API配置
      const qwenApiKey = process.env.QWEN_API_KEY;
      const gptApiKey = process.env.GPT_API_KEY;
      const gptApiUrl = process.env.GPT_API_URL || 'https://api.openai.com';

      if (!qwenApiKey) {
        // 更新记录状态为失败
        await prisma.processedImage.update({
          where: { id: processedImage.id },
          data: {
            status: 'FAILED',
            errorMessage: '通义千问 API 配置缺失'
          }
        });
        return NextResponse.json(
          { error: '通义千问 API 配置缺失' },
          { status: 500 }
        );
      }

      if (enableBackgroundReplace && !gptApiKey) {
        // 更新记录状态为失败
        await prisma.processedImage.update({
          where: { id: processedImage.id },
          data: {
            status: 'FAILED',
            errorMessage: '背景替换需要 GPT API 配置'
          }
        });
        return NextResponse.json(
          { error: '背景替换需要 GPT API 配置' },
          { status: 400 }
        );
      }

    // 处理单张图片
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
          2048
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
          yScale
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
          95
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
        processedImageUrl = await addWatermarkToImage(
          processedImageUrl,
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType,
          watermarkLogoUrl,
          outputResolution
        );
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
      const minioUrl = await uploadBase64ImageToMinio(finalImageData, `one-click-${processedImage.id}.jpg`);
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

      return NextResponse.json({
        success: true,
        data: {
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
        },
        message: '一键AI增强处理完成'
      });

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

  } catch (error) {
    // console.error('One-Click Workflow Error:', error);
    return NextResponse.json(
      { error: '一键处理失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}