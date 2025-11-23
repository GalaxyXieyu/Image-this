/**
 * 统一的扩图 API
 * 支持 Qwen、Volcengine 等多个提供商
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';
import { outpaintWithQwen, outpaintWithVolcengine } from '@/lib/image-processor/service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[扩图API] 收到扩图请求`);

  try {
    const body = await request.json();

    // 验证必需参数
    const paramError = validateRequiredParams(body, ['imageUrl']);
    if (paramError) {
      return NextResponse.json({ error: paramError }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(body);
    const {
      imageUrl,
      provider = 'qwen', // 默认使用 Qwen
      // Qwen 参数
      xScale = 2.0,
      yScale = 2.0,
      bestQuality = false,
      limitImageSize = true,
      // Volcengine 参数
      prompt = '扩展图像，保持风格一致',
      top = 0.1,
      bottom = 0.1,
      left = 0.1,
      right = 0.1,
      maxHeight = 1920,
      maxWidth = 1920
    } = body;

    console.log(`[扩图API] 使用提供商: ${provider}`);

    let result;

    // 根据提供商调用不同的服务
    switch (provider.toLowerCase()) {
      case 'qwen':
        result = await outpaintWithQwen(
          userId,
          imageUrl,
          xScale,
          yScale,
          bestQuality,
          limitImageSize
        );
        break;

      case 'volcengine':
        result = await outpaintWithVolcengine(
          userId,
          imageUrl,
          prompt,
          top,
          bottom,
          left,
          right,
          maxHeight,
          maxWidth
        );
        break;

      default:
        return NextResponse.json(
          { error: `不支持的提供商: ${provider}` },
          { status: 400 }
        );
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[扩图API] 完成，耗时: ${totalDuration}秒`);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        provider
      },
      message: '图像扩图成功'
    });

  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[扩图API] 失败，耗时: ${totalDuration}秒`);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    return handleApiError(error, '图像扩图失败');
  }
}
