/**
 * 获取 AI 提供商可用的模型列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface OpenAIModel {
  id: string;
  object?: string;
  type?: string;
  capabilities?: string[];
}

interface OpenAIModelsResponse {
  data?: OpenAIModel[];
}

interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
}

const JIMENG_KNOWN_MODELS = [
  { id: 'doubao-seedream-4-0-250828', name: 'doubao-seedream-4-0-250828' },
  { id: 'doubao-seedream-4-5-251128', name: 'doubao-seedream-4-5-251128' },
  { id: 'doubao-seedream-5-0-260128', name: 'doubao-seedream-5-0-260128' },
];

function isImageModelByMeta(model: OpenAIModel): boolean {
  const lowerId = model.id.toLowerCase();
  const lowerType = (model.type || '').toLowerCase();
  const caps = (model.capabilities || []).map(c => c.toLowerCase());

  // 如果有明确的 type/capabilities，优先使用
  if (lowerType === 'image' || lowerType === 'image_generation') return true;
  if (caps.includes('image') || caps.includes('image_generation') || caps.includes('vision')) return true;

  // 非图片模型快速排除
  const nonImageKeywords = ['embedding', 'moderation', 'classifier', 'whisper', 'tts', 'stt', 'instruct', 'code', 'audio'];
  if (nonImageKeywords.some(kw => lowerId.includes(kw))) return false;

  // fallback 到关键词
  const imageKeywords = [
    'image', 'dall', 'flux', 'imagen', 'seedream', 'ideogram',
    'kling-image', 'mj_', 'mj-', 'vision', 'sdxl', 'stable-diffusion',
    'midjourney', 'gpt-4o-image', 'gpt-4-image', 'glm-4v', 'qwen-vl',
  ];
  return imageKeywords.some(kw => lowerId.includes(kw));
}

function isImageModelByName(id: string): boolean {
  const lower = id.toLowerCase();
  const nonImageKeywords = ['embedding', 'moderation', 'classifier', 'whisper', 'tts', 'stt', 'instruct', 'code', 'audio'];
  if (nonImageKeywords.some(kw => lower.includes(kw))) return false;
  const imageKeywords = [
    'image', 'dall', 'flux', 'imagen', 'seedream', 'ideogram',
    'kling-image', 'mj_', 'mj-', 'vision', 'sdxl', 'stable-diffusion',
    'midjourney', 'gpt-4o-image', 'gpt-4-image', 'glm-4v', 'qwen-vl',
  ];
  return imageKeywords.some(kw => lower.includes(kw));
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = baseUrl.endsWith('/') ? `${baseUrl}v1/models` : `${baseUrl}/v1/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as OpenAIModelsResponse;
  const items = data.data || [];

  // 优先尝试用结构化字段（type/capabilities）判断
  const hasMeta = items.some(m => m.type || (m.capabilities && m.capabilities.length > 0));
  if (hasMeta) {
    const imageModels = items.filter(isImageModelByMeta).map(m => m.id);
    return imageModels.length > 0 ? imageModels : items.map(m => m.id).slice(0, 100);
  }

  // fallback：按名称关键词过滤
  const allIds = items.map(m => m.id);
  const imageModels = allIds.filter(isImageModelByName);
  return imageModels.length > 0 ? imageModels : allIds.slice(0, 100);
}

async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1beta/models?key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as GeminiModelsResponse;
  const items = data.models || [];

  // 优先用 supportedGenerationMethods 判断图片生成能力
  const hasMethods = items.some(m => m.supportedGenerationMethods && m.supportedGenerationMethods.length > 0);
  if (hasMethods) {
    const imageModels = items
      .filter(m => {
        const methods = (m.supportedGenerationMethods || []).map(s => s.toLowerCase());
        // generateContent 是通用能力，需要结合名字里的 image/imagen 或特殊方法如 generateImages
        const isImageMethod = methods.includes('generateimages') || methods.includes('imagegeneration');
        const isImageName = /image|imagen/i.test(m.name);
        return isImageMethod || isImageName;
      })
      .map(m => m.name.replace(/^models\//, ''));
    return imageModels.length > 0 ? imageModels : items.map(m => m.name.replace(/^models\//, '')).slice(0, 100);
  }

  // fallback：按名称关键词过滤
  const allModels = items.map(m => m.name.replace(/^models\//, ''));
  const imageModels = allModels.filter(id => /image|imagen/i.test(id));
  return imageModels.length > 0 ? imageModels : allModels.slice(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, baseUrl, apiKey } = body;

    if (!provider || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: '缺少必要参数: provider, baseUrl, apiKey' },
        { status: 400 }
      );
    }

    let models: string[] = [];

    if (provider === 'gpt' || provider === 'openai') {
      models = await fetchOpenAIModels(baseUrl, apiKey);
    } else if (provider === 'gemini') {
      models = await fetchGeminiModels(baseUrl, apiKey);
    } else if (provider === 'jimeng') {
      models = JIMENG_KNOWN_MODELS.map(m => m.id);
    } else {
      return NextResponse.json({ error: '不支持的提供商' }, { status: 400 });
    }

    return NextResponse.json({ success: true, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[模型列表API] 错误:', message);
    return NextResponse.json(
      { error: `获取模型列表失败: ${message}` },
      { status: 500 }
    );
  }
}
