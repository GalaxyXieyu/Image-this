import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';
import { processWithGemini } from '../service';

const DEFAULT_PROMPT_TEMPLATE = `请将第二张图片中的所有产品替换为第一张图片的产品，要求：

1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
2. 仅保留产品包装外壳，不得出现任何成品材质（如口红壳中不得显示口红）
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

    // 获取用户ID
    const userId = await getUserIdFromRequest(body);

    const {
      originalImageUrl,
      referenceImageUrl,
      prompt,
      customPrompt,
      projectId
    } = body;

    const finalPrompt = customPrompt || prompt || DEFAULT_PROMPT_TEMPLATE;

    console.log('[Gemini背景替换] 图片来源:', {
      original: originalImageUrl.substring(0, 50) + '...',
      reference: referenceImageUrl.substring(0, 50) + '...'
    });

    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `gemini-replace-${Date.now()}.jpg`,
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
      const resultImageUrl = await processWithGemini(
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
        `gemini-replace-${processedImage.id}.jpg`
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
        message: 'Gemini背景替换成功'
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

    return handleApiError(error, 'Gemini背景替换失败');
  }
}
