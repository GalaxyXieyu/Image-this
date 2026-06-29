/**
 * 用户设置 API
 * 用于保存和获取用户配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserConfig, normalizeTaskConcurrency, saveUserConfig, UserConfig } from '@/lib/user-config';

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

    function normalizeModels(raw: unknown): { id: string; enabled: boolean }[] | undefined {
      if (!Array.isArray(raw)) return undefined;
      const cleaned = raw
        .filter((m): m is { id?: unknown; enabled?: unknown } => typeof m === 'object' && m !== null)
        .map((m) => ({ id: String(m.id ?? '').trim(), enabled: !!m.enabled }))
        .filter((m) => m.id.length > 0);
      return cleaned.length > 0 ? cleaned : undefined;
    }

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
        models: normalizeModels(body.gpt.models),
      };
    }

    if (body.gemini?.enabled && body.gemini?.apiKey) {
      userConfig.gemini = {
        apiKey: body.gemini.apiKey,
        baseUrl: body.gemini.baseUrl || 'https://toapis.com',
        modelName: body.gemini.modelName || 'gemini-3.1-flash-image-preview',
        models: normalizeModels(body.gemini.models),
      };
    }

    if (body.jimeng?.enabled && (body.jimeng?.arkApiKey || body.jimeng?.accessKey)) {
      userConfig.jimeng = {
        arkApiKey: body.jimeng.arkApiKey || undefined,
        baseUrl: body.jimeng.baseUrl || undefined,
        modelName: body.jimeng.modelName || undefined,
        models: normalizeModels(body.jimeng.models),
        accessKey: body.jimeng.accessKey || undefined,
        secretKey: body.jimeng.secretKey || undefined,
      };
    }

    if (body.imagehosting?.enabled && body.imagehosting?.superbedToken) {
      userConfig.imagehosting = {
        superbedToken: body.imagehosting.superbedToken,
      };
    }
    
    if (body.copywriter?.apiKey) {
      userConfig.copywriter = {
        apiKey: body.copywriter.apiKey,
        baseUrl: body.copywriter.baseUrl || 'https://toapis.com/v1',
        modelName: body.copywriter.modelName || 'gpt-5.4-mini',
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
    
    return NextResponse.json({ 
      success: true,
      message: '配置已保存'
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
        modelName: userConfig.gpt?.modelName || 'gpt-4o-image-vip',
        models: userConfig.gpt?.models ?? (userConfig.gpt?.modelName ? [{ id: userConfig.gpt.modelName, enabled: true }] : [])
      },
      gemini: {
        enabled: !!userConfig.gemini,
        apiKey: userConfig.gemini?.apiKey || '',
        baseUrl: userConfig.gemini?.baseUrl || 'https://toapis.com',
        modelName: userConfig.gemini?.modelName || 'gemini-3.1-flash-image-preview',
        models: userConfig.gemini?.models ?? (userConfig.gemini?.modelName ? [{ id: userConfig.gemini.modelName, enabled: true }] : [])
      },
      jimeng: {
        enabled: !!userConfig.jimeng,
        arkApiKey: userConfig.jimeng?.arkApiKey || '',
        baseUrl: userConfig.jimeng?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        modelName: userConfig.jimeng?.modelName || 'seedream-4.5',
        models: userConfig.jimeng?.models ?? (userConfig.jimeng?.modelName ? [{ id: userConfig.jimeng.modelName, enabled: true }] : []),
        accessKey: userConfig.jimeng?.accessKey || '',
        secretKey: userConfig.jimeng?.secretKey || ''
      },
      imagehosting: {
        enabled: !!userConfig.imagehosting,
        superbedToken: userConfig.imagehosting?.superbedToken || ''
      },
      copywriter: {
        enabled: !!userConfig.copywriter,
        apiKey: userConfig.copywriter?.apiKey || '',
        baseUrl: userConfig.copywriter?.baseUrl || 'https://toapis.com/v1',
        modelName: userConfig.copywriter?.modelName || 'gpt-5.4-mini'
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
