import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateWithJimeng } from '../service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { referenceImage, prompt, width = 2048, height = 2048 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必要参数：prompt' },
        { status: 400 }
      );
    }

    const result = await generateWithJimeng(
      session.user.id,
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
    return NextResponse.json(
      { error: '图像生成失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
