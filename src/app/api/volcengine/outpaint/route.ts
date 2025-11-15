import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBase64ImageToMinio } from '@/lib/storage';
import * as crypto from 'crypto';

// 火山引擎配置
const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2024-06-06';

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

// 调用火山引擎智能扩图API
async function callOutpaintAPI(
  imageBase64: string,
  prompt: string,
  top = 0.1,
  bottom = 0.1,
  left = 0.1,
  right = 0.1,
  maxHeight = 1920,
  maxWidth = 1920
) {
  const accessKey = process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  const secretKey = process.env.VOLCENGINE_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error('火山引擎API配置缺失');
  }

  // 移除data:image前缀
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
  const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash
  };

  const query = `Action=Img2ImgOutpainting&Version=${VERSION}`;
  const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey);
  
  headers['Authorization'] = authorization;

  const response = await fetch(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();
  
  if (!response.ok || result.code !== 10000) {
    throw new Error(`智能扩图API调用失败: ${JSON.stringify(result)}`);
  }

  return result.data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let userId: string;

    // 检查是否是服务端调用
    if (body.userId && body.serverCall) {
      userId = body.userId;
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: '未授权访问' },
          { status: 401 }
        );
      }
      userId = session.user.id;
    }

    const {
      imageUrl,
      prompt = '扩展图像，保持风格一致',
      projectId,
      top = 0.1,
      bottom = 0.1,
      left = 0.1,
      right = 0.1,
      maxHeight = 1920,
      maxWidth = 1920
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少必要参数：imageUrl' },
        { status: 400 }
      );
    }

    // 创建处理记录
    const processedImage = await prisma.processedImage.create({
      data: {
        filename: `outpaint-${Date.now()}.jpg`,
        originalUrl: 'temp',
        processType: 'IMAGE_OUTPAINTING',
        status: 'PROCESSING',
        metadata: JSON.stringify({
          prompt,
          top,
          bottom,
          left,
          right,
          maxHeight,
          maxWidth,
          originalImageSize: imageUrl.length
        }),
        userId: userId,
        projectId: projectId || null
      }
    });

    try {
      // 调用火山引擎智能扩图API
      const result = await callOutpaintAPI(
        imageUrl,
        prompt,
        top,
        bottom,
        left,
        right,
        maxHeight,
        maxWidth
      );

      // 处理返回的图片
      let resultImageData: string;
      if (result.binary_data_base64 && result.binary_data_base64.length > 0) {
        const base64Data = result.binary_data_base64[0];
        resultImageData = `data:image/jpeg;base64,${base64Data}`;
      } else {
        throw new Error('未获取到扩图结果');
      }

      // 上传到MinIO
      const minioUrl = await uploadBase64ImageToMinio(
        resultImageData,
        `outpaint-${processedImage.id}.jpg`
      );

      // 上传原始图片到MinIO
      const originalMinioUrl = await uploadBase64ImageToMinio(
        imageUrl,
        `original-${processedImage.id}.jpg`
      );

      // 更新数据库记录
      const updatedImage = await prisma.processedImage.update({
        where: { id: processedImage.id },
        data: {
          originalUrl: originalMinioUrl,
          processedUrl: minioUrl,
          status: 'COMPLETED',
          fileSize: Buffer.from(result.binary_data_base64[0], 'base64').length,
          metadata: JSON.stringify({
            ...(processedImage.metadata ? JSON.parse(processedImage.metadata as string) : {}),
            processingCompletedAt: new Date().toISOString(),
            timeElapsed: result.time_elapsed || 'N/A'
          })
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedImage.id,
          imageData: resultImageData,
          imageSize: Buffer.from(result.binary_data_base64[0], 'base64').length,
          minioUrl: minioUrl,
          expandRatio: { top, bottom, left, right }
        },
        message: '图像智能扩图成功'
      });

    } catch (processingError) {
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
      { error: '图像智能扩图失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
