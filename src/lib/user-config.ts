/**
 * 用户配置管理
 * 从数据库获取用户的 API 配置
 */

import { prisma } from '@/lib/prisma';
import { getStoredSecrets, isDesktopSecretStoreEnabled, setStoredSecrets } from '@/lib/desktop-secret-store';

const USER_CONFIG_CACHE_TTL_MS = 30 * 1000;

type UserConfigCacheEntry = {
  config: UserConfig;
  expiresAt: number;
};

const userConfigCache = new Map<string, UserConfigCacheEntry>();

export interface UserConfig {
  volcengine?: {
    accessKey: string;
    secretKey: string;
  };
  gpt?: {
    apiUrl: string;
    apiKey: string;
    modelName?: string;
  };
  gemini?: {
    apiKey: string;
    baseUrl: string;
    modelName?: string;
  };
  jimeng?: {
    arkApiKey?: string;
    baseUrl?: string;
    modelName?: string;
    accessKey?: string;
    secretKey?: string;
  };
  imagehosting?: {
    superbedToken: string;
  };
  localStorage?: {
    savePath: string;
  };
}

function cloneUserConfig(config: UserConfig): UserConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * 获取用户配置
 * @param userId 用户ID
 * @returns 用户配置（用户不存在时返回空配置）
 */
export async function getUserConfig(userId: string): Promise<UserConfig> {
  const cached = userConfigCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cloneUserConfig(cached.config);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      volcengineAccessKey: true,
      volcengineSecretKey: true,
      hasVolcengineCredentials: true,
      gptApiUrl: true,
      gptApiKey: true,
      gptModelName: true,
      hasGptApiKey: true,
      geminiApiKey: true,
      geminiBaseUrl: true,
      geminiModelName: true,
      hasGeminiApiKey: true,
      arkApiKey: true,
      jimengBaseUrl: true,
      jimengModelName: true,
      hasJimengCredentials: true,
      superbedToken: true,
      hasSuperbedToken: true,
      localStoragePath: true,
    }
  });

  // 用户不存在时返回空配置
  if (!user) {
    console.warn(`[用户配置] 用户不存在: ${userId}，返回空配置`);
    return {};
  }

  const config: UserConfig = {};
  const desktopSecrets = isDesktopSecretStoreEnabled() ? await getStoredSecrets(userId) : {};
  const volcengineAccessKey = desktopSecrets.volcengineAccessKey || user.volcengineAccessKey || '';
  const volcengineSecretKey = desktopSecrets.volcengineSecretKey || user.volcengineSecretKey || '';
  const gptApiKey = desktopSecrets.gptApiKey || user.gptApiKey || '';
  const geminiApiKey = desktopSecrets.geminiApiKey || user.geminiApiKey || '';
  const arkApiKey = desktopSecrets.arkApiKey || user.arkApiKey || '';
  const superbedToken = desktopSecrets.superbedToken || user.superbedToken || '';

  // 火山引擎配置
  if (volcengineAccessKey && volcengineSecretKey) {
    config.volcengine = {
      accessKey: volcengineAccessKey,
      secretKey: volcengineSecretKey,
    };
    console.log('[用户配置] Volcengine: 从数据库读取');
    console.log(`  - AccessKey: ${volcengineAccessKey.substring(0, 10)}...${volcengineAccessKey.substring(volcengineAccessKey.length - 10)}`);
  } else {
    console.warn('[用户配置] Volcengine: 未配置，请在设置页面配置火山引擎 AccessKey 和 SecretKey');
  }

  // GPT 配置
  if (user.gptApiUrl && gptApiKey) {
    config.gpt = {
      apiUrl: user.gptApiUrl,
      apiKey: gptApiKey,
      modelName: user.gptModelName || undefined,
    };
    console.log('[用户配置] GPT: 从数据库读取');
  } else {
    console.warn('[用户配置] GPT: 未配置，请在设置页面配置 GPT API URL 和 API Key');
  }

  // Gemini 配置
  if (geminiApiKey) {
    config.gemini = {
      apiKey: geminiApiKey,
      baseUrl: user.geminiBaseUrl || 'https://toapis.com',
      modelName: user.geminiModelName || 'gemini-3.1-flash-image-preview',
    };
    console.log('[用户配置] Gemini: 从数据库读取');
  } else {
    console.warn('[用户配置] Gemini: 未配置，请在设置页面配置 Gemini API Key');
  }

  // 即梦配置（统一：Ark API 或 Legacy 视觉 API）
  if (arkApiKey || (volcengineAccessKey && volcengineSecretKey)) {
    config.jimeng = {
      arkApiKey: arkApiKey || undefined,
      baseUrl: user.jimengBaseUrl || undefined,
      modelName: user.jimengModelName || undefined,
      accessKey: volcengineAccessKey || undefined,
      secretKey: volcengineSecretKey || undefined,
    };
    console.log('[用户配置] 即梦: 从数据库读取');
  } else {
    console.warn('[用户配置] 即梦: 未配置，请在设置页面配置 ARK API Key 或火山引擎 AccessKey/SecretKey');
  }

  // 图床配置
  if (superbedToken) {
    config.imagehosting = {
      superbedToken,
    };
    console.log('[用户配置] 图床: 从数据库读取');
  } else {
    console.warn('[用户配置] 图床: 未配置，请在设置页面配置 Superbed Token');
  }

  // 本地存储配置
  if (user.localStoragePath) {
    config.localStorage = {
      savePath: user.localStoragePath,
    };
  }

  userConfigCache.set(userId, {
    config: cloneUserConfig(config),
    expiresAt: Date.now() + USER_CONFIG_CACHE_TTL_MS,
  });

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

  if (isDesktopSecretStoreEnabled()) {
    await setStoredSecrets(userId, {
      volcengineAccessKey: config.volcengine?.accessKey,
      volcengineSecretKey: config.volcengine?.secretKey,
      gptApiKey: config.gpt?.apiKey,
      geminiApiKey: config.gemini?.apiKey,
      arkApiKey: config.jimeng?.arkApiKey,
      superbedToken: config.imagehosting?.superbedToken,
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      volcengineAccessKey: isDesktopSecretStoreEnabled() ? null : config.volcengine?.accessKey || null,
      volcengineSecretKey: isDesktopSecretStoreEnabled() ? null : config.volcengine?.secretKey || null,
      hasVolcengineCredentials: !!(config.volcengine?.accessKey && config.volcengine?.secretKey),
      gptApiUrl: config.gpt?.apiUrl || null,
      gptApiKey: isDesktopSecretStoreEnabled() ? null : config.gpt?.apiKey || null,
      gptModelName: config.gpt?.modelName || null,
      hasGptApiKey: !!config.gpt?.apiKey,
      geminiApiKey: isDesktopSecretStoreEnabled() ? null : config.gemini?.apiKey || null,
      geminiBaseUrl: config.gemini?.baseUrl || null,
      geminiModelName: config.gemini?.modelName || null,
      hasGeminiApiKey: !!config.gemini?.apiKey,
      arkApiKey: isDesktopSecretStoreEnabled() ? null : config.jimeng?.arkApiKey || null,
      jimengBaseUrl: config.jimeng?.baseUrl || null,
      jimengModelName: config.jimeng?.modelName || null,
      hasJimengCredentials: !!(config.jimeng?.arkApiKey || (config.jimeng?.accessKey && config.jimeng?.secretKey)),
      superbedToken: isDesktopSecretStoreEnabled() ? null : config.imagehosting?.superbedToken || null,
      hasSuperbedToken: !!config.imagehosting?.superbedToken,
      localStoragePath: config.localStorage?.savePath || null,
    }
  });

  userConfigCache.delete(userId);
  
  return true;
}
