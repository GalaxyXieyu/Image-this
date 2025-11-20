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

function generateSignature(method: string, path: string, query: string, headers: Record<string, string>, body: string, timestamp: string, secretKey: string) {
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders
    .map(key => `${key.toLowerCase()}:${headers[key]}\n`)
    .join('');
  const signedHeaders = sortedHeaders.map(key => key.toLowerCase()).join(';');

  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalRequest = `${method}\n${path}\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const dateStamp = timestamp.split('T')[0].replace(/\-/g, '');
  const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/request`;
  
  const stringToSign = `HMAC-SHA256\n${timestamp}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
  
  const signingKey = getSignatureKey(secretKey, dateStamp, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  return `HMAC-SHA256 Credential=${process.env.VOLCENGINE_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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

async function callJimengAPI(
  prompt: string, 
  imageUrls?: string[], 
  width = 2048, 
  height = 2048
) {
  const finalAccessKey = process.env.VOLCENGINE_ACCESS_KEY;
  const finalSecretKey = process.env.VOLCENGINE_SECRET_KEY;

  if (!finalAccessKey || !finalSecretKey) {
    throw new Error('火山引擎即梦API配置缺失');
  }

  const requestBody: any = {
    req_key: 'jimeng_t2i_v40',
    req_json: '{}',
    prompt,
    width,
    height,
    scale: 0.5,
    force_single: true
  };

  if (imageUrls && imageUrls.length > 0) {
    requestBody.image_urls = imageUrls;
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
  const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, finalSecretKey);
  
  headers['Authorization'] = authorization;

  const response = await fetchWithRetry(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();
  
  if (!response.ok || result.code !== 10000) {
    throw new Error(`即梦API调用失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
  }

  return result.data;
}

export async function generateWithJimeng(
  userId: string,
  prompt: string,
  referenceImages?: string | string[],
  width = 2048,
  height = 2048
) {
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
    
    // 并行上传参考图片
    const imageUrls: string[] = [];
    if (imageArray.length > 0) {
      const uploadPromises = imageArray.map((img, i) =>
        uploadBase64ToSuperbed(img, `reference-${processedImage.id}-${i}.jpg`)
      );
      const urls = await Promise.all(uploadPromises);
      imageUrls.push(...urls);
      console.log(`[即梦服务] 图片上传完成 - 数量: ${urls.length}`);
    }
    
    const result = await callJimengAPI(prompt, imageUrls.length > 0 ? imageUrls : undefined, width, height);
    
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
