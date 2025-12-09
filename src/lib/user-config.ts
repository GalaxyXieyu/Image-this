/**
 * 用户配置管理
 * 从数据库获取用户的 API 配置
 */

import { prisma } from '@/lib/prisma';

export interface UserConfig {
  volcengine?: {
    accessKey: string;
    secretKey: string;
  };
  gpt?: {
    apiUrl: string;
    apiKey: string;
  };
  gemini?: {
    apiKey: string;
    baseUrl: string;
  };
  imagehosting?: {
    superbedToken: string;
  };
  localStorage?: {
    savePath: string;
  };
}

/**
 * 获取用户配置
 * @param userId 用户ID
 * @returns 用户配置（用户不存在时返回空配置）
 */
export async function getUserConfig(userId: string): Promise<UserConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      volcengineAccessKey: true,
      volcengineSecretKey: true,
      gptApiUrl: true,
      gptApiKey: true,
      geminiApiKey: true,
      geminiBaseUrl: true,
      superbedToken: true,
      localStoragePath: true,
    }
  });

  // 用户不存在时返回硬编码默认配置
  if (!user) {
    console.warn(`[用户配置] 用户不存在: ${userId}，使用硬编码默认配置`);
    const defaultConfig = {
      volcengine: {
        accessKey: 'AKLTYzk3Y2U5YjUxMjM1NDk0YTg0NmRkN2U0ZTkxZDQzYWE',
        secretKey: 'Tm1FNE1Ea3lNelJoT0RZM05EZGtNR0U0WlRBME5qZGxaamxoTlRjeE9ERQ=='
      },
      gpt: {
        apiUrl: 'https://yunwu.ai',
        apiKey: 'sk-3MUwbxYhQRjj9J9xIkD5RRS4oyxmlhqPXuVHHvsQXZTDDo4A'
      },
      gemini: {
        apiKey: 'sk-GVb87LaFxklfvOz7aym0Ql2rreqrrGJvCGXK8cYIyY8foe9y',
        baseUrl: 'https://yunwu.ai'
      },
      imagehosting: {
        superbedToken: '00fbe01340604063b1f59aedc0481ddc'
      }
    };
    console.log('[用户配置] 返回默认配置:', JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }

  const config: UserConfig = {};

  // 火山引擎配置
  if (user.volcengineAccessKey && user.volcengineSecretKey) {
    config.volcengine = {
      accessKey: user.volcengineAccessKey,
      secretKey: user.volcengineSecretKey,
    };
    console.log('[用户配置] Volcengine: 从数据库读取');
    console.log(`  - AccessKey: ${user.volcengineAccessKey.substring(0, 10)}...${user.volcengineAccessKey.substring(user.volcengineAccessKey.length - 10)}`);
  } else {
    // 硬编码兜底
    config.volcengine = {
      accessKey: 'AKLTYzk3Y2U5YjUxMjM1NDk0YTg0NmRkN2U0ZTkxZDQzYWE',
      secretKey: 'Tm1FNE1Ea3lNelJoT0RZM05EZGtNR0U0WlRBME5qZGxaamxoTlRjeE9ERQ=='
    };
    console.log('[用户配置] Volcengine: 使用硬编码兜底');
    console.log(`  - AccessKey: AKLTYzk3Y2...ZDQzYWE (硬编码)`);
  }

  // GPT 配置
  if (user.gptApiUrl && user.gptApiKey) {
    config.gpt = {
      apiUrl: user.gptApiUrl,
      apiKey: user.gptApiKey,
    };
    console.log('[用户配置] GPT: 从数据库读取');
  } else {
    config.gpt = {
      apiUrl: 'https://yunwu.ai',
      apiKey: 'sk-3MUwbxYhQRjj9J9xIkD5RRS4oyxmlhqPXuVHHvsQXZTDDo4A'
    };
    console.log('[用户配置] GPT: 使用硬编码兜底');
  }

  // Gemini 配置
  if (user.geminiApiKey) {
    config.gemini = {
      apiKey: user.geminiApiKey,
      baseUrl: user.geminiBaseUrl || 'https://yunwu.ai',
    };
    console.log('[用户配置] Gemini: 从数据库读取');
  } else {
    config.gemini = {
      apiKey: 'sk-GVb87LaFxklfvOz7aym0Ql2rreqrrGJvCGXK8cYIyY8foe9y',
      baseUrl: 'https://yunwu.ai'
    };
    console.log('[用户配置] Gemini: 使用硬编码兜底');
  }

  // 图床配置
  if (user.superbedToken) {
    config.imagehosting = {
      superbedToken: user.superbedToken,
    };
    console.log('[用户配置] 图床: 从数据库读取');
  } else {
    // 硬编码兜底
    config.imagehosting = {
      superbedToken: '00fbe01340604063b1f59aedc0481ddc'
    };
    console.log('[用户配置] 图床: 使用硬编码兜底');
  }

  // 本地存储配置
  if (user.localStoragePath) {
    config.localStorage = {
      savePath: user.localStoragePath,
    };
  }

  return config;
}

/**
 * 保存用户配置
 * @param userId 用户ID
 * @param config 配置对象
 * @returns 是否保存成功
 */
export async function saveUserConfig(userId: string, config: UserConfig): Promise<boolean> {
  // 先检查用户是否存在
  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  if (!userExists) {
    console.warn(`[用户配置] 无法保存配置，用户不存在: ${userId}`);
    return false;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      volcengineAccessKey: config.volcengine?.accessKey || null,
      volcengineSecretKey: config.volcengine?.secretKey || null,
      gptApiUrl: config.gpt?.apiUrl || null,
      gptApiKey: config.gpt?.apiKey || null,
      geminiApiKey: config.gemini?.apiKey || null,
      geminiBaseUrl: config.gemini?.baseUrl || null,
      superbedToken: config.imagehosting?.superbedToken || null,
      localStoragePath: config.localStorage?.savePath || null,
    }
  });
  
  return true;
}
