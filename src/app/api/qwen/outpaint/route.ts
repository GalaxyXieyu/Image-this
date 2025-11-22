import { NextRequest, NextResponse } from 'next/server';
import { outpaintWithQwen } from '../service';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[Qwen扩图API] 收到扩图请求`);

  try {
    const body = await request.json();

    // 验证必需参数
    const paramError = validateRequiredParams(body, ['imageUrl']);
    if (paramError) {
      return NextResponse.json({ error: paramError }, { status: 400 });
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(body);

    const {
      imageUrl,
      xScale = 2.0,
      yScale = 2.0,
      bestQuality = false,
      limitImageSize = true
    } = body;

    const result = await outpaintWithQwen(
      userId,
      imageUrl,
      xScale,
      yScale,
      bestQuality,
      limitImageSize
    );

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Qwen扩图API] 完成，耗时: ${totalDuration}秒`);

    return NextResponse.json({
      success: true,
      data: result,
      message: '图像扩图成功'
    });
  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Qwen扩图API] 失败，耗时: ${totalDuration}秒`);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    return handleApiError(error, '图像扩图失败');
  }
}
