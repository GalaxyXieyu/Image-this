import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getUserConfig } from '@/lib/user-config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * 文件服务 API
 * 用于在 Electron 环境中提供本地文件访问
 * 路径格式: /api/files/uploads/xxx.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    let relativePath = pathSegments.join('/');
    
    // 安全检查：防止路径遍历攻击
    if (relativePath.includes('..') || relativePath.includes('~')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    
    // 确定基础目录
    let basePath: string;
    const cwd = process.cwd();
    const isElectronPackaged = cwd.includes('app.asar') || 
                                cwd.includes('AppData') || 
                                cwd.includes('Temp') ||
                                process.env.ELECTRON_RUN_AS_NODE;
    
    if (isElectronPackaged) {
      // Electron 环境：尝试获取用户配置的保存路径
      try {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          const userConfig = await getUserConfig(session.user.id);
          
          // 解析路径，判断是否是子目录
          const pathParts = relativePath.split('/');
          const firstPart = pathParts[0];
          
          if (firstPart === 'uploads' && !userConfig.localStorage?.savePath) {
            // 默认 uploads 目录
            basePath = path.join(os.homedir(), 'ImagineThis');
          } else if (userConfig.localStorage?.savePath) {
            // 用户配置的自定义路径
            let userBasePath: string;
            if (userConfig.localStorage.savePath.startsWith('~')) {
              userBasePath = path.join(os.homedir(), userConfig.localStorage.savePath.slice(1));
            } else if (path.isAbsolute(userConfig.localStorage.savePath)) {
              userBasePath = userConfig.localStorage.savePath;
            } else {
              userBasePath = path.join(process.cwd(), userConfig.localStorage.savePath);
            }
            
            // 如果路径的第一部分是用户配置目录的名称，则使用用户配置的路径
            const configDirName = path.basename(userBasePath);
            if (firstPart === configDirName) {
              // 移除第一部分，因为用户配置的路径已经包含了这部分
              const subPath = pathParts.slice(1).join('/');
              basePath = userBasePath;
              relativePath = subPath; // 更新 relativePath
            } else {
              // 否则直接使用用户配置的路径
              basePath = userBasePath;
            }
          } else {
            // 使用默认路径
            basePath = path.join(os.homedir(), 'ImagineThis');
          }
        } else {
          // 未登录用户，使用默认路径
          basePath = path.join(os.homedir(), 'ImagineThis');
        }
      } catch (error) {
        console.error('获取用户配置失败，使用默认路径:', error);
        basePath = path.join(os.homedir(), 'ImagineThis');
      }
    } else {
      // Web 环境：使用 public 目录
      basePath = path.join(process.cwd(), 'public');
    }
    
    const filePath = path.join(basePath, relativePath);
    
    // 安全检查：确保文件在基础目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(basePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // 读取文件
    const fileBuffer = await fs.readFile(filePath);
    
    // 确定 MIME 类型
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
    
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json(
      { error: 'File not found' },
      { status: 404 }
    );
  }
}
