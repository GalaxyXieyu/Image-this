import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { outpaintWithVolcengine } from '../service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      imageUrl,
      prompt = '扩展图像，保持风格一致',
      top = 0.1,
      bottom = 0.1,
      left = 0.1,
      right = 0.1,
      maxHeight = 1920,
      maxWidth = 1920
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    const result = await outpaintWithVolcengine(
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

    return NextResponse.json({
      success: true,
      data: result,
      message: '图像智能扩图成功'
    });

  } catch (error) {
    return NextResponse.json(
      { error: '图像智能扩图失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
