import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { saveInputAsset } from '@/lib/storage';

export const runtime = 'nodejs';

async function persistAsset(file: File, userId: string) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return saveInputAsset(buffer, file.name, file.type || 'application/octet-stream', userId);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const formData = await request.formData();
    const inputFile = formData.get('input');
    const referenceFile = formData.get('reference');
    const watermarkLogoFile = formData.get('watermarkLogo');

    if (!(inputFile instanceof File) && !(referenceFile instanceof File) && !(watermarkLogoFile instanceof File)) {
      return NextResponse.json({ error: '至少需要一个文件资产' }, { status: 400 });
    }

    const response: Record<string, unknown> = { success: true };

    if (inputFile instanceof File) {
      response.inputAsset = await persistAsset(inputFile, session.user.id);
    }

    if (referenceFile instanceof File) {
      response.referenceAsset = await persistAsset(referenceFile, session.user.id);
    }

    if (watermarkLogoFile instanceof File) {
      response.watermarkLogoAsset = await persistAsset(watermarkLogoFile, session.user.id);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Create input asset error:', error);
    return NextResponse.json(
      { error: '创建输入资产失败' },
      { status: 500 }
    );
  }
}
