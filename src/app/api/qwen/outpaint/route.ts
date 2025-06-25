import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/minio';

interface QwenOutpaintingRequest {
  model: string;
  input: {
    image_url: string;
  };
  parameters: {
    x_scale: number;
    y_scale: number;
    best_quality: boolean;
    limit_image_size: boolean;
  };
}

// 轮询任务结果
async function pollTaskResult(taskId: string, apiKey: string): Promise<Blob> {
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
      // console.error('扩图任务失败详情:', JSON.stringify(result, null, 2));
      throw new Error(`扩图任务失败: ${errorCode} - ${errorMessage}`);
    }

    if (status === 'SUCCEEDED') {
      const imageUrl = result.output.output_image_url;
      
      // 下载最终图像
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('下载结果图像失败');
      }
      
      return imageResponse.blob();
    }

    // 等待后重试
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('扩图任务超时');
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
      xScale = 2.0,
      yScale = 2.0,
      bestQuality = false,
      limitImageSize = true,
      projectId
    } = body;

    // 验证必要参数
    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    // 从环境变量获取 API Key
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: '通义千问 API 配置缺失' },
        { status: 500 }
      );
    }

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `outpaint-${Date.now()}.jpg`,
        originalUrl: 'temp', // 临时值，稍后更新
        processType: 'IMAGE_EXPANSION',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          xScale,
          yScale,
          bestQuality,
          limitImageSize,
          originalImageSize: imageUrl.length
        }),
        userId: userId,
        projectId: projectId || null
      }
    });

    // console.log('创建扩图处理记录:', processedImage.id);

    // 构建扩图请求
    const qwenRequest: QwenOutpaintingRequest = {
      model: 'image-out-painting',
      input: {
        image_url: imageUrl
      },
      parameters: {
        x_scale: xScale,
        y_scale: yScale,
        best_quality: bestQuality,
        limit_image_size: limitImageSize
      }
    };

    // 提交任务
    const submitResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/out-painting',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(qwenRequest)
      }
    );

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      // console.error('Qwen Outpainting Submit Error:', errorText);
      return NextResponse.json(
        { error: `扩图任务提交失败: ${submitResponse.statusText} - ${errorText}` },
        { status: submitResponse.status }
      );
    }

    const submitResult = await submitResponse.json();
    const taskId = submitResult.output?.task_id;

    if (!taskId) {
      return NextResponse.json(
        { error: '任务提交失败，未获取到 task_id' },
        { status: 500 }
      );
    }

    try {
      // 轮询任务结果
      const resultBlob = await pollTaskResult(taskId, apiKey);

      // 将 Blob 转换为 Base64
      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      let imageDataUrl = `data:image/jpeg;base64,${base64}`;

      // 裁切扩图结果去除水印
      try {
        const { cropImage } = await import('@/lib/image-crop');
        imageDataUrl = await cropImage(imageDataUrl, 0.1); // 裁切10%
      } catch (cropError) {
        // 裁切失败，继续使用原扩图结果
        console.error('扩图结果裁切失败:', cropError);
      }

      // 计算最终图片大小
      const finalImageSize = imageDataUrl.startsWith('data:')
        ? Math.floor(imageDataUrl.split(',')[1].length * 0.75)
        : arrayBuffer.byteLength;

      // 上传到MinIO
      // console.log('正在上传扩图结果到MinIO...');
      const minioUrl = await uploadBase64ImageToMinio(
        imageDataUrl,
        `outpaint-${processedImage.id}.jpg`
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
          fileSize: finalImageSize,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            taskId,
            processingCompletedAt: new Date().toISOString()
          })
        }
      });

      // console.log('扩图处理完成:', updatedImage.id);

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          taskId,
          imageData: imageDataUrl,
          imageSize: finalImageSize,
          minioUrl: minioUrl
        },
        message: '图像扩图成功'
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
    // console.error('Qwen Outpaint Error:', error);
    return NextResponse.json(
      { error: '图像扩图失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}