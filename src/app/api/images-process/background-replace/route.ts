/**
 * 统一的背景替换 API
 * 支持 Gemini、GPT 等多个提供商
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';
import { processWithGemini, processWithGPT, processWithJimeng } from '@/lib/image-processor/service';

const DEFAULT_PROMPT = `请将第二张图片中的所有产品替换为第一张图片的产品，要求：
1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
2. 仅保留产品包装外壳，不得出现任何成品材质
3. 禁用背景虚化效果，确保画面清晰呈现所有产品
4. 产品的比例一定要保持，相对瘦长就瘦长，相对粗就相对粗`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必需参数
    const paramError = validateRequiredParams(body, ['originalImageUrl', 'referenceImageUrl']);
    if (paramError) {
      return NextResponse.json({ error: paramError }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(body);
    const {
      originalImageUrl,
      referenceImageUrl,
      prompt,
      customPrompt,
      projectId,
      provider = 'gemini' // 默认使用 Gemini
    } = body;

    const finalPrompt = customPrompt || prompt || DEFAULT_PROMPT;

    console.log(`[背景替换API] 使用提供商: ${provider}`);

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `bg-replace-${Date.now()}.jpg`,
        originalUrl: 'temp',
        processType: 'BACKGROUND_REMOVAL',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          provider,
          prompt: finalPrompt,
          originalImageSize: originalImageUrl.length,
          referenceImageSize: referenceImageUrl.length
        }),
        userId,
        projectId: projectId || null
      }
    });

    try {
      let resultImageUrl: string | null = null;

      // 根据提供商调用不同的服务
      switch (provider.toLowerCase()) {
        case 'gemini':
          resultImageUrl = await processWithGemini(
            originalImageUrl,
            referenceImageUrl,
            finalPrompt,
            userId
          );
          break;

        case 'gpt':
          const gptResult = await processWithGPT(
            originalImageUrl,
            referenceImageUrl,
            finalPrompt,
            userId
          );
          resultImageUrl = gptResult.imageData;
          break;

        case 'jimeng':
          const jimengResult = await processWithJimeng(
            originalImageUrl,
            referenceImageUrl,
            finalPrompt,
            userId
          );
          resultImageUrl = jimengResult.imageData;
          break;

        default:
          throw new Error(`不支持的提供商: ${provider}`);
      }

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

      const imageDataUrl = resultImageUrl;

      // 上传到本地存储（使用用户配置的保存路径）
      const processedUrl = await uploadBase64Image(
        imageDataUrl,
        `bg-replace-${processedImage.id}.jpg`,
        userId
      );

      const originalUrl = await uploadBase64Image(
        originalImageUrl,
        `original-${processedImage.id}.jpg`,
        userId
      );

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalUrl,
          processedUrl: processedUrl,
          status: 'COMPLETED',
          fileSize: imageDataUrl.length,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            processingCompletedAt: new Date().toISOString()
          })
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          imageData: imageDataUrl,
          imageSize: imageDataUrl.length,
          processedUrl: processedUrl,
          prompt: finalPrompt,
          provider
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
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    return handleApiError(error, '背景替换失败');
  }
}
