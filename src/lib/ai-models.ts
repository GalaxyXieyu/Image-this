/**
 * 统一 AI 模型配置字典
 * 集中管理模型默认值、fallback 顺序和能力标签
 */

export interface AIModelEntry {
  id: string;
  label: string;
  provider: 'gemini' | 'gpt' | 'jimeng' | 'volcengine';
  capabilities: AIModelCapability[];
  priority: 'primary' | 'fallback' | 'experimental';
  fallbacks?: string[];
}

export type AIModelCapability =
  | 'scene_generation'
  | 'background_replace'
  | 'image_reference'
  | 'outpaint'
  | 'upscale'
  | 'watermark'
  | 'video_generation';

const MODEL_REGISTRY: AIModelEntry[] = [
  {
    id: 'gemini-3.1-flash-image-preview',
    label: 'Gemini 3.1 Flash Image',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'primary',
    fallbacks: ['gemini-3-pro-image-preview'],
  },
  {
    id: 'gemini-3.1-flash-image-preview-official',
    label: 'Gemini 3.1 Flash Image (Official)',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'primary',
    fallbacks: ['gemini-3-pro-image-preview'],
  },
  {
    id: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'primary',
    fallbacks: ['gemini-3-pro-image-preview'],
  },
  {
    id: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'fallback',
  },
  {
    id: 'gemini-3-pro-image-preview-official',
    label: 'Gemini 3 Pro Image (Official)',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'fallback',
  },
  {
    id: 'gemini-3-pro-image-preview-4K',
    label: 'Gemini 3 Pro Image 4K',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'experimental',
  },
  {
    id: 'gemini-3.5-thinking',
    label: 'Gemini 3.5 Thinking',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'experimental',
    fallbacks: ['gemini-3-pro-image-preview'],
  },
  {
    id: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash',
    provider: 'gemini',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'experimental',
    fallbacks: ['gemini-3-pro-image-preview'],
  },
  {
    id: 'gpt-4o-image-vip',
    label: 'GPT-4o Image VIP',
    provider: 'gpt',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'primary',
  },
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'gpt',
    capabilities: ['scene_generation', 'background_replace', 'image_reference'],
    priority: 'primary',
  },
  {
    id: 'doubao-seedream-4-0-250828',
    label: 'Seedream 4.0',
    provider: 'jimeng',
    capabilities: ['scene_generation', 'background_replace'],
    priority: 'primary',
  },
  {
    id: 'doubao-seedream-4-5-251128',
    label: 'Seedream 4.5',
    provider: 'jimeng',
    capabilities: ['scene_generation', 'background_replace'],
    priority: 'primary',
  },
  {
    id: 'doubao-seedream-5-0-260128',
    label: 'Seedream 5.0',
    provider: 'jimeng',
    capabilities: ['scene_generation', 'background_replace'],
    priority: 'experimental',
  },
];

/** 默认首选模型（按 provider） */
export const DEFAULT_PRIMARY_MODELS: Record<string, string> = {
  gemini: 'gemini-3.1-flash-image-preview',
  gpt: 'gpt-4o-image-vip',
  jimeng: 'doubao-seedream-4-5-251128',
};

/** Gemini fallback 列表（供 /api/models 使用，已移除 2.5） */
export const GEMINI_FALLBACK_MODELS: string[] = [
  'gemini-3-pro-image-preview-official',
  'gemini-3.1-pro',
  'gemini-3.1-flash-image-preview-official',
  'gemini-3-pro-image-preview',
  'gemini-3.5-thinking',
  'gemini-3.5-flash',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview-4K',
];

/** 即梦已知模型列表 */
export const JIMENG_KNOWN_MODELS: string[] = [
  'doubao-seedream-4-0-250828',
  'doubao-seedream-4-5-251128',
  'doubao-seedream-5-0-260128',
];

/** 获取模型条目 */
export function getModelEntry(modelId: string): AIModelEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.id === modelId);
}

/** 获取 provider 的 fallback 链 */
export function getFallbackChain(provider: string, modelId: string): string[] {
  const entry = getModelEntry(modelId);
  if (entry?.fallbacks && entry.provider === provider) {
    return entry.fallbacks;
  }
  // 如果当前不是 provider 的 primary，回退到 primary
  const primary = DEFAULT_PRIMARY_MODELS[provider];
  if (primary && primary !== modelId) {
    const primaryEntry = getModelEntry(primary);
    if (primaryEntry?.fallbacks) {
      return [primary, ...primaryEntry.fallbacks];
    }
    return [primary];
  }
  return [];
}

/** 按能力过滤可用模型 */
export function getModelsByCapability(capability: AIModelCapability): AIModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.capabilities.includes(capability));
}

/** 获取场景生成推荐的模型列表（已按优先级排序） */
export function getSceneGenerationModels(): AIModelEntry[] {
  return MODEL_REGISTRY.filter((m) =>
    m.capabilities.includes('scene_generation')
  ).sort((a, b) => {
    const order = { primary: 0, fallback: 1, experimental: 2 };
    return order[a.priority] - order[b.priority];
  });
}