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

  try {
    // 使用正确的GPT-4-vision API实现
    const originalBase64 = extractBase64FromDataUrl(imageUrl);
    const referenceBase64 = extractBase64FromDataUrl(referenceImageUrl);

    const prompt = `请将第二张图片中的所有产品替换为第一张图片的产品，要求：

1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
2. 仅保留产品包装外壳，不得出现任何成品材质（如口红壳中不得显示口红）
3. 禁用背景虚化效果，确保画面清晰呈现所有产品
4. 产品的比例一定要保持，相对瘦长就瘦长，相对粗就相对粗`;

    const content = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${originalBase64}`
        }
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${referenceBase64}`
        }
      }
    ];
    
    const payload = {
      model: "gpt-4o-image-vip",
      messages: [
        {
          role: "user",
          content: content
        }
      ],
      max_tokens: 124000
    };

    const apiUrl = gptApiUrl.endsWith('/') ?
      `${gptApiUrl}v1/chat/completions` :
      `${gptApiUrl}/v1/chat/completions`;

    const response = await fetchWithTimeoutAndRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${gptApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`背景替换失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    // console.log('GPT API 响应:', JSON.stringify(result, null, 2));

    // 从GPT-4-vision响应中提取图片URL
    if (result.choices && result.choices.length > 0) {
      const message = result.choices[0].message;
      if (message.content) {
        const content = message.content;
        let imageUrl = null;

        // 尝试各种格式的图片URL匹配
        const markdownImageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (markdownImageMatch) {
          imageUrl = markdownImageMatch[1];
        }

        if (!imageUrl) {
          const downloadLinkMatch = content.match(/\[点击下载\]\((https?:\/\/[^\)]+)\)/);
          if (downloadLinkMatch) {
            imageUrl = downloadLinkMatch[1];
          }
        }

        if (!imageUrl) {
          const filesystemMatch = content.match(/(https:\/\/filesystem\.site\/[^\s\)]+)/);
          if (filesystemMatch) {
            imageUrl = filesystemMatch[1];
          }
        }

        if (!imageUrl) {
          const httpMatch = content.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
          if (httpMatch) {
            imageUrl = httpMatch[1];
          }
        }

        if (imageUrl) {
          // 下载图片并转换为base64
          const imageResponse = await fetch(imageUrl, {
            signal: AbortSignal.timeout(600000)
          });
          if (!imageResponse.ok) {
            throw new Error('下载生成的图片失败');
          }

          const imageArrayBuffer = await imageResponse.arrayBuffer();
          const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
          return `data:image/jpeg;base64,${imageBase64}`;
        }
      }
    }

    throw new Error('背景替换失败：无法从GPT响应中获取生成的图片');

  } catch (error) {
    throw error;
  }
}

// 扩图函数
async function outpaintImage(imageUrl: string, apiKey: string, xScale = 2.0, yScale = 2.0) {
  console.log('[扩图] 开始提交任务...');
  const submitStartTime = Date.now();
  
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
  const taskId = result.output?.task_id;

  if (!taskId) {
    throw new Error('扩图任务提交失败，未获取到 task_id');
  }

  const submitDuration = ((Date.now() - submitStartTime) / 1000).toFixed(2);
  console.log(`[扩图] 任务提交成功，task_id: ${taskId}, 耗时: ${submitDuration}秒`);
  console.log(`[扩图] 开始轮询任务结果...`);
  
  const pollStartTime = Date.now();
  const result_blob = await pollTaskResult(taskId, apiKey, 'outpaint');
  const pollDuration = ((Date.now() - pollStartTime) / 1000).toFixed(2);
  console.log(`[扩图] 轮询完成，耗时: ${pollDuration}秒`);
  
  return result_blob;
}

// 高清化函数
async function upscaleImage(imageUrl: string, apiKey: string, upscaleFactor = 2) {
  console.log('[高清化] 开始上传图片到阿里云OSS...');
  const ossStartTime = Date.now();
  
  // 导入阿里云上传函数
  const { uploadImageToAliyun } = await import('@/lib/aliyun-upload');

  // 1. 上传图片到阿里云临时存储
  const ossImageUrl = await uploadImageToAliyun(
    apiKey,
    'wanx2.1-imageedit',
    imageUrl,
    `upscale-workflow-${Date.now()}.jpg`
  );
  
  const ossDuration = ((Date.now() - ossStartTime) / 1000).toFixed(2);
  console.log(`[高清化] OSS上传完成，耗时: ${ossDuration}秒`);
  console.log(`[高清化] 开始提交高清化任务...`);
  
  const submitStartTime = Date.now();

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
  
  const submitDuration = ((Date.now() - submitStartTime) / 1000).toFixed(2);
  console.log(`[高清化] 任务提交成功，task_id: ${taskId}, 耗时: ${submitDuration}秒`);
  console.log(`[高清化] 开始轮询任务结果...`);
  
  const pollStartTime = Date.now();
  const result_blob = await pollTaskResult(taskId, apiKey, 'upscale');
  const pollDuration = ((Date.now() - pollStartTime) / 1000).toFixed(2);
  console.log(`[高清化] 轮询完成，耗时: ${pollDuration}秒`);
  
  return result_blob;
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
        backgroundResult = await replaceBackground(imageUrl, referenceImageUrl, gptApiKey!, gptApiUrl);
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
        outpaintResult = await outpaintImage(processedImageUrl, qwenApiKey, xScale, yScale);

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

    // 步骤3：高清化
    if (enableUpscale) {
      console.log('=== 步骤3/4：开始高清化处理 ===');
      console.log('高清化倍数:', upscaleFactor);
      const upscaleStartTime = Date.now();
      try {
        upscaleResult = await upscaleImage(processedImageUrl, qwenApiKey, upscaleFactor);

        // 将高清化结果转换为可用的 URL
        const arrayBuffer = await upscaleResult.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        processedImageUrl = `data:image/jpeg;base64,${base64}`;
        const upscaleDuration = ((Date.now() - upscaleStartTime) / 1000).toFixed(2);
        console.log(`高清化处理完成，图片大小: ${Math.round(arrayBuffer.byteLength / 1024)}KB, 耗时: ${upscaleDuration}秒`);
      } catch (error) {
        // 高清化失败，继续使用当前图片
        console.error('高清化失败，继续使用当前图片:', error);
      }
    } else {
      console.log('=== 跳过高清化步骤 ===');
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