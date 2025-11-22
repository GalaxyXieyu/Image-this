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
    projectId: string;
  };
  imagehosting?: {
    superbedToken: string;
  };
}

/**
 * 获取用户配置
 * @param userId 用户ID
 * @returns 用户配置
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
      geminiProjectId: true,
      superbedToken: true,
    }
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const config: UserConfig = {};

  // 火山引擎配置
  if (user.volcengineAccessKey && user.volcengineSecretKey) {
    config.volcengine = {
      accessKey: user.volcengineAccessKey,
      secretKey: user.volcengineSecretKey,
    };
  }

  // GPT 配置
  if (user.gptApiUrl && user.gptApiKey) {
    config.gpt = {
      apiUrl: user.gptApiUrl,
      apiKey: user.gptApiKey,
    };
  }

  // Gemini 配置
  if (user.geminiApiKey) {
    config.gemini = {
      apiKey: user.geminiApiKey,
      baseUrl: user.geminiBaseUrl || 'https://yunwu.ai',
      projectId: user.geminiProjectId || '',
    };
  }

  // 图床配置
  if (user.superbedToken) {
    config.imagehosting = {
      superbedToken: user.superbedToken,
    };
  }

  return config;
}

/**
 * 保存用户配置
 * @param userId 用户ID
 * @param config 配置对象
 */
export async function saveUserConfig(userId: string, config: UserConfig): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      volcengineAccessKey: config.volcengine?.accessKey || null,
      volcengineSecretKey: config.volcengine?.secretKey || null,
      gptApiUrl: config.gpt?.apiUrl || null,
      gptApiKey: config.gpt?.apiKey || null,
      geminiApiKey: config.gemini?.apiKey || null,
      geminiBaseUrl: config.gemini?.baseUrl || null,
      geminiProjectId: config.gemini?.projectId || null,
      superbedToken: config.imagehosting?.superbedToken || null,
    }
  });
}
