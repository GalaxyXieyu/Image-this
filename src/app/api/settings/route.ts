/**
 * 用户设置 API
 * 用于保存和获取用户配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserConfig, saveUserConfig, UserConfig } from '@/lib/user-config';

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
      };
    }
    
    if (body.gemini?.enabled && body.gemini?.apiKey) {
      userConfig.gemini = {
        apiKey: body.gemini.apiKey,
        baseUrl: body.gemini.baseUrl || 'https://yunwu.ai',
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
        apiKey: userConfig.gpt?.apiKey || ''
      },
      gemini: {
        enabled: !!userConfig.gemini,
        apiKey: userConfig.gemini?.apiKey || '',
        baseUrl: userConfig.gemini?.baseUrl || 'https://yunwu.ai'
      },
      imagehosting: {
        enabled: !!userConfig.imagehosting,
        superbedToken: userConfig.imagehosting?.superbedToken || ''
      },
      localStorage: {
        savePath: userConfig.localStorage?.savePath || ''
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
