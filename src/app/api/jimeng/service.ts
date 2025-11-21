/**
 * 即梦图像生成服务
 */

import * as crypto from 'crypto';
import { uploadBase64Image } from '@/lib/storage';
import { uploadBase64ToSuperbed } from '@/lib/superbed-upload';
import { prisma } from '@/lib/prisma';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

function sign(key: Buffer, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(secretKey: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = sign(Buffer.from(secretKey, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  const kSigning = sign(kService, 'request');
  return kSigning;
}

function generateSignature(method: string, path: string, query: string, headers: Record<string, string>, body: string, timestamp: string, secretKey: string, accessKey: string) {
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

  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  
  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  
  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
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
      console.log(`[fetchWithRetry] 尝试 ${i + 1}/${retries + 1}, 超时: ${timeout}ms`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`[fetchWithRetry] 请求超时 (${timeout}ms)，中止请求`);
        controller.abort();
      }, timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log(`[fetchWithRetry] 请求成功: ${response.status}`);
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error(`[fetchWithRetry] 请求失败 (尝试 ${i + 1}/${retries + 1}):`, {
        message: err.message,
        name: err.name,
        cause: (err as any).cause
      });
      
      if (i === retries) {
        console.error(`[fetchWithRetry] 所有重试失败，抛出错误`);
        throw error;
      }
      
      const delay = 1000 * (i + 1);
      console.log(`[fetchWithRetry] 等待 ${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries failed');
}

async function callJimengAPI(
  prompt: string, 
  accessKey: string,
  secretKey: string,
  imageUrls?: string[], 
  width = 2048, 
  height = 2048,
  maxRetries = 3
) {
  if (!accessKey || !secretKey) {
    throw new Error('VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key');
  }

  console.log(`[即梦API] 使用配置 - AccessKey: ${accessKey.substring(0, 10)}...`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000); // 指数退避，最多10秒
        console.log(`[即梦API] 第 ${attempt + 1} 次尝试，等待 ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const requestBody = {
        req_key: `jimeng_${Date.now()}_${attempt}`,
        prompt,
        model_version: 'jimeng_t2i_v40',
        use_sr: false,
        return_url: true,
        logo_info: { add_logo: false },
        ...(imageUrls && imageUrls.length > 0 ? { image_urls: imageUrls } : {}),
        width,
        height
      }

      const bodyStr = JSON.stringify(requestBody);
      const t = new Date();
      const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
      const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Host': HOST,
        'X-Date': timestamp,
        'X-Content-Sha256': payloadHash
      };

      const query = `Action=CVProcess&Version=${VERSION}`;
      const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey, accessKey);
      
      headers['Authorization'] = authorization;

      const apiUrl = `https://${HOST}/?${query}`;
      
      // 详细的调试日志
      console.log(`\n========== 即梦API调用详情 (尝试 ${attempt + 1}/${maxRetries + 1}) ==========`);
      console.log(`[即梦API] 请求URL: ${apiUrl}`);
      console.log(`[即梦API] AccessKey: ${accessKey}`);
      console.log(`[即梦API] SecretKey: ${secretKey.substring(0, 10)}...${secretKey.substring(secretKey.length - 4)}`);
      console.log(`[即梦API] 时间戳: ${timestamp}`);
      console.log(`[即梦API] 请求头:`, JSON.stringify(headers, null, 2));
      console.log(`[即梦API] 请求体:`, JSON.stringify(requestBody, null, 2));
      console.log(`[即梦API] 请求参数摘要:`, {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        imageCount: imageUrls?.length || 0,
        width,
        height,
        model: 'jimeng_t2i_v40'
      });
      console.log(`========================================\n`);

      const response = await fetchWithRetry(apiUrl, {
        method: 'POST',
        headers,
        body: bodyStr
      }, 1, 60000); // 内部重试1次，60秒超时

      console.log(`[即梦API] HTTP状态码: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`[即梦API] 原始响应:`, responseText.substring(0, 500));
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[即梦API] JSON解析失败:`, parseError);
        throw new Error(`API响应解析失败: ${responseText.substring(0, 200)}`);
      }
      
      if (!response.ok || result.code !== 10000) {
        console.error(`[即梦API] API返回错误:`, {
          httpStatus: response.status,
          code: result.code,
          message: result.message,
          fullResponse: result
        });
        
        // 检查是否是并发限制错误
        if (result.code === 50430) {
          throw new Error(`CONCURRENT_LIMIT:${result.message || 'API并发限制'}`);
        }
        throw new Error(`即梦API调用失败: HTTP=${response.status}, code=${result.code}, msg=${result.message || 'Unknown'}`);
      }

      console.log(`[即梦API] 调用成功`);
      return result.data;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // 记录详细错误信息
      console.error(`[即梦API] 捕获异常 (尝试 ${attempt + 1}/${maxRetries + 1}):`, {
        message: lastError.message,
        stack: lastError.stack,
        name: lastError.name,
        cause: (lastError as any).cause
      });
      
      // 判断是否是可重试的错误
      const errorMessage = lastError.message;
      const isRetryable = 
        errorMessage.includes('CONCURRENT_LIMIT') || // 并发限制
        errorMessage.includes('timeout') ||          // 超时
        errorMessage.includes('ECONNRESET') ||       // 连接重置
        errorMessage.includes('ETIMEDOUT') ||        // 连接超时
        errorMessage.includes('503') ||              // 服务不可用
        errorMessage.includes('504');                // 网关超时
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[即梦API] 最终失败 (尝试 ${attempt + 1}/${maxRetries + 1}):`, {
          message: lastError.message,
          isRetryable,
          totalAttempts: attempt + 1
        });
        break;
      }
      
      console.warn(`[即梦API] 调用失败 (尝试 ${attempt + 1}/${maxRetries + 1})，准备重试...`, {
        reason: lastError.message,
        isRetryable
      });
    }
  }

  const finalError = lastError || new Error('即梦API调用失败');
  console.error(`[即梦API] 所有重试均失败，抛出最终错误:`, {
    message: finalError.message,
    stack: finalError.stack
  });
  throw finalError;
}

export async function generateWithJimeng(
  userId: string,
  prompt: string,
  referenceImages?: string | string[],
  width = 2048,
  height = 2048,
  volcengineConfig?: { accessKey: string; secretKey: string },
  imagehostingConfig?: { superbedToken: string }
) {
  // 优先使用传入的配置，否则使用环境变量
  const accessKey = volcengineConfig?.accessKey || process.env.VOLCENGINE_ACCESS_KEY || '';
  const secretKey = volcengineConfig?.secretKey || process.env.VOLCENGINE_SECRET_KEY || '';

  if (!accessKey || !secretKey) {
    throw new Error('VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key');
  }

  console.log(`[即梦服务] 使用配置源: ${volcengineConfig ? '用户设置' : '环境变量'}`);
  const imageArray = referenceImages 
    ? (Array.isArray(referenceImages) ? referenceImages : [referenceImages])
    : [];

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: `jimeng-${Date.now()}.jpg`,
      originalUrl: 'processing',
      processType: 'JIMENG_GENERATE',
      status: 'PROCESSING',
      metadata: JSON.stringify({
        prompt,
        width,
        height,
        imageCount: imageArray.length,
        model: 'jimeng_t2i_v40'
      }),
      userId,
      projectId: null
    }
  });

  try {
    const startTime = Date.now();
    console.log(`[即梦服务] 开始处理 - 图片数: ${imageArray.length}`);
    
    // 串行上传参考图片（避免并发导致的连接问题）
    const imageUrls: string[] = [];
    if (imageArray.length > 0) {
      console.log(`[即梦服务] 开始上传 ${imageArray.length} 张参考图片...`);
      for (let i = 0; i < imageArray.length; i++) {
        try {
          const url = await uploadBase64ToSuperbed(
            imageArray[i], 
            `reference-${processedImage.id}-${i}.jpg`,
            imagehostingConfig?.superbedToken
          );
          imageUrls.push(url);
          console.log(`[即梦服务] 图片 ${i + 1}/${imageArray.length} 上传成功`);
        } catch (error) {
          console.error(`[即梦服务] 图片 ${i + 1} 上传失败:`, error);
          throw error; // 任何一张失败都抛出错误
        }
      }
      console.log(`[即梦服务] 所有图片上传完成 - 数量: ${imageUrls.length}`);
    }
    
    const result = await callJimengAPI(prompt, accessKey, secretKey, imageUrls.length > 0 ? imageUrls : undefined, width, height);
    
    let generatedImageUrl = '';
    if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
      const base64Data = result.binary_data_base64[0];
      generatedImageUrl = await uploadBase64Image(
        base64Data,
        `jimeng-generated-${processedImage.id}.jpg`
      );
    }
    
    let originalMinioUrl = 'generated';
    if (imageArray.length > 0) {
      originalMinioUrl = await uploadBase64Image(
        imageArray[0],
        `reference-${processedImage.id}.jpg`
      );
    }

    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        originalUrl: originalMinioUrl,
        processedUrl: generatedImageUrl,
        status: 'COMPLETED',
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          jimengResponse: result,
          processingCompletedAt: new Date().toISOString()
        })
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[即梦服务] 处理完成 - 耗时: ${duration}s`);
    
    return {
      id: updatedImage.id,
      imageData: generatedImageUrl,
      prompt
    };

  } catch (error) {
    console.error(`[即梦服务] 处理失败:`, error instanceof Error ? error.message : error);
    
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          failedAt: new Date().toISOString()
        })
      }
    });

    throw error;
  }
}
