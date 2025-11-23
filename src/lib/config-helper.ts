/**
 * 配置助手函数
 * 用于从 localStorage 读取用户配置
 */

export interface VolcengineConfig {
  accessKey: string;
  secretKey: string;
}

export interface UserConfig {
  volcengine?: {
    enabled: boolean;
    accessKey: string;
    secretKey: string;
  };
  gpt?: {
    enabled: boolean;
    apiUrl: string;
    apiKey: string;
  };
  gemini?: {
    enabled: boolean;
    apiKey: string;
    baseUrl: string;
  };
}

/**
 * 从 localStorage 读取用户配置
 */
export function getUserConfig(): UserConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const savedSettings = localStorage.getItem('imageProcessorConfig');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('[配置助手] 读取配置失败:', error);
  }

  return null;
}

/**
 * 获取火山引擎配置
 * 如果用户未配置或未启用，返回 undefined
 */
export function getVolcengineConfig(): VolcengineConfig | undefined {
  const config = getUserConfig();
  
  if (!config?.volcengine?.enabled) {
    return undefined;
  }

  const { accessKey, secretKey } = config.volcengine;
  
  if (!accessKey || !secretKey) {
    return undefined;
  }

  return { accessKey, secretKey };
}

/**
 * 检查火山引擎是否已配置
 */
export function isVolcengineConfigured(): boolean {
  const config = getVolcengineConfig();
  return !!config;
}

/**
 * 获取 GPT 配置
 * 如果用户未配置或未启用，返回 undefined
 */
export function getGPTConfig(): { apiUrl: string; apiKey: string } | undefined {
  const config = getUserConfig();
  
  if (!config?.gpt?.enabled) {
    return undefined;
  }

  const { apiUrl, apiKey } = config.gpt;
  
  if (!apiUrl || !apiKey) {
    return undefined;
  }

  return { apiUrl, apiKey };
}

/**
 * 检查 GPT 是否已配置
 */
export function isGPTConfigured(): boolean {
  const config = getGPTConfig();
  return !!config;
}

/**
 * 获取 Qwen 配置（通义千问）
 * 注意：Qwen 使用 GPT 的配置，因为它们共用同一个 API 端点
 */
export function getQwenConfig(): { apiKey: string } | undefined {
  const gptConfig = getGPTConfig();
  if (!gptConfig) {
    return undefined;
  }
  return { apiKey: gptConfig.apiKey };
}

/**
 * 检查 Qwen 是否已配置
 */
export function isQwenConfigured(): boolean {
  return isGPTConfigured();
}

/**
 * 获取配置缺失的友好提示
 */
export function getConfigMissingMessage(service: 'volcengine' | 'gpt' | 'gemini' | 'qwen'): string {
  const messages = {
    volcengine: '请先在设置页面配置火山引擎 Access Key 和 Secret Key',
    gpt: '请先在设置页面配置 GPT API 地址和密钥',
    qwen: '请先在设置页面配置 GPT API 密钥（通义千问使用 GPT 配置）',
    gemini: '请先在设置页面配置 Google Gemini API 密钥'
  };

  return messages[service];
}
