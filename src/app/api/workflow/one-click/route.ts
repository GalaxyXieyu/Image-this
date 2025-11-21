import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeOneClickWorkflow } from './service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 检查是否是服务端调用（包含userId参数）
    let userId: string;
    if (body.userId && body.serverCall) {
      // 服务端调用模式：直接使用传入的userId
      userId = body.userId;
    } else {
      // 正常客户端调用：验证用户身份
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: '用户未登录' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    // 调用服务函数执行工作流
    const result = await executeOneClickWorkflow({
      ...body,
      userId
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: '一键AI增强处理完成'
    });

  } catch (error) {
    console.error('One-Click Workflow Error:', error);
    return NextResponse.json(
      { error: '一键处理失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}