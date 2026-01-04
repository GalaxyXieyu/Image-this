/**
 * 即梦视频生成服务 (jimeng_ti2v_v30_pro)
 * 支持图生视频功能
 */

import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// 从共享文件导出模板
export { VIDEO_STYLE_TEMPLATES } from '@/lib/video-style-templates';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

export interface SubmitVideoTaskParams {
  imageBase64?: string;
  imageUrl?: string;
  prompt: string;
  frames?: number;      // 121(5s) | 241(10s)
  aspectRatio?: string; // "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9"
  seed?: number;
}

export interface VideoTaskResult {
  taskId: string;
}

export interface VideoQueryResult {
  status: 'in_queue' | 'generating' | 'done' | 'not_found' | 'expired';
  videoUrl?: string;
  error?: string;
}

// 签名相关函数
function sign(key: Buffer, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = sign(Buffer.from(secretKey, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  return sign(kService, 'request');
}

function generateSignature(
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
    .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
    .join('');
  const signedHeaders = sortedHeaders.map(key => key.toLowerCase()).join(';');

  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalRequest = `${method}\n${path}\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const dateStamp = timestamp.split('T')[0].replace(/-/g, '');
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;

  const stringToSign = `HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const signingKey = getSignatureKey(secretKey, dateStamp, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// 带超时和重试的fetch
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  timeout = 60000
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('All retries failed');
}

// 获取用户的火山引擎配置
async function getVolcengineConfig(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { volcengineAccessKey: true, volcengineSecretKey: true }
  });

  const accessKey = user?.volcengineAccessKey || process.env.VOLCENGINE_ACCESS_KEY;
  const secretKey = user?.volcengineSecretKey || process.env.VOLCENGINE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API配置缺失，请在设置中配置AccessKey和SecretKey');
  }

  return { accessKey, secretKey };
}

/**
 * 提交视频生成任务
 */
export async function submitVideoTask(
  userId: string,
  params: SubmitVideoTaskParams
): Promise<VideoTaskResult> {
  const { accessKey, secretKey } = await getVolcengineConfig(userId);

  const requestBody: Record<string, unknown> = {
    req_key: 'jimeng_ti2v_v30_pro',
    prompt: params.prompt,
    frames: params.frames || 121,
    aspect_ratio: params.aspectRatio || '16:9',
    seed: params.seed ?? -1,
  };

  // 图生视频：传入首帧图片
  if (params.imageBase64) {
    requestBody.binary_data_base64 = [params.imageBase64.replace(/^data:image\/\w+;base64,/, '')];
  } else if (params.imageUrl) {
    requestBody.image_urls = [params.imageUrl];
  }

  const bodyStr = JSON.stringify(requestBody);
  const t = new Date();
  const timestamp = t.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash
  };

  const query = `Action=CVSync2AsyncSubmitTask&Version=${VERSION}`;
  headers['Authorization'] = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey, accessKey);

  console.log('[视频生成] 提交任务...', { prompt: params.prompt, frames: params.frames });

  const response = await fetchWithRetry(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();

  if (!response.ok || result.code !== 10000) {
    console.error('[视频生成] 提交失败:', result);
    throw new Error(`视频生成任务提交失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
  }

  console.log('[视频生成] 任务已提交:', result.data?.task_id);
  return { taskId: result.data.task_id };
}

/**
 * 查询视频生成结果
 */
export async function queryVideoTask(
  userId: string,
  taskId: string
): Promise<VideoQueryResult> {
  const { accessKey, secretKey } = await getVolcengineConfig(userId);

  const requestBody = {
    req_key: 'jimeng_ti2v_v30_pro',
    task_id: taskId,
  };

  const bodyStr = JSON.stringify(requestBody);
  const t = new Date();
  const timestamp = t.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash
  };

  const query = `Action=CVSync2AsyncGetResult&Version=${VERSION}`;
  headers['Authorization'] = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey, accessKey);

  const response = await fetchWithRetry(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();

  if (!response.ok) {
    return { status: 'not_found', error: result.message || 'Request failed' };
  }

  // 检查任务状态
  const status = result.data?.status;
  if (status === 'done' && result.code === 10000) {
    return {
      status: 'done',
      videoUrl: result.data.video_url
    };
  }

  if (status === 'not_found' || status === 'expired') {
    return { status, error: result.message };
  }

  if (result.code !== 10000) {
    return { status: 'not_found', error: result.message || `Error code: ${result.code}` };
  }

  // in_queue 或 generating
  return { status: status || 'in_queue' };
}

/**
 * 下载视频并保存到本地
 */
export async function downloadAndSaveVideo(
  videoUrl: string,
  userId: string,
  filename?: string
): Promise<string> {
  const { uploadBase64Image } = await import('@/lib/storage');

  // 下载视频
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error('视频下载失败');
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const videoBase64 = `data:video/mp4;base64,${base64}`;

  // 保存到本地
  const finalFilename = filename || `video-${Date.now()}.mp4`;
  const localUrl = await uploadBase64Image(videoBase64, finalFilename, userId);

  console.log('[视频生成] 视频已保存:', localUrl);
  return localUrl;
}
