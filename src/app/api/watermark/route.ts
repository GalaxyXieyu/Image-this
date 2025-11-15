import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/storage';
import { createCanvas, loadImage } from 'canvas';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      watermarkText = 'Watermark',
      watermarkOpacity = 0.3,
      watermarkPosition = 'bottom-right',
      watermarkType = 'text',
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
        filename: `watermark-${Date.now()}.jpg`,
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
      const watermarkedImageData = await addWatermark(
        imageUrl,
        watermarkText,
        watermarkOpacity,
        watermarkPosition,
        watermarkType,
        watermarkLogoUrl,
        outputResolution
      );

      const minioUrl = await uploadBase64ImageToMinio(
        watermarkedImageData,
        `watermark-${processedImage.id}.jpg`
      );

      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          processedUrl: minioUrl,
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
          minioUrl,
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

async function addWatermark(
  imageUrl: string,
  watermarkText: string,
  opacity: number,
  position: string,
  watermarkType: 'text' | 'logo',
  watermarkLogoUrl?: string,
  outputResolution?: string
): Promise<string> {
  const extractBase64FromDataUrl = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  };

  const base64Data = extractBase64FromDataUrl(imageUrl);
  const imageBuffer = Buffer.from(base64Data, 'base64');

  const img = await loadImage(imageBuffer);

  // 计算输出尺寸
  let outputWidth = img.width;
  let outputHeight = img.height;

  if (outputResolution && outputResolution !== 'original') {
    const [targetWidth, targetHeight] = outputResolution.split('x').map(Number);
    const aspectRatio = img.width / img.height;
    const targetAspectRatio = targetWidth / targetHeight;

    if (aspectRatio > targetAspectRatio) {
      outputWidth = targetWidth;
      outputHeight = Math.round(targetWidth / aspectRatio);
    } else {
      outputHeight = targetHeight;
      outputWidth = Math.round(targetHeight * aspectRatio);
    }
  }

  const canvas = createCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);

  // 添加水印
  if (watermarkType === 'logo' && watermarkLogoUrl) {
    const logoBase64 = extractBase64FromDataUrl(watermarkLogoUrl);
    const logoBuffer = Buffer.from(logoBase64, 'base64');
    const logo = await loadImage(logoBuffer);

    const maxLogoWidth = outputWidth * 0.2;
    const scale = Math.min(maxLogoWidth / logo.width, 1);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;

    const padding = 20;
    let x: number, y: number;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-right':
        x = outputWidth - logoWidth - padding;
        y = padding;
        break;
      case 'bottom-left':
        x = padding;
        y = outputHeight - logoHeight - padding;
        break;
      case 'bottom-right':
        x = outputWidth - logoWidth - padding;
        y = outputHeight - logoHeight - padding;
        break;
      case 'center':
        x = (outputWidth - logoWidth) / 2;
        y = (outputHeight - logoHeight) / 2;
        break;
      default:
        x = outputWidth - logoWidth - padding;
        y = outputHeight - logoHeight - padding;
    }

    ctx.globalAlpha = opacity;
    ctx.drawImage(logo, x, y, logoWidth, logoHeight);
    ctx.globalAlpha = 1.0;
  } else {
    const fontSize = Math.max(20, Math.floor(outputWidth / 30));
    ctx.font = `bold ${fontSize}px Arial`;

    const textMetrics = ctx.measureText(watermarkText);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const padding = 20;
    let x: number, y: number;

    switch (position) {
      case 'top-left':
        x = padding;
        y = padding + textHeight;
        break;
      case 'top-right':
        x = outputWidth - textWidth - padding;
        y = padding + textHeight;
        break;
      case 'bottom-left':
        x = padding;
        y = outputHeight - padding;
        break;
      case 'bottom-right':
        x = outputWidth - textWidth - padding;
        y = outputHeight - padding;
        break;
      case 'center':
        x = (outputWidth - textWidth) / 2;
        y = (outputHeight + textHeight) / 2;
        break;
      default:
        x = outputWidth - textWidth - padding;
        y = outputHeight - padding;
    }

    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 10, y - textHeight - 5, textWidth + 20, textHeight + 15);
    ctx.fillStyle = 'white';
    ctx.fillText(watermarkText, x, y);
    ctx.globalAlpha = 1.0;
  }

  const outputBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const base64Output = outputBuffer.toString('base64');

  return `data:image/jpeg;base64,${base64Output}`;
}
