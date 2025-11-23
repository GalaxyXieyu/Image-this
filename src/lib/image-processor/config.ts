/**
 * 图片处理器配置管理
 */

import { ProvidersConfig } from './types';

const CONFIG_KEY = 'imageProcessorConfig';

// 默认配置
export const defaultConfig: ProvidersConfig = {
  volcengine: {
    enabled: false,
    accessKey: '',
    secretKey: '',
  },
  gpt: {
    enabled: false,
    apiUrl: 'https://yunwu.ai',
    apiKey: '',
  },
  gemini: {
    enabled: false,
    apiKey: '',
    baseUrl: 'https://yunwu.ai',
  },
  qwen: {
    enabled: false,
    apiKey: '',
  },
  jimeng: {
    enabled: false,
    accessKey: '',
    secretKey: '',
  },
};

// 从环境变量加载配置
export function loadConfigFromEnv(): ProvidersConfig {
  return {
    volcengine: {
      enabled: !!(process.env.VOLCENGINE_ACCESS_KEY && process.env.VOLCENGINE_SECRET_KEY),
      accessKey: process.env.VOLCENGINE_ACCESS_KEY || '',
      secretKey: process.env.VOLCENGINE_SECRET_KEY || '',
    },
    gpt: {
      enabled: !!process.env.GPT_API_KEY,
      apiUrl: process.env.GPT_API_URL || 'https://yunwu.ai',
      apiKey: process.env.GPT_API_KEY || '',
    },
    gemini: {
      enabled: !!process.env.GEMINI_API_KEY,
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://yunwu.ai',
    },
    qwen: {
      enabled: !!process.env.QWEN_API_KEY,
      apiKey: process.env.QWEN_API_KEY || '',
    },
    jimeng: {
      enabled: !!(process.env.VOLCENGINE_ACCESS_KEY && process.env.VOLCENGINE_SECRET_KEY),
      accessKey: process.env.VOLCENGINE_ACCESS_KEY || '',
      secretKey: process.env.VOLCENGINE_SECRET_KEY || '',
    },
  };
}

// 从 localStorage 加载配置（客户端）
export function loadConfigFromStorage(): ProvidersConfig {
  if (typeof window === 'undefined') {
    return defaultConfig;
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load config from storage:', error);
  }

  return defaultConfig;
}

// 保存配置到 localStorage（客户端）
export function saveConfigToStorage(config: ProvidersConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config to storage:', error);
  }
}

// 合并环境变量和 localStorage 配置
export function loadMergedConfig(): ProvidersConfig {
  const envConfig = loadConfigFromEnv();
  const storageConfig = loadConfigFromStorage();

  return {
    volcengine: {
      enabled: envConfig.volcengine.enabled || storageConfig.volcengine.enabled,
      accessKey: storageConfig.volcengine.accessKey || envConfig.volcengine.accessKey,
      secretKey: storageConfig.volcengine.secretKey || envConfig.volcengine.secretKey,
    },
    gpt: {
      enabled: envConfig.gpt.enabled || storageConfig.gpt.enabled,
      apiUrl: storageConfig.gpt.apiUrl || envConfig.gpt.apiUrl,
      apiKey: storageConfig.gpt.apiKey || envConfig.gpt.apiKey,
    },
    gemini: {
      enabled: envConfig.gemini.enabled || storageConfig.gemini.enabled,
      apiKey: storageConfig.gemini.apiKey || envConfig.gemini.apiKey,
      baseUrl: storageConfig.gemini.baseUrl || envConfig.gemini.baseUrl,
    },
    qwen: {
      enabled: envConfig.qwen.enabled || storageConfig.qwen.enabled,
      apiKey: storageConfig.qwen.apiKey || envConfig.qwen.apiKey,
    },
    jimeng: {
      enabled: envConfig.jimeng.enabled || storageConfig.jimeng.enabled,
      accessKey: storageConfig.jimeng.accessKey || envConfig.jimeng.accessKey,
      secretKey: storageConfig.jimeng.secretKey || envConfig.jimeng.secretKey,
    },
  };
}
