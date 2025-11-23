/**
 * 通义千问图片处理器
 * 提供扩图功能
 */

import { IImageProcessor, ProcessResult, QwenConfig } from '../types';
import { postJson, getJson, downloadBlob } from '../utils/api-client';

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

export class QwenProcessor implements IImageProcessor {
  constructor(private config: QwenConfig) {}

  /**
   * 扩图功能
   */
  async outpaint(userId: string, imageUrl: string, params?: any): Promise<ProcessResult> {
    const {
      xScale = 2.0,
      yScale = 2.0,
      bestQuality = false,
      limitImageSize = true
    } = params || {};

    if (!this.config.apiKey) {
      throw new Error('QWEN_NOT_CONFIGURED:请先配置通义千问 API Key');
    }

    console.log(`[Qwen Processor] 扩图开始 - xScale: ${xScale}, yScale: ${yScale}`);

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

      // 提交任务
      const submitResult = await postJson(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/out-painting',
        qwenRequest,
        {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-DashScope-Async': 'enable'
        },
        { timeout: 30000 }
      );

      const taskId = submitResult.output?.task_id;
      if (!taskId) {
        throw new Error('任务提交失败，未获取到 task_id');
      }

      console.log(`[Qwen Processor] 任务ID: ${taskId}`);

      // 轮询任务结果
      const resultBlob = await this.pollTaskResult(taskId);

      // 转换为 base64
      const arrayBuffer = await resultBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const imageDataUrl = `data:image/jpeg;base64,${base64}`;

      // 裁切去除水印（可选）
      let finalImageData = imageDataUrl;
      try {
        const { cropImage } = await import('@/lib/image-crop');
        finalImageData = await cropImage(imageDataUrl, 0.1);
      } catch (cropError) {
        console.warn('[Qwen Processor] 裁切失败，使用原图');
      }

      const imageSize = Math.floor(base64.length * 0.75);
      console.log(`[Qwen Processor] 完成 - 大小: ${(imageSize / 1024).toFixed(0)}KB`);

      return {
        id: `qwen-${Date.now()}`,
        imageData: finalImageData,
        imageSize,
        metadata: { taskId, xScale, yScale }
      };

    } catch (error) {
      console.error(`[Qwen Processor] 失败:`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * 轮询任务结果
   */
  private async pollTaskResult(taskId: string): Promise<Blob> {
    const maxAttempts = 30;
    const pollInterval = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await getJson(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          { 'Authorization': `Bearer ${this.config.apiKey}` },
          { timeout: 10000 }
        );

        const status = result.output?.task_status;

        if (status === 'FAILED') {
          const errorMessage = result.output?.message || result.message || '未知错误';
          const errorCode = result.output?.code || result.code || 'UNKNOWN';
          throw new Error(`扩图任务失败: ${errorCode} - ${errorMessage}`);
        }

        if (status === 'SUCCEEDED') {
          const imageUrl = result.output.output_image_url;
          const imageBlob = await downloadBlob(imageUrl);
          
          console.log(`[Qwen Processor] 任务完成 - 轮询次数: ${attempt + 1}`);
          return imageBlob;
        }

        // 只在每5次轮询时打印一次日志
        if (attempt % 5 === 0) {
          console.log(`[Qwen Processor] 轮询中... (${attempt + 1}/${maxAttempts})`);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;
      }
    }

    throw new Error('扩图任务超时');
  }
}
