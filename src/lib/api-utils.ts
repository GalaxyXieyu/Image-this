/**
 * API路由通用工具函数
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * 获取用户ID（支持服务端调用和客户端调用）
 */
export async function getUserIdFromRequest(body: any): Promise<string> {
  // 服务端调用模式
  if (body.userId && body.serverCall) {
    return body.userId;
  }

  // 客户端调用模式
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED');
  }

  return session.user.id;
}

/**
 * 处理API错误响应
 */
export function handleApiError(
  error: unknown,
  errorMessage: string,
  statusCode: number = 500
): NextResponse {
  const details = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[API Error] ${errorMessage}:`, details);

  return NextResponse.json(
    {
      error: errorMessage,
      details
    },
    { status: statusCode }
  );
}

/**
 * 验证必需的请求参数
 */
export function validateRequiredParams(
  body: any,
  requiredParams: string[]
): string | null {
  for (const param of requiredParams) {
    if (!body[param]) {
      return `缺少必要参数：${param}`;
    }
  }
  return null;
}
