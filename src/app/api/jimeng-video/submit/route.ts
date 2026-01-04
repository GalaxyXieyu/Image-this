import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { submitVideoTask, VIDEO_STYLE_TEMPLATES } from '../service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    const body = await request.json();
    const { imageBase64, imageUrl, styleId, customPrompt, frames, aspectRatio } = body;

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ success: false, error: '请提供图片' }, { status: 400 });
    }

    // 获取提示词
    let prompt = customPrompt;
    if (!prompt && styleId) {
      const template = VIDEO_STYLE_TEMPLATES.find(t => t.id === styleId);
      prompt = template?.prompt || '';
    }
    if (!prompt) {
      return NextResponse.json({ success: false, error: '请选择视频风格或输入提示词' }, { status: 400 });
    }

    const result = await submitVideoTask(user.id, {
      imageBase64,
      imageUrl,
      prompt,
      frames: frames || 121,
      aspectRatio: aspectRatio || '16:9',
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[视频生成] 提交失败:', error);
    const message = error instanceof Error ? error.message : '提交失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
