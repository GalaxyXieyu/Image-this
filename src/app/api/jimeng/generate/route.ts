import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/storage';
import * as crypto from 'crypto';

// 火山引擎即梦API配置
const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

// 生成火山引擎签名 - 基于成功的测试实现
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
  
  return `HMAC-SHA256 Credential=${process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// 调用即梦生成API - 同步返回
async function callJimengAPI(prompt: string, referenceImage?: string, width = 2048, height = 2048) {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  const secretKey = process.env.VOLCENGINE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎即梦API配置缺失');
  }

  // 构建请求参数
  const requestBody: any = {
    req_key: 'jimeng_t2i_v40',
    prompt,
    width,
    height,
    scale: 0.5,
    force_single: true  // 强制生成单图
  };

  // 如果有参考图片，添加到请求中
  if (referenceImage) {
    requestBody.image_urls = [referenceImage];
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
  const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey);
  
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

// 将Base64数据保存为图片文件
async function saveBase64Image(base64Data: string, filename: string): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = `/tmp/${filename}`;
  require('fs').writeFileSync(filePath, buffer);
  return filePath;
}

export async function POST(request: NextRequest) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { referenceImage, prompt, seed, projectId, width = 2048, height = 2048 } = body;

    // 验证必要参数
    if (!prompt) {
      return NextResponse.json(
        { error: '缺少必要参数：prompt' },
        { status: 400 }
      );
    }

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `jimeng-generate-${Date.now()}.jpg`,
        originalUrl: 'temp',
        processType: 'GENERATE',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          prompt,
          seed: seed || Math.floor(Math.random() * 1000000),
          width,
          height,
          hasReferenceImage: !!referenceImage,
          model: 'jimeng_t2i_v40'
        }),
        userId: session.user.id,
        projectId: projectId || null
      }
    });

    try {
      // 调用即梦API同步生成图片
      const result = await callJimengAPI(prompt, referenceImage, width, height);
      
      // 处理生成的图片
      let generatedImageUrl = '';
      if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
        // 将Base64数据上传到MinIO
        const base64Data = result.binary_data_base64[0];
        generatedImageUrl = await uploadBase64ImageToMinio(
          base64Data,
          `jimeng-generated-${processedImage.id}.jpg`
        );
      }
      
      // 上传参考图片到MinIO（如果有）
      let originalMinioUrl = 'generated';
      if (referenceImage) {
        originalMinioUrl = await uploadBase64ImageToMinio(
          referenceImage,
          `reference-${processedImage.id}.jpg`
        );
      }

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

      // 返回结果
      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          imageUrl: generatedImageUrl,
          originalUrl: originalMinioUrl,
          result
        },
        message: '即梦图像生成成功'
      });

    } catch (processingError) {
      // 更新记录状态为失败
      await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          status: 'FAILED',
          errorMessage: processingError instanceof Error ? processingError.message : 'Unknown processing error'
        }
      });

      throw processingError;
    }

  } catch (error) {
    return NextResponse.json(
      { error: '图像生成失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
