import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { enhanceWithVolcengine } from '../service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[火山高清化API] ========== 收到高清化请求 ==========`);
  
  try {
    const body = await request.json();
    let userId: string;

    // 检查是否是服务端调用
    if (body.userId && body.serverCall) {
      console.log(`[火山高清化API] 服务端调用模式，userId: ${body.userId}`);
      userId = body.userId;
    } else {
      console.log(`[火山高清化API] 客户端调用模式，验证session...`);
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
      resultFormat = 1,
      jpgQuality = 95
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    // 直接调用service
    console.log(`[火山高清化API] 调用volcengine-service...`);
    const result = await enhanceWithVolcengine(
      userId,
      imageUrl,
      '720p',
      false,
      false,
      resultFormat,
      jpgQuality
    );

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[火山高清化API] ========== 处理完成，总耗时: ${totalDuration}秒 ==========`);

    return NextResponse.json({
      success: true,
      data: result,
      message: '图像智能画质增强成功'
    });

  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[火山高清化API] ========== 请求失败，耗时: ${totalDuration}秒 ==========`);
    console.error(`[火山高清化API] 错误详情:`, error);
    return NextResponse.json(
      { error: '图像智能画质增强失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
