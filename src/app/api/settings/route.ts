/**
 * 用户设置 API
 * 用于保存和获取用户配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserConfig, normalizeTaskConcurrency, saveUserConfig, UserConfig } from '@/lib/user-config';
import fs from 'fs';
import path from 'path';

const DATA_ROOT_POINTER_FILE = 'data-root.json';

function writeDesktopDataRootPointer(dataRoot?: string) {
  const userDataPath = process.env.IMAGINE_THIS_LEGACY_USER_DATA_PATH || process.env.IMAGINE_THIS_USER_DATA_PATH;
  if (process.env.IMAGINE_THIS_DESKTOP !== 'true' || !userDataPath) {
    return false;
  }

  const pointerPath = path.join(userDataPath, DATA_ROOT_POINTER_FILE);
  fs.mkdirSync(path.dirname(pointerPath), { recursive: true });

  if (!dataRoot?.trim()) {
    if (fs.existsSync(pointerPath)) {
      fs.rmSync(pointerPath, { force: true });
      return true;
    }
    return false;
  }

  const nextDataRoot = path.resolve(dataRoot.trim());
  if (fs.existsSync(pointerPath)) {
    try {
      const current = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
      if (current?.dataRoot === nextDataRoot) {
        return false;
      }
    } catch {
      // 重写损坏的指针文件
    }
  }

  fs.writeFileSync(
    pointerPath,
    JSON.stringify({
      dataRoot: nextDataRoot,
      updatedAt: new Date().toISOString(),
    }, null, 2),
    'utf8'
  );

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // 转换前端配置格式到后端格式
    const userConfig: UserConfig = {};
    
    if (body.volcengine?.enabled && body.volcengine?.accessKey && body.volcengine?.secretKey) {
      userConfig.volcengine = {
        accessKey: body.volcengine.accessKey,
        secretKey: body.volcengine.secretKey,
      };
    }
    
    if (body.gpt?.enabled && body.gpt?.apiUrl && body.gpt?.apiKey) {
      userConfig.gpt = {
        apiUrl: body.gpt.apiUrl,
        apiKey: body.gpt.apiKey,
        modelName: body.gpt.modelName || undefined,
      };
    }
    
    if (body.gemini?.enabled && body.gemini?.apiKey) {
      userConfig.gemini = {
        apiKey: body.gemini.apiKey,
        baseUrl: body.gemini.baseUrl || 'https://toapis.com',
        modelName: body.gemini.modelName || 'gemini-3.1-flash-image-preview',
      };
    }

    if (body.jimeng?.enabled && (body.jimeng?.arkApiKey || body.jimeng?.accessKey)) {
      userConfig.jimeng = {
        arkApiKey: body.jimeng.arkApiKey || undefined,
        baseUrl: body.jimeng.baseUrl || undefined,
        modelName: body.jimeng.modelName || undefined,
        accessKey: body.jimeng.accessKey || undefined,
        secretKey: body.jimeng.secretKey || undefined,
      };
    }

    if (body.imagehosting?.enabled && body.imagehosting?.superbedToken) {
      userConfig.imagehosting = {
        superbedToken: body.imagehosting.superbedToken,
      };
    }
    
    if (body.localStorage?.savePath) {
      userConfig.localStorage = {
        savePath: body.localStorage.savePath,
      };
    }

    userConfig.taskRuntime = {
      concurrency: normalizeTaskConcurrency(body.taskRuntime?.concurrency),
    };
    
    const saved = await saveUserConfig(session.user.id, userConfig);
    
    if (!saved) {
      return NextResponse.json({ 
        success: false,
        error: '用户不存在，请重新登录'
      }, { status: 404 });
    }

    const dataRootChanged = writeDesktopDataRootPointer(userConfig.localStorage?.savePath);
    
    return NextResponse.json({ 
      success: true,
      message: dataRootChanged ? '配置已保存，数据目录将在重启应用后生效' : '配置已保存',
      requiresRestart: dataRootChanged
    });
    
  } catch (error) {
    console.error('[设置API] 错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const userConfig = await getUserConfig(session.user.id);
    
    // 转换为前端格式
    const config = {
      volcengine: {
        enabled: !!userConfig.volcengine,
        accessKey: userConfig.volcengine?.accessKey || '',
        secretKey: userConfig.volcengine?.secretKey || ''
      },
      gpt: {
        enabled: !!userConfig.gpt,
        apiUrl: userConfig.gpt?.apiUrl || 'https://yunwu.ai',
        apiKey: userConfig.gpt?.apiKey || '',
        modelName: userConfig.gpt?.modelName || 'gpt-4o-image-vip'
      },
      gemini: {
        enabled: !!userConfig.gemini,
        apiKey: userConfig.gemini?.apiKey || '',
        baseUrl: userConfig.gemini?.baseUrl || 'https://toapis.com',
        modelName: userConfig.gemini?.modelName || 'gemini-3.1-flash-image-preview'
      },
      jimeng: {
        enabled: !!userConfig.jimeng,
        arkApiKey: userConfig.jimeng?.arkApiKey || '',
        baseUrl: userConfig.jimeng?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        modelName: userConfig.jimeng?.modelName || 'seedream-4.5',
        accessKey: userConfig.jimeng?.accessKey || '',
        secretKey: userConfig.jimeng?.secretKey || ''
      },
      imagehosting: {
        enabled: !!userConfig.imagehosting,
        superbedToken: userConfig.imagehosting?.superbedToken || ''
      },
      localStorage: {
        savePath: userConfig.localStorage?.savePath || ''
      },
      taskRuntime: {
        concurrency: normalizeTaskConcurrency(userConfig.taskRuntime?.concurrency)
      }
    };
    
    return NextResponse.json({ 
      success: true,
      config
    });
    
  } catch (error) {
    console.error('[设置API] 错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
