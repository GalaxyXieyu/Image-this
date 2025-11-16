/**
 * 火山引擎视觉智能服务
 * 提供画质增强和智能扩图功能的直接调用
 */

import * as crypto from 'crypto';
import { uploadBase64ToSuperbed } from './superbed-upload';
import { prisma } from './prisma';

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
  
  const accessKey = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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
  jpgQuality = 95
) {
  const startTime = Date.now();
  console.log(`[火山画质增强服务] 开始处理，用户ID: ${userId}`);
  console.log(`[火山画质增强服务] 分辨率边界: ${resolutionBoundary}`);

  const accessKey = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  const secretKey = process.env.SecretKey || process.env.VOLCENGINE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API配置缺失');
  }

  const processedImage = await prisma.processedImage.create({
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
    console.log(`[火山画质增强服务] 步骤1: 上传图片到Superbed...`);
    const uploadStartTime = Date.now();
    const imageUrl = await uploadBase64ToSuperbed(
      imageBase64,
      `enhance-input-${processedImage.id}.jpg`
    );
    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
    console.log(`[火山画质增强服务] 图片上传完成: ${imageUrl}, 耗时: ${uploadDuration}秒`);

    console.log(`[火山画质增强服务] 步骤2: 准备请求数据...`);
    const requestBody = {
      req_key: 'lens_nnsr2_pic_common',
      image_urls: [imageUrl],
      model_quality: 'MQ',
      result_format: resultFormat,
      jpg_quality: jpgQuality,
      return_url: false
    };

    const bodyStr = JSON.stringify(requestBody);
    console.log(`[火山画质增强服务] 步骤3: 生成签名...`);
    const t = new Date();
    const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
    const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    console.log(`[火山画质增强服务] 时间戳: ${timestamp}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': HOST,
      'X-Date': timestamp,
      'X-Content-Sha256': payloadHash
    };

    const query = `Action=CVProcess&Version=${VERSION}`;
    console.log(`[火山画质增强服务] 步骤4: 生成Authorization...`);
    const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey);
    
    headers['Authorization'] = authorization;

    console.log(`[火山画质增强服务] 步骤5: 发送请求到火山引擎 (${HOST})...`);
    const requestStartTime = Date.now();
    const response = await fetch(`https://${HOST}/?${query}`, {
      method: 'POST',
      headers,
      body: bodyStr
    });

    const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
    console.log(`[火山画质增强服务] 步骤6: 收到响应，耗时: ${requestDuration}秒, 状态码: ${response.status}`);

    console.log(`[火山画质增强服务] 步骤7: 解析响应JSON...`);
    const result = await response.json();
    console.log(`[火山画质增强服务] 响应代码: ${result.code}, 消息: ${result.message || 'N/A'}`);
    
    if (!response.ok || result.code !== 10000) {
      throw new Error(`画质增强API调用失败: ${JSON.stringify(result)}`);
    }

    console.log(`[火山画质增强服务] 步骤8: API调用成功，处理结果数据...`);

    let resultImageData: string;
    if (result.data?.binary_data_base64 && result.data.binary_data_base64.length > 0) {
      console.log(`[火山画质增强服务] 获取到${result.data.binary_data_base64.length}个结果图像`);
      const base64Data = result.data.binary_data_base64[0];
      console.log(`[火山画质增强服务] 结果图像Base64长度: ${base64Data.length}`);
      resultImageData = `data:image/jpeg;base64,${base64Data}`;
    } else {
      throw new Error('未获取到增强结果');
    }

    console.log(`[火山画质增强服务] 步骤9: 更新数据库记录...`);
    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        originalUrl: '',
        processedUrl: '',
        status: 'COMPLETED',
        fileSize: Buffer.from(result.data.binary_data_base64[0], 'base64').length,
        metadata: JSON.stringify({
          ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
          processingCompletedAt: new Date().toISOString(),
          timeElapsed: result.data.time_elapsed || 'N/A'
        })
      }
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[火山画质增强服务] 处理完成，总耗时: ${totalDuration}秒`);

    return {
      id: updatedImage.id,
      imageData: resultImageData,
      imageSize: Buffer.from(result.data.binary_data_base64[0], 'base64').length
    };

  } catch (error) {
    console.error(`[火山画质增强服务] 处理失败:`, error);
    
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
  imageBase64: string,
  prompt = '扩展图像，保持风格一致',
  top = 0.1,
  bottom = 0.1,
  left = 0.1,
  right = 0.1,
  maxHeight = 1920,
  maxWidth = 1920
) {
  const startTime = Date.now();
  console.log(`[火山扩图服务] 开始处理，用户ID: ${userId}`);
  console.log(`[火山扩图服务] 扩展比例 - 上:${top} 下:${bottom} 左:${left} 右:${right}`);

  const accessKey = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  const secretKey = process.env.SecretKey || process.env.VOLCENGINE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API配置缺失');
  }

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
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
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
    const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey);
    headers['Authorization'] = authorization;

    console.log(`[火山扩图服务] 发送请求到火山引擎...`);
    const requestStartTime = Date.now();
    const response = await fetch(`https://${HOST}/?${query}`, {
      method: 'POST',
      headers,
      body: bodyStr
    });

    const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
    console.log(`[火山扩图服务] 收到响应，耗时: ${requestDuration}秒, 状态码: ${response.status}`);

    const result = await response.json();
    
    if (!response.ok || result.code !== 10000) {
      throw new Error(`智能扩图API调用失败: ${JSON.stringify(result)}`);
    }

    console.log(`[火山扩图服务] API调用成功`);

    let resultImageData: string;
    if (result.data?.binary_data_base64 && result.data.binary_data_base64.length > 0) {
      const base64Data = result.data.binary_data_base64[0];
      resultImageData = `data:image/jpeg;base64,${base64Data}`;
    } else {
      throw new Error('未获取到扩图结果');
    }

    const imageSize = Buffer.from(result.data.binary_data_base64[0], 'base64').length;

    const updatedImage = await prisma.processedImage.update({
      where: { id: processedImage.id },
      data: {
        originalUrl: '',
        processedUrl: '',
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
    console.log(`[火山扩图服务] 处理完成，总耗时: ${totalDuration}秒`);

    return {
      id: updatedImage.id,
      imageData: resultImageData,
      imageSize: imageSize,
      expandRatio: { top, bottom, left, right }
    };

  } catch (error) {
    console.error(`[火山扩图服务] 处理失败:`, error);
    
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
