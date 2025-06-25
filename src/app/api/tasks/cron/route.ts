import { NextRequest, NextResponse } from 'next/server';

// 定时任务处理器端点
export async function GET() {
  try {
    // 调用任务处理器
    const workerUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.NEXTAUTH_URL}/api/tasks/worker`
      : 'http://localhost:3000/api/tasks/worker';

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch: true }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`任务处理器调用失败: ${errorData.details || response.statusText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: '定时任务处理完成',
      ...result
    });

  } catch (error) {
    console.error('定时任务处理失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '定时任务处理失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 支持POST方法手动触发
export async function POST() {
  return GET();
} 