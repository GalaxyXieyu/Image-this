import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import packageJson from '../../../../package.json';

export async function GET() {
  try {
    // 检查数据库连接 - 使用共享的 prisma 实例
    await prisma.$queryRaw`SELECT 1`;
    
    // 检查应用状态
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        application: 'running'
      },
      version: packageJson.version,
      environment: process.env.NODE_ENV || 'development'
    };

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const status = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        application: 'running'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };

    return NextResponse.json(status, { status: 503 });
  }
  // 不要断开连接 - 保持连接池活跃
}
