/**
 * 火山引擎视觉智能服务
 * 提供画质增强和智能扩图功能的直接调用
 */

import * as crypto from 'crypto';
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
 * 火山引擎画质增强 - 直接调用版本
 * @param userId 用户ID
 * @param imageBase64 图片base64 Data URL
 * @param resolutionBoundary 分辨率边界
 * @param enableHdr 是否启用HDR
 * @param enableWb 是否启用白平衡
 * @param resultFormat 结果格式 0=PNG, 1=JPEG
 * @param jpgQuality JPEG质量
 */
export async function enhanceWithVolcengine(
  userId: string,
  imageBase64: string,
  resolutionBoundary = '720p',
  enableHdr = false,
  enableWb = false,
  resultFormat = 1,
  jpgQuality = 95,
  skipDbSave = false, // 是否跳过数据库保存（工作流中间步骤使用）
  volcengineConfig?: { accessKey: string; secretKey: string },
  imagehostingConfig?: { superbedToken: string }
) {
  const startTime = Date.now();
  console.log(`[火山增强] 开始 - 分辨率: ${resolutionBoundary}`);

  // 优先使用传入的配置，否则使用环境变量
  const accessKey = volcengineConfig?.accessKey || process.env.VOLCENGINE_ACCESS_KEY || '';
  const secretKey = volcengineConfig?.secretKey || process.env.VOLCENGINE_SECRET_KEY || '';

  if (!accessKey || !secretKey) {
    throw new Error('VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key');
  }

  console.log(`[火山增强] 使用配置源: ${volcengineConfig ? '用户设置' : '环境变量'}`);
  console.log(`[火山增强] AccessKey: ${accessKey.substring(0, 10)}...`);

  // 如果是工作流中间步骤，不保存到数据库
  const processedImage = skipDbSave ? null : await prisma.processedImage.create({
    data: {
      filename: `enhance-${Date.now()}.jpg`,
      originalUrl: 'temp',
      processType: 'IMAGE_ENHANCEMENT',
      status: 'PROCESSING',
      metadata: JSON.stringify({
        resolutionBoundary,
        enableHdr,
        enableWb,
        resultFormat,
        jpgQuality
      }),
      userId,
      projectId: null
    }
  });

  try {
    // 先保存图片到本地，然后上传到 Superbed 获取公网 URL
    let imageUrl: string;
    
    // 如果传入的是本地路径（如 /uploads/xxx.jpg），需要转换为 base64 再上传
    if (imageBase64.startsWith('/uploads/')) {
      console.log(`[火山增强] 检测到本地路径`);
      // 读取本地文件
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', imageBase64);
      const imageBuffer = await fs.readFile(filePath);
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;
      
      imageUrl = await uploadBase64ToSuperbed(
        dataUrl,
        `enhance-input-${processedImage?.id || Date.now()}.jpg`,
        imagehostingConfig?.superbedToken
      );
    } else {
      // 直接上传 base64 数据
      imageUrl = await uploadBase64ToSuperbed(
        imageBase64,
        `enhance-input-${processedImage?.id || Date.now()}.jpg`,
        imagehostingConfig?.superbedToken
      );
    }
    
    console.log(`[火山增强] 图片上传完成`);
    
    const requestBody = {
      req_key: 'lens_nnsr2_pic_common',
      image_urls: [imageUrl],
      model_quality: 'MQ',
      result_format: resultFormat,
      jpg_quality: jpgQuality,
      return_url: false
    };

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

    console.log(`[火山增强] 发送API请求...`);
    const response = await fetchWithRetry(`https://${HOST}/?${query}`, {
      method: 'POST',
      headers,
      body: bodyStr
    });

    const result = await response.json();
    
    if (!response.ok || result.code !== 10000) {
      throw new Error(`画质增强API失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
    }

    let resultImageData: string;
    if (result.data?.binary_data_base64 && result.data.binary_data_base64.length > 0) {
      const base64Data = result.data.binary_data_base64[0];
      resultImageData = `data:image/jpeg;base64,${base64Data}`;
    } else {
      throw new Error('未获取到增强结果');
    }
    
    // 如果跳过数据库保存，直接返回结果
    if (skipDbSave) {
      const imageSize = Buffer.from(result.data.binary_data_base64[0], 'base64').length;
      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[火山增强] 完成（中间步骤） - 耗时: ${totalDuration}s, 大小: ${(imageSize / 1024).toFixed(0)}KB`);
      
      return {
        id: `temp-${Date.now()}`,
        imageData: resultImageData,
        imageSize
      };
    }
    
    // 上传到本地存储
    const { uploadBase64Image } = await import('@/lib/storage');
    const processedUrl = await uploadBase64Image(
      resultImageData,
      `enhance-${processedImage!.id}.jpg`
    );
    
    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage!.id },
      data: {
        originalUrl: imageUrl,
        processedUrl: processedUrl,
        status: 'COMPLETED',
        fileSize: Buffer.from(result.data.binary_data_base64[0], 'base64').length,
        metadata: JSON.stringify({
          ...(processedImage!.metadata ? JSON.parse(processedImage!.metadata as string) : {}),
          processingCompletedAt: new Date().toISOString(),
          timeElapsed: result.data.time_elapsed || 'N/A'
        })
      }
    });

    const imageSize = Buffer.from(result.data.binary_data_base64[0], 'base64').length;
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[火山增强] 完成 - 耗时: ${totalDuration}s, 大小: ${(imageSize / 1024).toFixed(0)}KB`);

    return {
      id: updatedImage.id,
      imageData: resultImageData,
      imageSize
    };

  } catch (error) {
    console.error(`[火山增强] 失败:`, error instanceof Error ? error.message : error);
    
    if (!skipDbSave && processedImage) {
      await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
        }
      });
    }

    throw error;
  }
}

/**
 * 火山引擎智能扩图 - 直接调用版本
 * @param userId 用户ID
 * @param imageBase64 图片base64 Data URL
 * @param prompt 提示词
 * @param top 向上扩展比例
 * @param bottom 向下扩展比例
 * @param left 向左扩展比例
 * @param right 向右扩展比例
 * @param maxHeight 最大输出高度
 * @param maxWidth 最大输出宽度
 */
export async function outpaintWithVolcengine(
  userId: string,
  imageInput: string, // 支持 base64 或 URL
  prompt = '扩展图像，保持风格一致',
  top = 0.1,
  bottom = 0.1,
  left = 0.1,
  right = 0.1,
  maxHeight = 1920,
  maxWidth = 1920,
  volcengineConfig?: { accessKey: string; secretKey: string },
  imagehostingConfig?: { superbedToken: string }
) {
  const startTime = Date.now();
  console.log(`[火山扩图] 开始 - 比例: 上${top} 下${bottom} 左${left} 右${right}`);

  // 优先使用传入的配置，否则使用环境变量
  const accessKey = volcengineConfig?.accessKey || process.env.VOLCENGINE_ACCESS_KEY || '';
  const secretKey = volcengineConfig?.secretKey || process.env.VOLCENGINE_SECRET_KEY || '';

  if (!accessKey || !secretKey) {
    throw new Error('VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key');
  }

  console.log(`[火山扩图] 使用配置源: ${volcengineConfig ? '用户设置' : '环境变量'}`);
  console.log(`[火山扩图] AccessKey: ${accessKey.substring(0, 10)}...`);

  const processedImage = await prisma.processedImage.create({
    data: {
      filename: `outpaint-${Date.now()}.jpg`,
      originalUrl: '',
      processType: 'IMAGE_OUTPAINTING',
      status: 'PROCESSING',
      metadata: JSON.stringify({
        prompt,
        top,
        bottom,
        left,
        right,
        maxHeight,
        maxWidth
      }),
      userId,
      projectId: null
    }
  });

  try {
    // 判断输入是 URL、本地路径还是 base64
    const isUrl = imageInput.startsWith('http://') || imageInput.startsWith('https://');
    const isBase64 = imageInput.startsWith('data:image/');
    const isLocalPath = imageInput.startsWith('/uploads/');
    
    let requestBody: any;
    
    if (isUrl) {
      // 使用 URL 方式（推荐）
      console.log(`[火山扩图] 使用 URL 输入: ${imageInput.substring(0, 50)}...`);
      requestBody = {
        req_key: 'i2i_outpainting',
        custom_prompt: prompt,
        image_urls: [imageInput],
        scale: 7.0,
        seed: -1,
        steps: 30,
        strength: 0.8,
        top,
        bottom,
        left,
        right,
        max_height: maxHeight,
        max_width: maxWidth
      };
    } else if (isLocalPath) {
      // 本地路径：先上传到 Superbed 获取公网 URL
      console.log(`[火山扩图] 检测到本地路径，上传到图床...`);
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', imageInput);
      const imageBuffer = await fs.readFile(filePath);
      const base64Data = imageBuffer.toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Data}`;
      
      const publicUrl = await uploadBase64ToSuperbed(
        dataUrl,
        `outpaint-input-${processedImage.id}.jpg`,
        imagehostingConfig?.superbedToken
      );
      
      console.log(`[火山扩图] 已上传到图床，使用 URL: ${publicUrl.substring(0, 50)}...`);
      requestBody = {
        req_key: 'i2i_outpainting',
        custom_prompt: prompt,
        image_urls: [publicUrl],
        scale: 7.0,
        seed: -1,
        steps: 30,
        strength: 0.8,
        top,
        bottom,
        left,
        right,
        max_height: maxHeight,
        max_width: maxWidth
      };
    } else if (isBase64) {
      // 使用 base64 方式
      console.log(`[火山扩图] 使用 base64 输入`);
      const cleanBase64 = imageInput.replace(/^data:image\/[a-z]+;base64,/, '');
      requestBody = {
        req_key: 'i2i_outpainting',
        custom_prompt: prompt,
        binary_data_base64: [cleanBase64],
        scale: 7.0,
        seed: -1,
        steps: 30,
        strength: 0.8,
        top,
        bottom,
        left,
        right,
        max_height: maxHeight,
        max_width: maxWidth
      };
    } else {
      throw new Error('不支持的图片输入格式，请提供 URL、本地路径(/uploads/xxx.jpg) 或 base64 数据');
    }

    const bodyStr = JSON.stringify(requestBody);
    const t = new Date();
    const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': HOST,
      'X-Date': timestamp,
      'X-Content-Sha256': crypto.createHash('sha256').update(bodyStr).digest('hex')
    };

    const query = `Action=CVProcess&Version=${VERSION}`;
    const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey, accessKey);
    headers['Authorization'] = authorization;

    const response = await fetchWithRetry(`https://${HOST}/?${query}`, {
      method: 'POST',
      headers,
      body: bodyStr
    });

    const result = await response.json();
    
    if (!response.ok || result.code !== 10000) {
      throw new Error(`扩图API失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
    }

    let resultImageData: string;
    if (result.data?.binary_data_base64 && result.data.binary_data_base64.length > 0) {
      const base64Data = result.data.binary_data_base64[0];
      resultImageData = `data:image/jpeg;base64,${base64Data}`;
    } else {
      throw new Error('未获取到扩图结果');
    }

    const imageSize = Buffer.from(result.data.binary_data_base64[0], 'base64').length;
    
    // 上传到本地存储
    const { uploadBase64Image } = await import('@/lib/storage');
    const processedUrl = await uploadBase64Image(
      resultImageData,
      `outpaint-volcengine-${processedImage.id}.jpg`
    );

    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        originalUrl: isUrl ? imageInput : imageInput.substring(0, 100) + '...',
        processedUrl: processedUrl,
        status: 'COMPLETED',
        fileSize: imageSize,
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          processingCompletedAt: new Date().toISOString(),
          timeElapsed: result.time_elapsed || 'N/A'
        })
      }
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[火山扩图] 完成 - 耗时: ${totalDuration}s, 大小: ${(imageSize / 1024).toFixed(0)}KB`);

    return {
      id: updatedImage.id,
      imageData: resultImageData,
      imageSize: imageSize,
      expandRatio: { top, bottom, left, right }
    };

  } catch (error) {
    console.error(`[火山扩图] 失败:`, error instanceof Error ? error.message : error);
    
    await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown processing error'
      }
    });

    throw error;
  }
}
