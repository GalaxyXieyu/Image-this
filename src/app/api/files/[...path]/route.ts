import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getUserConfig } from '@/lib/user-config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const THUMBNAIL_CACHE_DIR = path.join(
  os.homedir(),
  'ImagineThis',
  'cache',
  'thumbnails'
);

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function resolveConfiguredPath(savePath: string): string {
  if (savePath.startsWith('~')) {
    return path.join(os.homedir(), savePath.slice(1));
  }
  if (path.isAbsolute(savePath)) {
    return savePath;
  }
  return path.join(process.cwd(), savePath);
}

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
      // Web 环境：输入素材的公开路径省略了 uploads 前缀。
      // 若用户配置了本地存储路径，优先从该路径读取；否则回退到 public/uploads。
      const pathParts = relativePath.split('/');
      if (pathParts[0] === 'input-assets') {
        const session = await getServerSession(authOptions);
        if (session?.user?.id) {
          const userConfig = await getUserConfig(session.user.id);
          basePath = userConfig.localStorage?.savePath
            ? resolveConfiguredPath(userConfig.localStorage.savePath)
            : path.join(process.cwd(), 'public', 'uploads');
        } else {
          basePath = path.join(process.cwd(), 'public', 'uploads');
        }
      } else {
        basePath = path.join(process.cwd(), 'public');
      }
    }
    
    let filePath = path.join(basePath, relativePath);
    if (relativePath.startsWith('input-assets/') && !(await pathExists(filePath))) {
      const uploadsPath = path.join(basePath, 'uploads', relativePath);
      if (await pathExists(uploadsPath)) {
        filePath = uploadsPath;
      }
    }
    
    // 安全检查：确保文件在基础目录内
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(basePath);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
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

    // 按需缩略图：?w=<宽度> → sharp 缩放为 webp 并磁盘缓存（大幅降低图库网格的下载量）。
    // 仅对位图生效；失败则回退原图。
    const wParam = request.nextUrl.searchParams.get('w');
    const reqWidth = wParam ? Math.min(1600, Math.max(16, parseInt(wParam, 10) || 0)) : 0;
    if (reqWidth && ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      try {
        const crypto = await import('crypto');
        const fileStat = await fs.stat(filePath);
        const key = crypto
          .createHash('sha256')
          .update(`${resolvedPath}|${fileStat.size}|${fileStat.mtimeMs}|w${reqWidth}`)
          .digest('hex');
        const cacheFile = path.join(THUMBNAIL_CACHE_DIR, `${key}.webp`);

        try {
          const cachedThumbnail = await fs.readFile(cacheFile);
          return new NextResponse(new Uint8Array(cachedThumbnail), {
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
          });
        } catch {
          // 缓存 miss 后才读原图和加载 sharp，避免缓存命中仍触发大文件 I/O。
        }

        const [fileBuffer, sharpModule] = await Promise.all([
          fs.readFile(filePath),
          import('sharp'),
        ]);
        const thumbnail = await sharpModule.default(fileBuffer)
          .rotate()
          .resize({ width: reqWidth, withoutEnlargement: true })
          .webp({ quality: 72 })
          .toBuffer();

        await fs.mkdir(THUMBNAIL_CACHE_DIR, { recursive: true });
        await fs.writeFile(cacheFile, thumbnail).catch(() => {});

        return new NextResponse(new Uint8Array(thumbnail), {
          headers: {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        });
      } catch (e) {
        console.warn('[files] 缩略图生成失败，回退原图:', e);
        // 落到下面返回原图
      }
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
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
