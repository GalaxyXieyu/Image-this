type ProviderType =
  | 'gpt'
  | 'openai'
  | 'gemini'
  | 'jimeng'
  | 'qwen'
  | 'volcengine'
  | 'unknown';

function getProviderLabel(provider: ProviderType): string {
  switch (provider) {
    case 'gpt':
    case 'openai':
      return 'GPT';
    case 'gemini':
      return 'Gemini';
    case 'jimeng':
      return '即梦';
    case 'qwen':
      return '通义千问';
    case 'volcengine':
      return '火山引擎';
    default:
      return '当前服务';
  }
}

function detectProvider(message: string): ProviderType {
  const normalized = message.toLowerCase();

  if (normalized.includes('gemini')) {
    return 'gemini';
  }

  if (normalized.includes('jimeng') || normalized.includes('即梦') || normalized.includes('ark')) {
    return 'jimeng';
  }

  if (normalized.includes('qwen') || normalized.includes('通义千问')) {
    return 'qwen';
  }

  if (normalized.includes('volcengine') || normalized.includes('火山引擎')) {
    return 'volcengine';
  }

  if (normalized.includes('gpt') || normalized.includes('openai')) {
    return 'gpt';
  }

  return 'unknown';
}

function extractStatus(message: string): number | undefined {
  const match = message.match(/HTTP\s*(\d{3})/i);
  if (!match) {
    return undefined;
  }

  const status = Number(match[1]);
  return Number.isNaN(status) ? undefined : status;
}

function normalizeWrappedMessage(message: string, provider?: ProviderType): string | null {
  const retryMatch = message.match(/^(处理失败:\s*)(.+?)(，准备第\s*\d+\s*次重试.*)$/);
  if (retryMatch) {
    return `${retryMatch[1]}${mapProviderErrorMessage(retryMatch[2], provider)}${retryMatch[3]}`;
  }

  const failedMatch = message.match(/^(重试\s*\d+\s*次后仍然失败:\s*)(.+)$/);
  if (failedMatch) {
    return `${failedMatch[1]}${mapProviderErrorMessage(failedMatch[2], provider)}`;
  }

  return null;
}

/**
 * 判断 provider 错误是否值得重试。
 * 配额/余额不足、鉴权、模型/接口不存在、参数错误等重试也不会成功 → 不重试，直接失败并提示。
 * 超时、429 限流、5xx、网络抖动 → 可重试。
 */
export function isRetryableProviderError(message: string): boolean {
  if (!message) return true;
  const normalized = message.toLowerCase();
  const status = extractStatus(message);

  if (
    status === 400 ||
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 404 ||
    normalized.includes('quota') ||
    normalized.includes('not enough') ||
    normalized.includes('insufficient') ||
    normalized.includes('余额') ||
    normalized.includes('额度') ||
    normalized.includes('invalid token') ||
    normalized.includes('invalid api key') ||
    normalized.includes('incorrect api key') ||
    normalized.includes('authentication') ||
    normalized.includes('model not found') ||
    normalized.includes('invalid model') ||
    normalized.includes('unknown model') ||
    normalized.includes('unsupported') ||
    normalized.includes('does not support image') ||
    normalized.includes('not support image')
  ) {
    return false;
  }

  return true;
}

export function mapProviderErrorMessage(message: string, provider?: ProviderType): string {
  if (!message) {
    return '未知错误，请稍后重试。';
  }

  const wrapped = normalizeWrappedMessage(message, provider);
  if (wrapped) {
    return wrapped;
  }

  const resolvedProvider = provider || detectProvider(message);
  const providerLabel = getProviderLabel(resolvedProvider);
  const normalized = message.toLowerCase();
  const status = extractStatus(message);

  if (
    normalized.includes('unsupported operation') ||
    normalized.includes('requested operation is unsupported') ||
    normalized.includes('does not support image') ||
    normalized.includes('not support image')
  ) {
    return `${providerLabel} 当前接口不支持图片生成或背景替换，请确认 Base URL 指向兼容的图片接口（如 /v1/images/generations）并使用支持出图的模型。`;
  }

  if (
    normalized.includes('model not found') ||
    normalized.includes('invalid model') ||
    normalized.includes('unknown model') ||
    normalized.includes('does not exist')
  ) {
    return `${providerLabel} 模型不存在，或当前接口不支持这个模型，请检查模型名称。`;
  }

  if (
    status === 402 ||
    normalized.includes('quota') ||
    normalized.includes('not enough') ||
    normalized.includes('insufficient') ||
    normalized.includes('余额') ||
    normalized.includes('额度')
  ) {
    return `${providerLabel} 账户配额/余额不足，请充值或更换有额度的密钥后重试。`;
  }

  if (
    status === 401 ||
    status === 403 ||
    normalized.includes('invalid token') ||
    normalized.includes('invalid api key') ||
    normalized.includes('incorrect api key') ||
    normalized.includes('authentication')
  ) {
    return `${providerLabel} 鉴权失败，请检查 API Key、令牌权限或账户状态。`;
  }

  if (status === 404) {
    return `${providerLabel} 接口地址不存在，请检查 Base URL 是否填写正确。`;
  }

  if (
    status === 408 ||
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('aborted')
  ) {
    return `${providerLabel} 请求超时，请检查网络后重试。`;
  }

  if (status === 429) {
    return `${providerLabel} 请求过于频繁，或账户额度已用尽，请稍后再试。`;
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    normalized.includes('internal server error')
  ) {
    return `${providerLabel} 服务暂时异常，请稍后重试。`;
  }

  if (
    normalized.includes('fetch failed') ||
    normalized.includes('network') ||
    normalized.includes('econnrefused') ||
    normalized.includes('enotfound') ||
    normalized.includes('socket hang up')
  ) {
    return `${providerLabel} 无法连接到接口地址，请检查 Base URL、网络或代理设置。`;
  }

  return message;
}
