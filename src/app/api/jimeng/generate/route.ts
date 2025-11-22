import { NextRequest, NextResponse } from 'next/server';
import { generateWithJimeng } from '../service';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证必需参数
    const paramError = validateRequiredParams(body, ['prompt']);
    if (paramError) {
      return NextResponse.json({ error: paramError }, { status: 400 });
    }

    // 获取用户ID
    const userId = await getUserIdFromRequest(body);

    const { referenceImage, prompt, width = 2048, height = 2048 } = body;

    const result = await generateWithJimeng(
      userId,
      prompt,
      referenceImage,
      width,
      height
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: '即梦图像生成成功'
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    return handleApiError(error, '图像生成失败');
  }
}
