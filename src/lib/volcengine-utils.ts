/**
 * 火山引擎API通用工具函数
 * 提供签名、HTTP请求等共享功能
 */

import * as crypto from 'crypto';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

/**
 * HMAC-SHA256 签名
 */
function sign(key: Buffer, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

/**
 * 生成签名密钥
 */
function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Buffer {
  const kDate = sign(Buffer.from(secretKey, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  const kSigning = sign(kService, 'request');
  return kSigning;
}

/**
 * 生成火山引擎API签名
 */
export function generateSignature(
  method: string,
  path: string,
  query: string,
  headers: Record<string, string>,
  body: string,
  timestamp: string,
  secretKey: string,
  accessKey: string
): string {
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n') + '\n';

  const signedHeaders = sortedHeaders
    .map(key => key.toLowerCase())
    .join(';');

  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const hashedCanonicalRequest = crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex');

  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;

  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * 带超时和重试的fetch请求
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeout = 120000
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('All retries failed');
}

/**
 * 生成火山引擎API请求头
 */
export function generateVolcengineHeaders(
  bodyStr: string,
  timestamp: string,
  secretKey: string,
  accessKey: string
): Record<string, string> {
  const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash
  };

  const query = `Action=CVProcess&Version=${VERSION}`;
  const authorization = generateSignature(
    'POST',
    '/',
    query,
    headers,
    bodyStr,
    timestamp,
    secretKey,
    accessKey
  );

  headers['Authorization'] = authorization;

  return headers;
}

/**
 * 生成ISO时间戳（火山引擎格式）
 */
export function generateTimestamp(): string {
  const t = new Date();
  return t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
}

/**
 * 获取火山引擎API URL
 */
export function getVolcengineApiUrl(): string {
  const query = `Action=CVProcess&Version=${VERSION}`;
  return `https://${HOST}/?${query}`;
}
