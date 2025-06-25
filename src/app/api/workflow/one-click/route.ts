import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/minio';

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

// 轮询任务结果
async function pollTaskResult(taskId: string, apiKey: string, type: 'outpaint' | 'upscale' = 'outpaint'): Promise<Blob> {
  const maxAttempts = 30;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetchWithTimeoutAndRetry(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      // console.error(`任务轮询请求失败: ${response.status} ${response.statusText}`);
      throw new Error(`Task polling error: ${response.statusText}`);
    }

    const result = await response.json();
    const status = result.output?.task_status;
    // console.log(`任务状态: ${status}`, result.output);

    if (status === 'FAILED') {
      // console.error(`${type === 'outpaint' ? '扩图' : '高清化'}任务失败，详细信息:`, JSON.stringify(result, null, 2));
      const errorMessage = result.output?.message || result.message || '未知错误';
      throw new Error(`${type === 'outpaint' ? '扩图' : '高清化'}任务失败: ${errorMessage}`);
    }

    if (status === 'SUCCEEDED') {
      let imageUrl: string;
      
      if (type === 'upscale') {
        imageUrl = result.output.results[0].url;
      } else {
        imageUrl = result.output.output_image_url;
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('下载结果图像失败');
      }
      
      return imageResponse.blob();
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`${type === 'outpaint' ? '扩图' : '高清化'}任务超时`);
}

// 背景替换函数
async function replaceBackground(imageUrl: string, referenceImageUrl: string, gptApiKey: string, gptApiUrl: string): Promise<string> {
  // console.log('开始背景替换处理...');
  
  function extractBase64FromDataUrl(dataUrl: string): string {
    if (dataUrl.startsWith('data:')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  }

  function base64ToBuffer(base64: string): Buffer {
    return Buffer.from(base64, 'base64');
  }

  try {
    const FormData = require('form-data');
    
    // 创建FormData
    const formData = new FormData();
    
    // 处理输入的图片URL（可能是base64或http URL）
    let originalImageBuffer: Buffer;
    let referenceImageBuffer: Buffer;

    if (imageUrl.startsWith('data:')) {
      // base64格式
      const base64Data = extractBase64FromDataUrl(imageUrl);
      originalImageBuffer = base64ToBuffer(base64Data);
    } else {
      // HTTP URL，需要下载
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('下载原始图片失败');
      }
      const arrayBuffer = await response.arrayBuffer();
      originalImageBuffer = Buffer.from(arrayBuffer);
    }

    if (referenceImageUrl.startsWith('data:')) {
      // base64格式
      const base64Data = extractBase64FromDataUrl(referenceImageUrl);
      referenceImageBuffer = base64ToBuffer(base64Data);
    } else {
      // HTTP URL，需要下载
      const response = await fetch(referenceImageUrl);
      if (!response.ok) {
        throw new Error('下载参考图片失败');
      }
      const arrayBuffer = await response.arrayBuffer();
      referenceImageBuffer = Buffer.from(arrayBuffer);
    }
    
    formData.append('image', originalImageBuffer, {
      filename: 'original.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('image', referenceImageBuffer, {
      filename: 'reference.jpg', 
      contentType: 'image/jpeg'
    });
    formData.append('prompt', '把第二张图的产品替换成第一张图的产品，其他都不要改变');
    formData.append('n', '1');
    formData.append('size', '1024x1024');

    const apiUrl = gptApiUrl.endsWith('/') ?
      `${gptApiUrl}v1/images/edits` :
      `${gptApiUrl}/v1/images/edits`;

    const response = await fetchWithTimeoutAndRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gptApiKey}`,
        'User-Agent': 'Node.js API Client',
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`背景替换失败: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    // console.log('GPT API 响应:', JSON.stringify(result, null, 2));

    // 从新的API响应格式中提取base64图片
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const firstItem = result.data[0];
      if (firstItem && firstItem.b64_json) {
        // 返回base64格式的图片数据
        return `data:image/png;base64,${firstItem.b64_json}`;
      }
    }

    throw new Error('背景替换失败：无法从GPT响应中获取生成的图片');

  } catch (error) {
    throw error;
  }
}

// 扩图函数
async function outpaintImage(imageUrl: string, apiKey: string, xScale = 2.0, yScale = 2.0) {

  const request = {
    model: 'image-out-painting',
    input: { image_url: imageUrl },
    parameters: {
      x_scale: xScale,
      y_scale: yScale,
      best_quality: false,
      limit_image_size: true
    }
  };

  // console.log('扩图API请求参数:', JSON.stringify(request, null, 2));

  const response = await fetchWithTimeoutAndRetry(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/out-painting',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable'
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`扩图任务提交失败: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  // console.log('扩图任务提交响应:', JSON.stringify(result, null, 2));

  const taskId = result.output?.task_id;

  if (!taskId) {
    throw new Error('扩图任务提交失败，未获取到 task_id');
  }

  // console.log('扩图任务提交成功，task_id:', taskId);
  return pollTaskResult(taskId, apiKey, 'outpaint');
}

// 高清化函数
async function upscaleImage(imageUrl: string, apiKey: string, upscaleFactor = 2) {
  // 导入阿里云上传函数
  const { uploadImageToAliyun } = await import('@/lib/aliyun-upload');

  // 1. 上传图片到阿里云临时存储
  const ossImageUrl = await uploadImageToAliyun(
    apiKey,
    'wanx2.1-imageedit',
    imageUrl,
    `upscale-workflow-${Date.now()}.jpg`
  );

  const request = {
    model: 'wanx2.1-imageedit',
    input: {
      function: 'super_resolution',
      prompt: '图像超分。',
      base_image_url: ossImageUrl  // 使用OSS URL
    },
    parameters: {
      upscale_factor: upscaleFactor,
      n: 1
    }
  };

  const response = await fetchWithTimeoutAndRetry(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
        'X-DashScope-OssResourceResolve': 'enable'  // 添加OSS资源解析头
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    throw new Error(`高清化任务提交失败: ${response.statusText}`);
  }

  const result = await response.json();
  const taskId = result.output?.task_id;

  if (!taskId) {
    throw new Error('高清化任务提交失败，未获取到 task_id');
  }

  return pollTaskResult(taskId, apiKey, 'upscale');
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
      enableUpscale = true
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
          referenceImageUrl
        })
      }
    });

    // console.log('创建一键增强处理记录:', processedImage.id);

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

    // console.log('开始一键增强处理流程...');
    // console.log('初始图片URL:', imageUrl);
    // console.log('参考图片URL:', referenceImageUrl);
    // console.log('处理选项:', { enableBackgroundReplace, enableOutpaint, enableUpscale });

    // 步骤1：背景替换
    if (enableBackgroundReplace && referenceImageUrl) {
      // console.log('=== 步骤1：开始背景替换 ===');
      try {
        backgroundResult = await replaceBackground(imageUrl, referenceImageUrl, gptApiKey!, gptApiUrl);
        processedImageUrl = backgroundResult;
        // console.log('背景替换完成，新图片URL:', processedImageUrl);
      } catch (error) {
        // 背景替换失败，继续使用原图进行后续处理
        // console.error('背景替换失败，继续使用原图:', error);
      }
    } else {
      // console.log('=== 跳过背景替换步骤 ===');
    }

    // 步骤2：扩图
    if (enableOutpaint) {
      // console.log('=== 步骤2：开始扩图处理 ===');
      // console.log('扩图输入URL:', processedImageUrl);
      try {
        outpaintResult = await outpaintImage(processedImageUrl, qwenApiKey, xScale, yScale);

        // 将扩图结果转换为可用的 URL
        const arrayBuffer = await outpaintResult.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        processedImageUrl = `data:image/jpeg;base64,${base64}`;
        // console.log('扩图处理完成，新图片大小:', arrayBuffer.byteLength, 'bytes');

        // 步骤2.5：裁切扩图结果去除水印
        try {
          const { cropImage } = await import('@/lib/image-crop');
          processedImageUrl = await cropImage(processedImageUrl, 0.1); // 裁切10%
          // console.log('扩图结果裁切完成，已去除水印');
        } catch (cropError) {
          // console.error('裁切失败，继续使用原扩图结果:', cropError);
        }
      } catch (error) {
        // 扩图失败，继续使用当前图片进行后续处理
        // console.error('扩图失败，继续使用当前图片:', error);
      }
    } else {
      // console.log('=== 跳过扩图步骤 ===');
    }

    // 步骤3：高清化
    if (enableUpscale) {
      // console.log('=== 步骤3：开始高清化处理 ===');
      // console.log('高清化输入URL:', processedImageUrl);
      try {
        upscaleResult = await upscaleImage(processedImageUrl, qwenApiKey, upscaleFactor);

        // 将高清化结果转换为可用的 URL
        const arrayBuffer = await upscaleResult.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        processedImageUrl = `data:image/jpeg;base64,${base64}`;
        // console.log('高清化处理完成，新图片大小:', arrayBuffer.byteLength, 'bytes');
      } catch (error) {
        // 高清化失败，继续使用当前图片
        // console.error('高清化失败，继续使用当前图片:', error);
      }
    } else {
      // console.log('=== 跳过高清化步骤 ===');
    }

    // 获取最终结果
    const finalResult = upscaleResult || outpaintResult;
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

      // 上传到MinIO
      const minioUrl = await uploadBase64ImageToMinio(finalImageData, `one-click-${processedImage.id}.jpg`);

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
              upscale: enableUpscale && !!upscaleResult
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
            upscale: enableUpscale && !!upscaleResult
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