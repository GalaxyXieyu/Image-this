/**
 * HTTP 请求封装工具
 * 提供统一的超时、重试、错误处理
 */

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * 带超时和重试的 fetch 封装
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = 120000, // 默认 2 分钟超时
    retries = 2,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      // 如果是最后一次尝试，抛出错误
      if (attempt === retries) {
        throw error;
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      console.log(`[API Client] 重试 ${attempt + 1}/${retries}: ${url}`);
    }
  }

  throw new Error('All retries failed');
}

/**
 * POST JSON 请求
 */
export async function postJson<T = any>(
  url: string,
  data: any,
  headers: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(data),
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * GET JSON 请求
 */
export async function getJson<T = any>(
  url: string,
  headers: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    ...options
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * 下载文件为 Blob
 */
export async function downloadBlob(
  url: string,
  headers: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<Blob> {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers,
    ...options
  });

  if (!response.ok) {
    throw new Error(`下载失败: ${response.statusText}`);
  }

  return response.blob();
}
