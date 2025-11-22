import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';

interface GPTImageGenerationRequest {
  model: string;
  messages: Array<{
    role: string;
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;
  }>;
  seed: number;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { referenceImage, prompt, model = 'gpt-4o-image-vip', seed, projectId } = body;

    // 验证必要参数
    if (!referenceImage || !prompt) {
      return NextResponse.json(
        { error: '缺少必要参数：referenceImage 和 prompt' },
        { status: 400 }
      );
    }

    // 从环境变量获取 API 配置
    const baseUrl = process.env.GPT_API_URL || 'https://yunwu.ai';
    const apiKey = process.env.GPT_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GPT API Key 未配置' },
        { status: 500 }
      );
    }

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `gpt-generate-${Date.now()}.jpg`,
        originalUrl: 'temp', // 临时值，稍后更新
        processType: 'GENERATE',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          prompt,
          model,
          seed: seed || Math.floor(Math.random() * 1000000),
          referenceImageSize: referenceImage.length
        }),
        userId: session.user.id,
        projectId: projectId || null
      }
    });

    // console.log('创建GPT图像生成处理记录:', processedImage.id);

    // 构建 GPT API 请求
    const gptRequest: GPTImageGenerationRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Create image ${prompt}` },
            { type: 'image_url', image_url: { url: referenceImage } }
          ]
        }
      ],
      seed: seed || Math.floor(Math.random() * 1000000)
    };

    // 调用 GPT API - 自动拼接 /v1 路径
    const apiUrl = baseUrl.endsWith('/') ?
      `${baseUrl}v1/chat/completions` :
      `${baseUrl}/v1/chat/completions`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gptRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // console.error('GPT API Error:', errorText);
      return NextResponse.json(
        { error: `GPT API 调用失败: ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    try {
      // 这里需要根据实际的GPT API响应格式来提取图片
      // 暂时返回原始响应，后续可以根据实际情况修改

      // 上传参考图片到MinIO（用于记录）
      const originalMinioUrl = await uploadBase64Image(
        referenceImage,
        `reference-${processedImage.id}.jpg`
      );

      // 更新数据库记录
      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalMinioUrl,
          status: 'COMPLETED',
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            gptResponse: result,
            processingCompletedAt: new Date().toISOString()
          })
        }
      });

      // console.log('GPT图像生成处理完成:', updatedImage.id);

      // 返回结果
      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          ...result
        },
        message: '图像生成成功'
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
    // console.error('GPT Generate Error:', error);
    return NextResponse.json(
      { error: '图像生成失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}