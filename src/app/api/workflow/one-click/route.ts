import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/storage';

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


// 使用即梦生成图片（替换GPT背景替换）
async function generateWithJimeng(productImageUrl: string, referenceImageUrl: string): Promise<string> {
  try {
    const prompt = `将产品图片放置到场景图片中，保持产品的形状、材质、特征比例、摆放角度及数量完全一致，仅保留产品包装外壳，禁用背景虚化效果，确保画面清晰，专业摄影，高质量，4K分辨率`;

    const apiUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/api/jimeng/generate`
      : 'http://localhost:3000/api/jimeng/generate';

    const response = await fetchWithTimeoutAndRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        referenceImage: productImageUrl,  // 产品图
        width: 2048,
        height: 2048,
        serverCall: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`即梦生成失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success && result.data?.imageData) {
      return result.data.imageData;  // 返回base64图片数据
    }

    throw new Error('即梦生成失败：无法获取生成的图片');

  } catch (error) {
    throw error;
  }
}

// 使用火山引擎智能扩图（替换Qwen扩图）
async function outpaintImage(imageUrl: string, xScale = 2.0, yScale = 2.0) {
  console.log('[智能扩图] 开始处理...');
  const startTime = Date.now();
  
  // 计算扩展比例（火山引擎使用0-1的比例）
  const top = Math.min((yScale - 1) / 2, 1.0);
  const bottom = Math.min((yScale - 1) / 2, 1.0);
  const left = Math.min((xScale - 1) / 2, 1.0);
  const right = Math.min((xScale - 1) / 2, 1.0);

  const apiUrl = process.env.NODE_ENV === 'production' 
    ? `${process.env.NEXTAUTH_URL}/api/volcengine/outpaint`
    : 'http://localhost:3000/api/volcengine/outpaint';

  const response = await fetchWithTimeoutAndRetry(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      imageUrl,
      prompt: '扩展图像，保持风格一致',
      top,
      bottom,
      left,
      right,
      maxHeight: 1920,
      maxWidth: 1920,
      serverCall: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`智能扩图失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[智能扩图] 处理完成，耗时: ${duration}秒`);
  
  if (result.success && result.data?.imageData) {
    // 将base64转换为Blob
    const base64Data = result.data.imageData.split(',')[1];
    const binaryData = Buffer.from(base64Data, 'base64');
    return new Blob([binaryData], { type: 'image/jpeg' });
  }

  throw new Error('智能扩图失败：无法获取结果图片');
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
    let backgroundResult: string | null = null;
    let outpaintResult: Blob | null = null;
    let upscaleResult: Blob | null = null;

    console.log('=== 开始一键增强处理流程 ===');
    console.log('初始图片URL:', imageUrl);
    console.log('参考图片URL:', referenceImageUrl);
    console.log('处理选项:', { enableBackgroundReplace, enableOutpaint, enableUpscale });

    const startTime = Date.now();

    // 步骤1：背景替换
    if (enableBackgroundReplace && referenceImageUrl) {
      console.log('=== 步骤1/3：开始背景替换 ===');
      const bgStartTime = Date.now();
      try {
        backgroundResult = await generateWithJimeng(imageUrl, referenceImageUrl);
        processedImageUrl = backgroundResult;
        const bgDuration = ((Date.now() - bgStartTime) / 1000).toFixed(2);
        console.log(`背景替换完成，耗时: ${bgDuration}秒`);
      } catch (error) {
        // 背景替换失败，继续使用原图进行后续处理
        console.error('背景替换失败，继续使用原图:', error);
      }
    } else {
      console.log('=== 跳过背景替换步骤 ===');
    }

    // 步骤2：扩图
    if (enableOutpaint) {
      console.log('=== 步骤2/3：开始扩图处理 ===');
      console.log('扩图参数: xScale=' + xScale + ', yScale=' + yScale);
      const outpaintStartTime = Date.now();
      try {
        outpaintResult = await outpaintImage(processedImageUrl, xScale, yScale);

        // 将扩图结果转换为可用的 URL
        const arrayBuffer = await outpaintResult.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        processedImageUrl = `data:image/jpeg;base64,${base64}`;
        const outpaintDuration = ((Date.now() - outpaintStartTime) / 1000).toFixed(2);
        console.log(`扩图处理完成，图片大小: ${Math.round(arrayBuffer.byteLength / 1024)}KB, 耗时: ${outpaintDuration}秒`);

        // 步骤2.5：裁切扩图结果去除水印
        try {
          const cropStartTime = Date.now();
          const { cropImage } = await import('@/lib/image-crop');
          processedImageUrl = await cropImage(processedImageUrl, 0.1); // 裁切10%
          const cropDuration = ((Date.now() - cropStartTime) / 1000).toFixed(2);
          console.log(`扩图结果裁切完成，耗时: ${cropDuration}秒`);
        } catch (cropError) {
          console.error('裁切失败，继续使用原扩图结果:', cropError);
        }
      } catch (error) {
        // 扩图失败，继续使用当前图片进行后续处理
        console.error('扩图失败，继续使用当前图片:', error);
      }
    } else {
      console.log('=== 跳过扩图步骤 ===');
    }

    // 步骤3：添加水印（跳过高清化，即梦已生成2048x2048高分辨率）
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
    const finalResult = outpaintResult;  // 不再需要upscaleResult
    let finalImageData = processedImageUrl;
    let imageSize = 0;

    if (finalResult) {
      const finalArrayBuffer = await finalResult.arrayBuffer();
      imageSize = finalArrayBuffer.byteLength;
      if (!processedImageUrl.startsWith('data:')) {
        const finalBase64 = Buffer.from(finalArrayBuffer).toString('base64');
        finalImageData = `data:image/jpeg;base64,${finalBase64}`;
      }
    }

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
              backgroundReplace: enableBackgroundReplace && !!backgroundResult,
              outpaint: enableOutpaint && !!outpaintResult,
              upscale: enableUpscale && !!upscaleResult,
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
            backgroundReplace: enableBackgroundReplace && !!backgroundResult,
            outpaint: enableOutpaint && !!outpaintResult,
            upscale: enableUpscale && !!upscaleResult,
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