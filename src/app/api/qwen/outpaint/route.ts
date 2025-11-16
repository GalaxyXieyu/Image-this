import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { outpaintWithQwen } from '../service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[Qwen扩图API] ========== 收到扩图请求 ==========`);

  try {
    const body = await request.json();
    console.log(`[Qwen扩图API] 请求参数:`, {
      xScale: body.xScale,
      yScale: body.yScale,
      bestQuality: body.bestQuality,
      limitImageSize: body.limitImageSize,
      hasImage: !!body.imageUrl
    });

    let userId: string;
    if (body.userId && body.serverCall) {
      console.log(`[Qwen扩图API] 服务端调用模式，userId: ${body.userId}`);
      userId = body.userId;
    } else {
      console.log(`[Qwen扩图API] 客户端调用模式，验证session...`);
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
      xScale = 2.0,
      yScale = 2.0,
      bestQuality = false,
      limitImageSize = true
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    console.log(`[Qwen扩图API] 调用qwen-service...`);
    const result = await outpaintWithQwen(
      userId,
      imageUrl,
      xScale,
      yScale,
      bestQuality,
      limitImageSize
    );

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Qwen扩图API] ========== 处理完成，总耗时: ${totalDuration}秒 ==========`);

    return NextResponse.json({
      success: true,
      data: result,
      message: '图像扩图成功'
    });

  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[Qwen扩图API] ========== 请求失败，耗时: ${totalDuration}秒 ==========`);
    console.error(`[Qwen扩图API] 错误详情:`, error);
    return NextResponse.json(
      { error: '图像扩图失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
