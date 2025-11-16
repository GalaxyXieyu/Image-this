/**
 * 通义千问图像处理服务
 * 提供扩图功能的直接调用
 */

import { prisma } from './prisma';

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
  const pollInterval = 2000;

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
      throw new Error(`扩图任务失败: ${errorCode} - ${errorMessage}`);
    }

    if (status === 'SUCCEEDED') {
      const imageUrl = result.output.output_image_url;
      
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('下载结果图像失败');
      }
      
      return imageResponse.blob();
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('扩图任务超时');
}

/**
 * 通义千问扩图 - 直接调用版本
 * @param userId 用户ID
 * @param imageUrl 图片base64 Data URL
 * @param xScale X轴扩展倍数
 * @param yScale Y轴扩展倍数
 * @param bestQuality 是否最佳质量
 * @param limitImageSize 是否限制图片大小
 */
export async function outpaintWithQwen(
  userId: string,
  imageUrl: string,
  xScale = 2.0,
  yScale = 2.0,
  bestQuality = false,
  limitImageSize = true
) {
  const startTime = Date.now();
  console.log(`[Qwen扩图服务] 开始处理，用户ID: ${userId}`);
  console.log(`[Qwen扩图服务] 扩展比例 - xScale: ${xScale}, yScale: ${yScale}`);

  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('通义千问 API 配置缺失');
  }

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: `outpaint-${Date.now()}.jpg`,
      originalUrl: 'temp',
      processType: 'IMAGE_EXPANSION',
      status: 'PROCESSING',
      metadata: JSON.stringify({
        xScale,
        yScale,
        bestQuality,
        limitImageSize,
        originalImageSize: imageUrl.length
      }),
      userId,
      projectId: null
    }
  });

  try {
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

    console.log(`[Qwen扩图服务] 提交扩图任务...`);
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
      throw new Error(`扩图任务提交失败: ${submitResponse.statusText} - ${errorText}`);
    }

    const submitResult = await submitResponse.json();
    const taskId = submitResult.output?.task_id;

    if (!taskId) {
      throw new Error('任务提交失败，未获取到 task_id');
    }

    console.log(`[Qwen扩图服务] 任务ID: ${taskId}，开始轮询结果...`);

    const resultBlob = await pollTaskResult(taskId, apiKey);

    const arrayBuffer = await resultBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    let imageDataUrl = `data:image/jpeg;base64,${base64}`;

    // 裁切扩图结果去除水印
    try {
      const { cropImage } = await import('./image-crop');
      imageDataUrl = await cropImage(imageDataUrl, 0.1);
      console.log(`[Qwen扩图服务] 裁切水印完成`);
    } catch (cropError) {
      console.error('[Qwen扩图服务] 裁切失败:', cropError);
    }

    const finalImageSize = imageDataUrl.startsWith('data:')
      ? Math.floor(imageDataUrl.split(',')[1].length * 0.75)
      : arrayBuffer.byteLength;

    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        originalUrl: '',
        processedUrl: '',
        status: 'COMPLETED',
        fileSize: finalImageSize,
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          taskId,
          processingCompletedAt: new Date().toISOString()
        })
      }
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Qwen扩图服务] 处理完成，总耗时: ${totalDuration}秒`);

    return {
      id: updatedImage.id,
      taskId,
      imageData: imageDataUrl,
      imageSize: finalImageSize
    };

  } catch (error) {
    console.error(`[Qwen扩图服务] 处理失败:`, error);
    
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
      }
    });

    throw error;
  }
}
