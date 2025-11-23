import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import { addWatermarkToImage } from '@/lib/watermark';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      watermarkText = 'Watermark',
      watermarkOpacity = 0.3,
      watermarkPosition = 'bottom-right',
      watermarkType = 'logo',
      watermarkLogoUrl,
      outputResolution = 'original',
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    let userId: string;
    if (body.userId && body.serverCall) {
      userId = body.userId;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: '用户未登录' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `watermark-${Date.now()}.png`,
        originalUrl: imageUrl,
        processType: 'WATERMARK',
        status: 'PROCESSING',
        userId: userId,
        metadata: JSON.stringify({
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType,
          watermarkLogoUrl,
          outputResolution,
        })
      }
    });

    try {
      const watermarkedImageData = await addWatermarkToImage({
        imageUrl,
        watermarkType,
        watermarkLogoUrl,
        watermarkPosition,
        watermarkOpacity,
        watermarkText,
        outputResolution
      });

      const uploadedUrl = await uploadBase64Image(
        watermarkedImageData,
        `watermark-${processedImage.id}.png`
      );

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          processedUrl: uploadedUrl,
          status: 'COMPLETED',
          fileSize: Buffer.from(watermarkedImageData.split(',')[1], 'base64').length,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            processingCompletedAt: new Date().toISOString(),
          })
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          imageData: watermarkedImageData,
          uploadedUrl,
        },
        message: '水印添加完成'
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
      { error: '水印处理失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
