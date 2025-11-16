import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import crypto from 'node:crypto';
import axios from 'axios';
import FormData from 'form-data';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';
const SUPERBED_TOKEN = process.env.SUPERBED_TOKEN;
const ACCESS_KEY = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
const SECRET_KEY = process.env.SecretKey || process.env.VOLCENGINE_SECRET_KEY;

function assertEnv(value, name) {
  if (!value) {
    console.error(`[Volcengine Direct Test] 缺少环境变量: ${name}`);
    process.exit(1);
  }
}

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = sign(Buffer.from(secretKey, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  return sign(kService, 'request');
}

function generateSignature(method, pathName, query, headers, body, timestamp, secretKey) {
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n') + '\n';
  const signedHeaders = sortedHeaders.map(key => key.toLowerCase()).join(';');
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalRequest = [method, pathName, query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  const stringToSign = ['HMAC-SHA256', timestamp, credentialScope, hashedCanonicalRequest].join('\n');
  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return {
    authorization: `HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    signedHeaders
  };
}

async function uploadToSuperbed(buffer, filename) {
  assertEnv(SUPERBED_TOKEN, 'SUPERBED_TOKEN');
  console.log('[Volcengine Direct Test] 上传图片到Superbed...');
  const formData = new FormData();
  formData.append('file', buffer, {
    filename,
    contentType: 'image/jpeg'
  });
  const response = await axios.post(`https://api.superbed.cn/upload?token=${SUPERBED_TOKEN}`, formData, {
    headers: formData.getHeaders()
  });
  if (response.data.err !== 0 || !response.data.url) {
    throw new Error(`Superbed上传失败: ${JSON.stringify(response.data)}`);
  }
  console.log('[Volcengine Direct Test] Superbed 上传成功:', response.data.url);
  return response.data.url;
}

async function callVolcengine(imageUrl) {
  assertEnv(ACCESS_KEY, 'AccessKey / VOLCENGINE_ACCESS_KEY');
  assertEnv(SECRET_KEY, 'SecretKey / VOLCENGINE_SECRET_KEY');

  const requestBody = {
    req_key: 'lens_nnsr2_pic_common',
    image_urls: [imageUrl],
    model_quality: 'MQ',
    result_format: 1,
    jpg_quality: 95,
    return_url: false
  };

  const bodyStr = JSON.stringify(requestBody);
  const t = new Date();
  const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
  const headers = {
    'Content-Type': 'application/json',
    'Host': HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': crypto.createHash('sha256').update(bodyStr).digest('hex')
  };
  const query = `Action=CVProcess&Version=${VERSION}`;
  const { authorization } = generateSignature('POST', '/', query, headers, bodyStr, timestamp, SECRET_KEY);
  headers['Authorization'] = authorization;

  console.log('[Volcengine Direct Test] 发送请求到火山引擎...');
  const response = await fetch(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });
  const text = await response.text();
  console.log(`[Volcengine Direct Test] 火山响应状态: ${response.status}`);
  try {
    const json = JSON.parse(text);
    console.log('[Volcengine Direct Test] 火山响应JSON:', JSON.stringify(json, null, 2).substring(0, 500) + '...');
    
    if (json.data?.binary_data_base64 && json.data.binary_data_base64.length > 0) {
      const base64Data = json.data.binary_data_base64[0];
      const buffer = Buffer.from(base64Data, 'base64');
      const outputPath = path.resolve(process.cwd(), `volcengine-result-${Date.now()}.jpg`);
      await writeFile(outputPath, buffer);
      console.log(`[Volcengine Direct Test] 图片已保存到: ${outputPath}`);
      return outputPath;
    }
  } catch (err) {
    console.log('[Volcengine Direct Test] 火山响应文本:', text);
  }
}

async function main() {
  const imagePath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'product.jpg');
  console.log('[Volcengine Direct Test] 使用图片:', imagePath);
  const buffer = await readFile(imagePath);
  const superbedUrl = await uploadToSuperbed(buffer, `volc-test-${Date.now()}.jpg`);
  await callVolcengine(superbedUrl);
}

main().catch(err => {
  console.error('[Volcengine Direct Test] 运行失败:', err);
  process.exit(1);
});
