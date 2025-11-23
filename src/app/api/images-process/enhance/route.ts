/**
 * 统一的画质增强 API
 * 支持 Volcengine 等提供商
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest, handleApiError, validateRequiredParams } from '@/lib/api-utils';
import { enhanceWithVolcengine } from '@/lib/image-processor/service';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`[画质增强API] 收到增强请求`);

  try {
    const body = await request.json();

    // 验证必需参数
    const paramError = validateRequiredParams(body, ['imageUrl']);
    if (paramError) {
      return NextResponse.json({ error: paramError }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(body);
    const {
      imageUrl,
      provider = 'volcengine', // 默认使用火山引擎
      resolutionBoundary = '720p',
      enableHdr = false,
      enableWb = false,
      resultFormat = 1,
      jpgQuality = 95
    } = body;

    console.log(`[画质增强API] 使用提供商: ${provider}`);

    let result;

    // 根据提供商调用不同的服务
    switch (provider.toLowerCase()) {
      case 'volcengine':
        result = await enhanceWithVolcengine(
          userId,
          imageUrl,
          resolutionBoundary,
          enableHdr,
          enableWb,
          resultFormat,
          jpgQuality
        );
        break;

      default:
        return NextResponse.json(
          { error: `不支持的提供商: ${provider}` },
          { status: 400 }
        );
    }

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[画质增强API] 完成，耗时: ${totalDuration}秒`);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        provider
      },
      message: '画质增强成功'
    });

  } catch (error) {
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[画质增强API] 失败，耗时: ${totalDuration}秒`);

    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    return handleApiError(error, '画质增强失败');
  }
}
