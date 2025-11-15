/**
 * 即梦图像生成服务
 * 提供可直接调用的函数，避免HTTP调用开销
 */

import * as crypto from 'crypto';
import { uploadBase64ImageToMinio } from './storage';
import { uploadBase64ToSuperbed } from './superbed-upload';
import { prisma } from './prisma';

// 火山引擎即梦API配置
const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

// 生成火山引擎签名
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

// 调用即梦生成API
async function callJimengAPI(
  prompt: string, 
  imageUrls?: string[], 
  width = 2048, 
  height = 2048,
  accessKey?: string,
  secretKey?: string
) {
  // 优先使用传入的密钥，否则从环境变量读取（支持多种命名方式）
  const finalAccessKey = accessKey || 
    process.env.AccessKey || 
    process.env.VOLCENGINE_ACCESS_KEY || 
    process.env.ARK_API_KEY;
  const finalSecretKey = secretKey || 
    process.env.SecretKey || 
    process.env.VOLCENGINE_SECRET_KEY;

  console.log(`[即梦API-内部] 环境变量检查:`);
  console.log(`[即梦API-内部] AccessKey: ${finalAccessKey ? `已设置(${finalAccessKey.substring(0, 10)}...)` : '未设置'}`);
  console.log(`[即梦API-内部] SecretKey: ${finalSecretKey ? '已设置' : '未设置'}`);

  if (!finalAccessKey || !finalSecretKey) {
    throw new Error('火山引擎即梦API配置缺失');
  }

  console.log(`[即梦API-内部] 准备请求参数...`);
  console.log(`[即梦API-内部] 分辨率: ${width}x${height}`);
  console.log(`[即梦API-内部] 参考图数量: ${imageUrls?.length || 0}`);

  const requestBody: any = {
    req_key: 'jimeng_t2i_v40',
    req_json: '{}',
    prompt,
    width,
    height,
    scale: 0.5,
    force_single: true
  };

  // image_urls是数组，支持0-10张图
  if (imageUrls && imageUrls.length > 0) {
    requestBody.image_urls = imageUrls;
    console.log(`[即梦API-内部] 参考图URLs:`);
    imageUrls.forEach((url, i) => {
      console.log(`[即梦API-内部]   图${i + 1}: ${url.substring(0, 60)}...`);
    });
  }

  const signStart = Date.now();
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
  
  const signDuration = ((Date.now() - signStart) / 1000).toFixed(3);
  console.log(`[即梦API-内部] 签名生成完成，耗时: ${signDuration}秒`);

  const fetchStart = Date.now();
  console.log(`[即梦API-内部] 发送请求到火山引擎: https://${HOST}/?${query}`);
  
  const response = await fetch(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const fetchDuration = ((Date.now() - fetchStart) / 1000).toFixed(2);
  console.log(`[即梦API-内部] 收到响应，耗时: ${fetchDuration}秒`);
  console.log(`[即梦API-内部] 响应状态: ${response.status}`);

  const parseStart = Date.now();
  const result = await response.json();
  const parseDuration = ((Date.now() - parseStart) / 1000).toFixed(3);
  console.log(`[即梦API-内部] JSON解析完成，耗时: ${parseDuration}秒`);
  
  if (!response.ok || result.code !== 10000) {
    console.error(`[即梦API-内部] API调用失败:`, result);
    throw new Error(`即梦API调用失败: ${JSON.stringify(result)}`);
  }

  console.log(`[即梦API-内部] API调用成功，返回图片数量: ${result.data?.binary_data_base64?.length || 0}`);
  if (result.data?.binary_data_base64?.length > 0) {
    console.log(`[即梦API-内部] 图片Base64长度: ${result.data.binary_data_base64[0].length}`);
  }

  return result.data;
}

/**
 * 即梦图像生成 - 直接调用版本
 * @param userId 用户ID
 * @param prompt 提示词
 * @param referenceImages 参考图片数组（base64 Data URL）
 * @param width 宽度
 * @param height 高度
 */
export async function generateWithJimeng(
  userId: string,
  prompt: string,
  referenceImages?: string | string[],
  width = 2048,
  height = 2048
) {
  const startTime = Date.now();
  console.log(`[即梦服务] 开始处理，用户ID: ${userId}`);

  // 统一处理为数组
  const imageArray = referenceImages 
    ? (Array.isArray(referenceImages) ? referenceImages : [referenceImages])
    : [];

  // 创建数据库记录
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
    // 上传所有参考图片到superbed获取公网URL
    const imageUrls: string[] = [];
    if (imageArray.length > 0) {
      const uploadStart = Date.now();
      console.log(`[即梦服务] 开始上传${imageArray.length}张图片到Superbed...`);
      
      for (let i = 0; i < imageArray.length; i++) {
        const url = await uploadBase64ToSuperbed(
          imageArray[i],
          `reference-${processedImage.id}-${i}.jpg`
        );
        imageUrls.push(url);
        console.log(`[即梦服务] 图片${i + 1}上传完成: ${url.substring(0, 50)}...`);
      }
      
      const uploadDuration = ((Date.now() - uploadStart) / 1000).toFixed(2);
      console.log(`[即梦服务] Superbed上传完成，总耗时: ${uploadDuration}秒`);
    }
    
    // 调用即梦API
    const apiStart = Date.now();
    console.log(`[即梦服务] 开始调用火山引擎即梦API...`);
    console.log(`[即梦服务] 参考图URL数量: ${imageUrls.length}`);
    
    const result = await callJimengAPI(prompt, imageUrls.length > 0 ? imageUrls : undefined, width, height);
    
    const apiDuration = ((Date.now() - apiStart) / 1000).toFixed(2);
    console.log(`[即梦服务] 火山引擎API调用完成，耗时: ${apiDuration}秒`);
    
    // 处理生成的图片
    let generatedImageUrl = '';
    if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
      const saveStart = Date.now();
      console.log(`[即梦服务] 开始保存生成图片到本地...`);
      
      const base64Data = result.binary_data_base64[0];
      generatedImageUrl = await uploadBase64ImageToMinio(
        base64Data,
        `jimeng-generated-${processedImage.id}.jpg`
      );
      
      const saveDuration = ((Date.now() - saveStart) / 1000).toFixed(2);
      console.log(`[即梦服务] 图片保存完成，耗时: ${saveDuration}秒`);
    }
    
    // 保存第一张参考图片到本地（用于数据库记录）
    let originalMinioUrl = 'generated';
    if (imageArray.length > 0) {
      const refSaveStart = Date.now();
      console.log(`[即梦服务] 开始保存参考图到本地...`);
      
      originalMinioUrl = await uploadBase64ImageToMinio(
        imageArray[0],
        `reference-${processedImage.id}.jpg`
      );
      
      const refSaveDuration = ((Date.now() - refSaveStart) / 1000).toFixed(2);
      console.log(`[即梦服务] 参考图保存完成，耗时: ${refSaveDuration}秒`);
    }
    
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[即梦服务] 总耗时: ${totalDuration}秒`);

    // 更新数据库记录
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
    console.error(`[即梦服务] 处理失败:`, error);
    
    // 更新失败状态
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
