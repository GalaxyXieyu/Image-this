/**
 * 获取 AI 提供商可用的模型列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  GEMINI_FALLBACK_MODELS,
  JIMENG_KNOWN_MODELS,
} from '@/lib/ai-models';

interface OpenAIModel {
  id: string;
}

interface OpenAIModelsResponse {
  data?: OpenAIModel[];
}

interface GeminiModel {
  name: string;
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
}

function mapModelProviderLabel(provider: string) {
  switch (provider) {
    case 'gpt':
    case 'openai':
      return 'GPT';
    case 'gemini':
      return 'Gemini';
    case 'jimeng':
      return '即梦';
    default:
      return '模型服务';
  }
}

function mapUpstreamModelError(provider: string, status: number, details: string) {
  const providerLabel = mapModelProviderLabel(provider);
  const normalizedDetails = details.toLowerCase();

  if (
    normalizedDetails.includes('unsupported operation') ||
    normalizedDetails.includes('requested operation is unsupported') ||
    normalizedDetails.includes('does not support image')
  ) {
    return `${providerLabel} 当前接口不支持这个操作，请确认 Base URL 指向兼容的图片接口，并检查模型是否支持该能力。`;
  }

  if (status === 401 || status === 403) {
    if (normalizedDetails.includes('invalid token') || normalizedDetails.includes('api key')) {
      return `${providerLabel} API Key 无效、过期，或没有对应权限，请检查后重试。`;
    }

    return `${providerLabel} 鉴权失败，请检查 API Key、令牌权限或账户状态。`;
  }

  if (status === 404) {
    return `${providerLabel} 接口地址不存在，请检查 Base URL 是否填写正确。`;
  }

  if (status === 408) {
    return `${providerLabel} 请求超时，请稍后重试。`;
  }

  if (status === 429) {
    return `${providerLabel} 请求过于频繁或额度已用尽，请稍后再试。`;
  }

  if (status >= 500) {
    return `${providerLabel} 服务暂时异常，请稍后重试。`;
  }

  return `${providerLabel} 请求失败（HTTP ${status}），请检查接口配置是否正确。`;
}

function normalizeModelErrorMessage(provider: string, message: string) {
  const providerLabel = mapModelProviderLabel(provider);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('aborted')) {
    return `${providerLabel} 请求超时，请检查网络或接口地址后重试。`;
  }

  if (
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('econnrefused') ||
    normalizedMessage.includes('enotfound')
  ) {
    return `${providerLabel} 无法连接到接口地址，请检查 Base URL、网络或代理设置。`;
  }

  return message;
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string, provider: string): Promise<string[]> {
  const url = baseUrl.endsWith('/') ? `${baseUrl}v1/models` : `${baseUrl}/v1/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(mapUpstreamModelError(provider, res.status, text.slice(0, 200)));
  }
  const data = (await res.json()) as OpenAIModelsResponse;
  const items = data.data || [];
  return items.map(m => m.id);
}

async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/v1beta/models?key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(mapUpstreamModelError('gemini', res.status, text.slice(0, 200)));
  }
  const data = (await res.json()) as GeminiModelsResponse;
  const items = data.models || [];
  return items.map(m => m.name.replace(/^models\//, ''));
}

export async function POST(request: NextRequest) {
  let provider = 'unknown';

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    provider = body.provider || 'unknown';
    const { baseUrl, apiKey } = body;

    if (!provider || !baseUrl || !apiKey) {
      return NextResponse.json(
        { error: '缺少必要参数: provider, baseUrl, apiKey' },
        { status: 400 }
      );
    }

    let models: string[] = [];

    const isOpenAICompatible = provider === 'gpt' || provider === 'openai' || baseUrl.includes('toapis.com');

    if (isOpenAICompatible) {
      models = await fetchOpenAIModels(baseUrl, apiKey, provider);
    } else if (provider === 'gemini') {
      const remoteModels = await fetchGeminiModels(baseUrl, apiKey);
      models = Array.from(new Set([...remoteModels, ...GEMINI_FALLBACK_MODELS]));
    } else if (provider === 'jimeng') {
      models = JIMENG_KNOWN_MODELS;
    } else {
      return NextResponse.json({ error: '不支持的提供商' }, { status: 400 });
    }

    return NextResponse.json({ success: true, models });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : '未知错误';
    const message = normalizeModelErrorMessage(provider, rawMessage);
    console.error('[模型列表API] 错误:', message);
    return NextResponse.json(
      { error: `获取模型列表失败: ${message}` },
      { status: 500 }
    );
  }
}
