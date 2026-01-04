/**
 * 视频生成 API 测试脚本
 * 使用方法: npx ts-node scripts/test-video-api.ts
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// 配置 - 需要从数据库或环境变量获取
const CONFIG = {
  accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.VOLCENGINE_SECRET_ACCESS_KEY || '',
  host: 'visual.volcengineapi.com',
  region: 'cn-north-1',
  service: 'cv',
  version: '2022-08-31',
};

// 签名函数
function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSHA256(secretKey, dateStamp);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, 'request');
  return kSigning;
}

function createSignedRequest(action: string, body: object) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const method = 'POST';
  const canonicalUri = '/';
  const canonicalQuerystring = `Action=${action}&Version=${CONFIG.version}`;
  const payloadHash = sha256(JSON.stringify(body));

  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${CONFIG.host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${amzDate}`,
  ].join('\n') + '\n';

  const signedHeaders = 'content-type;host;x-content-sha256;x-date';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const algorithm = 'HMAC-SHA256';
  const credentialScope = `${dateStamp}/${CONFIG.region}/${CONFIG.service}/request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join('\n');

  const signingKey = getSignatureKey(CONFIG.secretAccessKey, dateStamp, CONFIG.region, CONFIG.service);
  const signature = hmacSHA256(signingKey, stringToSign).toString('hex');

  const authorization = `${algorithm} Credential=${CONFIG.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${CONFIG.host}/?${canonicalQuerystring}`,
    headers: {
      'Content-Type': 'application/json',
      'Host': CONFIG.host,
      'X-Date': amzDate,
      'X-Content-Sha256': payloadHash,
      'Authorization': authorization,
    },
    body: JSON.stringify(body),
  };
}

// 提交视频生成任务
async function submitVideoTask(imageBase64: string, prompt: string) {
  console.log('\n📤 提交视频生成任务...');

  const body = {
    req_key: 'jimeng_ti2v_v30_pro',
    prompt,
    binary_data_base64: [imageBase64.replace(/^data:image\/\w+;base64,/, '')],
    frames: 121, // 5秒
    aspect_ratio: '16:9',
    seed: -1,
  };

  const request = createSignedRequest('CVSync2AsyncSubmitTask', body);

  console.log('请求 URL:', request.url);
  console.log('请求体大小:', request.body.length, 'bytes');

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  const result = await response.json();
  console.log('响应状态:', response.status);
  console.log('响应内容:', JSON.stringify(result, null, 2));

  return result;
}

// 查询任务结果
async function queryVideoTask(taskId: string) {
  console.log('\n🔍 查询任务状态...');

  const body = {
    req_key: 'jimeng_ti2v_v30_pro',
    task_id: taskId,
  };

  const request = createSignedRequest('CVSync2AsyncGetResult', body);

  const response = await fetch(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  const result = await response.json();
  console.log('响应状态:', response.status);
  console.log('响应内容:', JSON.stringify(result, null, 2));

  return result;
}

// 主测试函数
async function main() {
  console.log('🎬 视频生成 API 测试');
  console.log('='.repeat(50));

  // 检查配置
  if (!CONFIG.accessKeyId || !CONFIG.secretAccessKey) {
    console.error('❌ 错误: 请设置环境变量 VOLCENGINE_ACCESS_KEY_ID 和 VOLCENGINE_SECRET_ACCESS_KEY');
    console.log('\n使用方法:');
    console.log('VOLCENGINE_ACCESS_KEY_ID=xxx VOLCENGINE_SECRET_ACCESS_KEY=xxx npx ts-node scripts/test-video-api.ts');
    process.exit(1);
  }

  // 使用测试图片 (1x1 红色像素)
  const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  // 或者从文件读取
  const testImagePath = process.argv[2];
  let imageBase64 = testImageBase64;

  if (testImagePath && fs.existsSync(testImagePath)) {
    console.log(`📷 使用图片: ${testImagePath}`);
    const imageBuffer = fs.readFileSync(testImagePath);
    const ext = path.extname(testImagePath).slice(1);
    imageBase64 = `data:image/${ext};base64,${imageBuffer.toString('base64')}`;
  } else {
    console.log('📷 使用测试图片 (1x1 像素)');
  }

  try {
    // 1. 提交任务
    const submitResult = await submitVideoTask(imageBase64, '产品缓慢旋转展示，光线柔和，背景简洁');

    if (submitResult.code !== 10000) {
      console.error('❌ 提交任务失败:', submitResult.message);
      return;
    }

    const taskId = submitResult.data?.task_id;
    if (!taskId) {
      console.error('❌ 未获取到任务ID');
      return;
    }

    console.log('✅ 任务已提交, ID:', taskId);

    // 2. 轮询查询结果
    console.log('\n⏳ 等待视频生成 (最多5分钟)...');
    const maxAttempts = 60;
    const interval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));

      const queryResult = await queryVideoTask(taskId);
      const status = queryResult.data?.status;

      console.log(`[${i + 1}/${maxAttempts}] 状态: ${status}`);

      if (status === 'done') {
        const videoUrl = queryResult.data?.video_url;
        console.log('\n✅ 视频生成完成!');
        console.log('🎥 视频URL:', videoUrl);
        return;
      }

      if (status === 'not_found' || status === 'expired') {
        console.error('❌ 任务失败或已过期');
        return;
      }
    }

    console.error('❌ 任务超时');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

main();
