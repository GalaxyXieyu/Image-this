import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/minio';
import { uploadImageToAliyun } from '@/lib/aliyun-upload';

interface QwenUpscaleRequest {
  model: string;
  input: {
    function: string;
    prompt: string;
    base_image_url: string;
  };
  parameters: {
    upscale_factor: number;
    n: number;
  };
}

// 轮询任务结果 (高清化)
async function pollUpscaleTaskResult(taskId: string, apiKey: string): Promise<Blob> {
  const maxAttempts = 30;
  const pollInterval = 2000; // 2秒

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Task polling error: ${response.statusText}`);
    }

    const result = await response.json();
    const status = result.output?.task_status;

    if (status === 'FAILED') {
      const errorMessage = result.output?.message || result.message || '未知错误';
      const errorCode = result.output?.code || result.code || 'UNKNOWN';
      // console.error('高清化任务失败详情:', JSON.stringify(result, null, 2));
      throw new Error(`高清化任务失败: ${errorCode} - ${errorMessage}`);
    }

    if (status === 'SUCCEEDED') {
      // 从 results 数组中获取图片 URL
      const imageUrl = result.output.results?.[0]?.url;

      if (!imageUrl) {
        throw new Error('未找到高清化结果图片');
      }

      // 下载最终图像
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('下载高清化结果图像失败');
      }

      return imageResponse.blob();
    }

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('高清化任务超时');
}

// 提交高清化任务
async function submitUpscaleTask(
  ossImageUrl: string,
  apiKey: string,
  upscaleFactor: number = 2
): Promise<string> {
  const request = {
    model: 'wanx2.1-imageedit',
    input: {
      function: 'super_resolution',
      prompt: '图像超分。',
      base_image_url: ossImageUrl
    },
    parameters: {
      upscale_factor: upscaleFactor,
      n: 1
    }
  };

  const response = await fetch(
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
        'X-DashScope-OssResourceResolve': 'enable'
      },
      body: JSON.stringify(request)
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`高清化任务提交失败 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const taskId = result.output?.task_id;

  if (!taskId) {
    throw new Error('任务提交失败，未获取到 task_id');
  }

  return taskId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let userId: string;

    // 检查是否是服务端调用（包含userId参数）
    if (body.userId && body.serverCall) {
      // 服务端调用模式：直接使用传入的userId
      userId = body.userId;
    } else {
      // 正常客户端调用：验证用户身份
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: '未授权访问' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    const {
      imageUrl,
      upscaleFactor = 2,
      prompt = '图像超分。',
      projectId,
      useRealApi = true  // 新增参数，控制是否使用真实API
    } = body;

    // 验证必要参数
    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    // 获取API Key
    const qwenApiKey = process.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return NextResponse.json(
        { error: '服务配置错误：缺少QWEN_API_KEY' },
        { status: 500 }
      );
    }

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `upscale-${Date.now()}.jpg`,
        originalUrl: 'temp', // 临时值，稍后更新
        processType: 'IMAGE_UPSCALING',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          upscaleFactor,
          prompt,
          originalImageSize: imageUrl.length
        }),
        userId: userId, // 使用正确的用户ID
        projectId: projectId || null
      }
    });

    // console.log('创建高清化处理记录:', processedImage.id);
    // console.log('高清化API调用:', {
    //   upscaleFactor,
    //   prompt,
    //   imageUrlLength: imageUrl.length
    // });

    try {
      let resultImageData: string;
      let imageSize: number;
      let taskId: string;

      if (useRealApi) {
        // 使用真实的阿里云API
        // 1. 上传图片到阿里云临时存储
        const ossImageUrl = await uploadImageToAliyun(
          qwenApiKey,
          'wanx2.1-imageedit',
          imageUrl,
          `upscale-input-${processedImage.id}.jpg`
        );

        // 2. 提交高清化任务
        taskId = await submitUpscaleTask(ossImageUrl, qwenApiKey, upscaleFactor);

        // 3. 轮询任务结果
        const resultBlob = await pollUpscaleTaskResult(taskId, qwenApiKey);

        // 4. 转换结果为base64
        const arrayBuffer = await resultBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        resultImageData = `data:image/jpeg;base64,${base64}`;
        imageSize = arrayBuffer.byteLength;
      } else {
        // 模拟模式 (保留原有逻辑)
        await new Promise(resolve => setTimeout(resolve, 2000));
        taskId = `mock_upscale_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        if (imageUrl.startsWith('data:')) {
          const base64Data = imageUrl.split(',')[1];
          imageSize = Math.floor(base64Data.length * 0.75);
          resultImageData = imageUrl;
        } else {
          try {
            const response = await fetch(imageUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              resultImageData = `data:image/jpeg;base64,${base64}`;
              imageSize = arrayBuffer.byteLength;
            } else {
              throw new Error('无法下载图片');
            }
          } catch (error) {
            resultImageData = imageUrl;
            imageSize = 100000;
          }
        }
      }

      // 上传到MinIO
      // console.log('正在上传高清化结果到MinIO...');
      const minioUrl = await uploadBase64ImageToMinio(
        resultImageData,
        `upscale-${processedImage.id}.jpg`
      );

      // 上传原始图片到MinIO（用于记录）
      const originalMinioUrl = await uploadBase64ImageToMinio(
        imageUrl,
        `original-${processedImage.id}.jpg`
      );

      // 更新数据库记录
      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalMinioUrl,
          processedUrl: minioUrl,
          status: 'COMPLETED',
          fileSize: imageSize,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            taskId: taskId,
            processingCompletedAt: new Date().toISOString(),
            useRealApi: useRealApi
          })
        }
      });

      // console.log('高清化处理完成:', updatedImage.id);

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          taskId: taskId,
          imageData: resultImageData,
          imageSize: imageSize,
          minioUrl: minioUrl,
          upscaleFactor
        },
        message: useRealApi ? '图像高清化成功' : '图像高清化成功 (模拟模式 - 返回原图)'
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
    // console.error('Qwen Upscale Error (Mock):', error);
    return NextResponse.json(
      { error: '图像高清化失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}