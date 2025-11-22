import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { getUserConfig } from '@/lib/user-config';
import FormData from 'form-data';

interface BackgroundReplaceRequest {
  originalImageUrl: string;
  referenceImageUrl: string;
  prompt?: string;
  customPrompt?: string;
  projectId?: string;
  userId?: string;
  serverCall?: boolean;
}

interface GPTImageResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const DEFAULT_PROMPT_TEMPLATE = `请将第二张图片中的所有产品替换为第一张图片的产品，要求：

1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
2. 仅保留产品包装外壳，不得出现任何成品材质（如口红壳中不得显示口红）
3. 禁用背景虚化效果，确保画面清晰呈现所有产品
4. 产品的比例一定要保持，相对瘦长就瘦长，相对粗就相对粗`;

function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

// 检查 base64 数据大小（单位：KB）
function getBase64Size(base64: string): number {
  return Math.round((base64.length * 3) / 4 / 1024);
}

async function generateImageWithTwoImages(
  originalImageUrl: string,
  referenceImageUrl: string,
  prompt: string,
  userId: string
): Promise<string | null> {
  try {
    // 获取用户配置
    const userConfig = await getUserConfig(userId);
    const baseUrl = userConfig.gpt?.apiUrl || process.env.GPT_API_URL || 'https://yunwu.ai';
    const apiKey = userConfig.gpt?.apiKey || process.env.GPT_API_KEY;

    if (!apiKey) {
      throw new Error('GPT API Key未配置');
    }

    // 判断是 URL 还是 base64
    const isOriginalUrl = originalImageUrl.startsWith('http://') || originalImageUrl.startsWith('https://');
    const isReferenceUrl = referenceImageUrl.startsWith('http://') || referenceImageUrl.startsWith('https://');

    // 构建 content，优先使用 URL
    const content = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: isOriginalUrl ? originalImageUrl : (originalImageUrl.startsWith('data:') ? originalImageUrl : `data:image/png;base64,${originalImageUrl}`)
        }
      },
      {
        type: "image_url",
        image_url: {
          url: isReferenceUrl ? referenceImageUrl : (referenceImageUrl.startsWith('data:') ? referenceImageUrl : `data:image/png;base64,${referenceImageUrl}`)
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

    const apiUrl = baseUrl.endsWith('/') ?
      `${baseUrl}v1/chat/completions` :
      `${baseUrl}/v1/chat/completions`;

    const requestBody = JSON.stringify(payload);
    console.log('[GPT API] 发送请求到:', apiUrl);

    // 使用更长的超时时间，因为图片生成需要时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Connection': 'keep-alive'
        },
        body: requestBody,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

    console.log('[GPT API] 响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GPT API] 错误响应:', errorText);
      throw new Error(`GPT API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GPTImageResponse = await response.json();

    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;
      if (message.content) {
        const content = message.content;
        let imageUrl = null;

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
          return imageUrl;
        }
      }
    }

    return null;

  } catch (error) {
    console.error('[GPT API] 请求失败:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      throw new Error(`GPT API 请求失败: ${error.message}`);
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BackgroundReplaceRequest = await request.json();
    let userId: string;

    if (body.userId && body.serverCall) {
      userId = body.userId;
    } else {
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
      originalImageUrl,
      referenceImageUrl,
      prompt,
      customPrompt,
      projectId
    } = body;

    if (!originalImageUrl || !referenceImageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：originalImageUrl 和 referenceImageUrl' },
        { status: 400 }
      );
    }

    const finalPrompt = customPrompt || prompt || DEFAULT_PROMPT_TEMPLATE;

    // 不再提前转换为 base64，直接传递原始 URL
    console.log('[背景替换] 图片来源:', {
      original: originalImageUrl.substring(0, 50) + '...',
      reference: referenceImageUrl.substring(0, 50) + '...'
    });

    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `background-replace-${Date.now()}.jpg`,
        originalUrl: 'temp',
        processType: 'BACKGROUND_REMOVAL',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          prompt: finalPrompt,
          originalImageSize: originalImageUrl.length,
          referenceImageSize: referenceImageUrl.length
        }),
        userId: userId,
        projectId: projectId || null
      }
    });

    try {
      const resultImageUrl = await generateImageWithTwoImages(
        originalImageUrl,
        referenceImageUrl,
        finalPrompt,
        userId
      );

      if (!resultImageUrl) {
        await prisma.processedImage.update({
          where: { id: processedImage.id },
          data: {
            status: 'FAILED',
            errorMessage: '图像生成失败，未获取到结果图片'
          }
        });

        return NextResponse.json(
          { error: '图像生成失败，未获取到结果图片' },
          { status: 500 }
        );
      }

      const imageResponse = await fetch(resultImageUrl, {
        signal: AbortSignal.timeout(600000)
      });
      if (!imageResponse.ok) {
        throw new Error('下载生成的图片失败');
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
      const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

      const minioUrl = await uploadBase64Image(
        imageDataUrl,
        `background-replace-${processedImage.id}.jpg`
      );

      const originalMinioUrl = await uploadBase64Image(
        originalImageUrl,
        `original-${processedImage.id}.jpg`
      );

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalMinioUrl,
          processedUrl: minioUrl,
          status: 'COMPLETED',
          fileSize: imageArrayBuffer.byteLength,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            originalUrl: resultImageUrl,
            processingCompletedAt: new Date().toISOString()
          })
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          imageData: imageDataUrl,
          imageSize: imageArrayBuffer.byteLength,
          originalUrl: resultImageUrl,
          minioUrl: minioUrl,
          prompt: finalPrompt
        },
        message: '背景替换成功'
      });

    } catch (processingError) {
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
    return NextResponse.json(
      { 
        error: '背景替换失败', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
