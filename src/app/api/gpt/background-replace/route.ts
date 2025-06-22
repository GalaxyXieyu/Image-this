import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/minio';

interface BackgroundReplaceRequest {
  originalImageUrl: string;
  referenceImageUrl: string;
  prompt?: string;
  customPrompt?: string;
  projectId?: string;
}

interface GPTImageResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 默认提示词模板
const DEFAULT_PROMPT_TEMPLATE = `请将第二张图片中的所有产品替换为第一张图片的产品，要求：

1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
2. 仅保留产品包装外壳，不得出现任何成品材质（如口红壳中不得显示口红）
3. 禁用背景虚化效果，确保画面清晰呈现所有产品
4. 产品的比例一定要保持，相对瘦长就瘦长，相对粗就相对粗`;

// 将base64图片数据转换为纯base64字符串
function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

// 调用GPT-4o图像生成API
async function generateImageWithTwoImages(
  originalImageBase64: string,
  referenceImageBase64: string,
  prompt: string
): Promise<string | null> {
  try {
    // console.log('开始调用GPT-4o-image API进行背景替换...');

    // 构建消息内容 - 使用image_url格式
    const content = [
      { type: "text", text: prompt },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${originalImageBase64}`
        }
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${referenceImageBase64}`
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

    // 从环境变量获取API配置，自动添加/v1/chat/completions后缀
    const baseUrl = process.env.GPT_API_URL || 'https://yunwu.ai';
    const apiKey = process.env.GPT_API_KEY;

    if (!apiKey) {
      throw new Error('GPT API Key未配置');
    }

    // 确保URL格式正确，自动添加/v1/chat/completions后缀
    const apiUrl = baseUrl.endsWith('/') ?
      `${baseUrl}v1/chat/completions` :
      `${baseUrl}/v1/chat/completions`;

    // console.log(`调用API URL: ${apiUrl}`);
    // console.log(`使用模型: ${payload.model}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // console.log(`API响应状态: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      // console.error(`API错误响应: ${errorText}`);
      throw new Error(`GPT API请求失败: ${response.status} ${response.statusText}`);
    }

    const data: GPTImageResponse = await response.json();
    // console.log('收到GPT API响应:', JSON.stringify(data, null, 2));

    // 从响应中提取图片URL
    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;
      if (message.content) {
        const content = message.content;
        // console.log(`API返回内容: ${content.substring(0, 200)}...`);

        // 尝试多种方式提取图片链接
        let imageUrl = null;

        // 方法1: 查找 ![...](...) 格式 - 优先选择第一个图片
        const markdownImageMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
        if (markdownImageMatch) {
          imageUrl = markdownImageMatch[1];
          // console.log(`通过markdown格式提取到图片URL: ${imageUrl}`);
        }

        // 方法2: 查找 [点击下载](...) 格式 - 如果没有markdown格式，尝试下载链接
        if (!imageUrl) {
          const downloadLinkMatch = content.match(/\[点击下载\]\((https?:\/\/[^\)]+)\)/);
          if (downloadLinkMatch) {
            imageUrl = downloadLinkMatch[1];
            // console.log(`通过下载链接格式提取到图片URL: ${imageUrl}`);
          }
        }

        // 方法3: 查找任何 https://filesystem.site 开头的链接
        if (!imageUrl) {
          const filesystemMatch = content.match(/(https:\/\/filesystem\.site\/[^\s\)]+)/);
          if (filesystemMatch) {
            imageUrl = filesystemMatch[1];
            // console.log(`通过filesystem链接提取到图片URL: ${imageUrl}`);
          }
        }

        // 方法4: 查找任何 https:// 开头的图片链接
        if (!imageUrl) {
          const httpMatch = content.match(/(https?:\/\/[^\s\)]+\.(?:png|jpg|jpeg|gif|webp))/i);
          if (httpMatch) {
            imageUrl = httpMatch[1];
            // console.log(`通过通用图片链接提取到图片URL: ${imageUrl}`);
          }
        }

        if (imageUrl) {
          return imageUrl;
        } else {
          // console.log('内容中未找到图片链接，尝试其他解析方法...');
          // console.log('完整内容:', content);
        }
      } else {
        // console.log('响应消息中没有content字段');
      }
    } else {
      // console.log('响应中没有choices字段或choices为空');
      // console.log('完整响应:', JSON.stringify(data, null, 2));
    }

    // console.log('无法从API响应中提取图片URL');
    return null;

  } catch (error) {
    // console.error('调用GPT-4o图像生成API失败:', error);
    throw error;
  }
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

    const body: BackgroundReplaceRequest = await request.json();
    const {
      originalImageUrl,
      referenceImageUrl,
      prompt,
      customPrompt,
      projectId
    } = body;

    // 验证必要参数
    if (!originalImageUrl || !referenceImageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：originalImageUrl 和 referenceImageUrl' },
        { status: 400 }
      );
    }

    // console.log('背景替换API调用:', {
    //   userId: session.user.id,
    //   originalImageLength: originalImageUrl.length,
    //   referenceImageLength: referenceImageUrl.length,
    //   hasCustomPrompt: !!customPrompt,
    //   projectId
    // });

    // 确定使用的提示词
    const finalPrompt = customPrompt || prompt || DEFAULT_PROMPT_TEMPLATE;

    // 提取base64数据
    const originalBase64 = extractBase64FromDataUrl(originalImageUrl);
    const referenceBase64 = extractBase64FromDataUrl(referenceImageUrl);

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `background-replace-${Date.now()}.jpg`,
        originalUrl: 'temp', // 临时值，稍后更新
        processType: 'BACKGROUND_REMOVAL',
        status: 'PROCESSING',
        metadata: {
          prompt: finalPrompt,
          originalImageSize: originalImageUrl.length,
          referenceImageSize: referenceImageUrl.length
        },
        userId: session.user.id,
        projectId: projectId || null
      }
    });

    // console.log('创建处理记录:', processedImage.id);

    try {
      // 调用GPT-4o图像生成API
      const resultImageUrl = await generateImageWithTwoImages(
        originalBase64,
        referenceBase64,
        finalPrompt
      );

      if (!resultImageUrl) {
        // 更新记录状态为失败
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

      // 下载生成的图片并转换为base64
      // console.log('正在下载生成的图片...');
      const imageResponse = await fetch(resultImageUrl);
      if (!imageResponse.ok) {
        throw new Error('下载生成的图片失败');
      }

      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
      const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;

      // 上传到MinIO
      // console.log('正在上传图片到MinIO...');
      const minioUrl = await uploadBase64ImageToMinio(
        imageDataUrl,
        `background-replace-${processedImage.id}.jpg`
      );

      // 上传原始图片到MinIO（用于记录）
      const originalMinioUrl = await uploadBase64ImageToMinio(
        originalImageUrl,
        `original-${processedImage.id}.jpg`
      );

      // 更新数据库记录
      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalMinioUrl,
          processedUrl: minioUrl,
          status: 'COMPLETED',
          fileSize: imageArrayBuffer.byteLength,
          metadata: {
            ...processedImage.metadata,
            originalUrl: resultImageUrl,
            processingCompletedAt: new Date().toISOString()
          }
        }
      });

      // console.log('背景替换处理完成:', updatedImage.id);

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
    // console.error('背景替换API错误:', error);
    return NextResponse.json(
      { 
        error: '背景替换失败', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
