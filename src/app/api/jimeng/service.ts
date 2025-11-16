/**
 * 即梦图像生成服务
 */

import * as crypto from 'crypto';
import { uploadBase64ImageToMinio } from '@/lib/storage';
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
  
  const accessKey = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function callJimengAPI(
  prompt: string, 
  imageUrls?: string[], 
  width = 2048, 
  height = 2048,
  accessKey?: string,
  secretKey?: string
) {
  const finalAccessKey = accessKey || 
    process.env.AccessKey || 
    process.env.VOLCENGINE_ACCESS_KEY || 
    process.env.ARK_API_KEY;
  const finalSecretKey = secretKey || 
    process.env.SecretKey || 
    process.env.VOLCENGINE_SECRET_KEY;

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

  const response = await fetch(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();
  
  if (!response.ok || result.code !== 10000) {
    throw new Error(`即梦API调用失败: ${JSON.stringify(result)}`);
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
    const imageUrls: string[] = [];
    if (imageArray.length > 0) {
      for (let i = 0; i < imageArray.length; i++) {
        const url = await uploadBase64ToSuperbed(
          imageArray[i],
          `reference-${processedImage.id}-${i}.jpg`
        );
        imageUrls.push(url);
      }
    }
    
    const result = await callJimengAPI(prompt, imageUrls.length > 0 ? imageUrls : undefined, width, height);
    
    let generatedImageUrl = '';
    if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
      const base64Data = result.binary_data_base64[0];
      generatedImageUrl = await uploadBase64ImageToMinio(
        base64Data,
        `jimeng-generated-${processedImage.id}.jpg`
      );
    }
    
    let originalMinioUrl = 'generated';
    if (imageArray.length > 0) {
      originalMinioUrl = await uploadBase64ImageToMinio(
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

    return {
      id: updatedImage.id,
      imageData: generatedImageUrl,
      prompt
    };

  } catch (error) {
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          error: error instanceof Error ? error.message : 'Unknown error',
          failedAt: new Date().toISOString()
        })
      }
    });

    throw error;
  }
}
