#!/usr/bin/env node

import axios from 'axios';
import crypto from 'crypto';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
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

function generateVolcengineSignature(method, requestPath, query, headers, body, timestamp, secretKey, accessKey) {
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = `${sortedHeaders
    .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n')}\n`;
  const signedHeaders = sortedHeaders.map((key) => key.toLowerCase()).join(';');
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalRequest = [
    method,
    requestPath,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join('\n');
  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function generateVolcengineHeaders(body, accessKey, secretKey) {
  const timestamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const headers = {
    'Content-Type': 'application/json',
    Host: HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash,
  };
  const query = `Action=CVProcess&Version=${VERSION}`;
  headers.Authorization = generateVolcengineSignature(
    'POST',
    '/',
    query,
    headers,
    body,
    timestamp,
    secretKey,
    accessKey
  );
  return headers;
}

async function uploadSmallImageToSuperbed(superbedToken) {
  const testImagePath = path.join(process.cwd(), 'public', 'icon.png');
  if (!fs.existsSync(testImagePath)) {
    throw new Error(`Test image not found: ${testImagePath}`);
  }

  const imageBuffer = await sharp(testImagePath)
    .resize(128, 128, { fit: 'inside' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85 })
    .toBuffer();

  const formData = new FormData();
  const filename = `imaginethis-enhance-test-${Date.now()}.jpg`;
  formData.append('file', imageBuffer, { filename, contentType: 'image/jpeg' });

  const response = await axios.post(`https://api.superbed.cn/upload?token=${superbedToken}`, formData, {
    headers: formData.getHeaders(),
    timeout: 30000,
    maxContentLength: 10 * 1024 * 1024,
    maxBodyLength: 10 * 1024 * 1024,
  });

  const result = response.data;
  if (result.err !== 0 || !result.url) {
    throw new Error(`Superbed upload failed: ${result.msg || 'no url returned'}`);
  }

  return {
    url: result.url,
    inputSize: imageBuffer.length,
  };
}

async function enhanceWithVolcengine(imageUrl, accessKey, secretKey) {
  const requestBody = {
    req_key: 'lens_nnsr2_pic_common',
    image_urls: [imageUrl],
    model_quality: 'MQ',
    result_format: 1,
    jpg_quality: 95,
    return_url: false,
  };
  const body = JSON.stringify(requestBody);
  const headers = generateVolcengineHeaders(body, accessKey, secretKey);
  const apiUrl = `https://${HOST}/?Action=CVProcess&Version=${VERSION}`;
  const response = await axios.post(apiUrl, requestBody, {
    headers,
    timeout: 120000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
  });

  const result = response.data;
  if (result.code !== 10000) {
    throw new Error(`Volcengine enhance failed: code=${result.code}, message=${result.message || 'Unknown'}`);
  }

  const base64 = result.data?.binary_data_base64?.[0];
  if (!base64) {
    throw new Error('Volcengine enhance returned no binary_data_base64');
  }

  return {
    outputSize: Buffer.from(base64, 'base64').length,
  };
}

async function main() {
  const accessKey = requireEnv('VOLCENGINE_ACCESS_KEY');
  const secretKey = requireEnv('VOLCENGINE_SECRET_KEY');
  const superbedToken = requireEnv('SUPERBED_TOKEN');

  console.log('Environment: VOLCENGINE_ACCESS_KEY=SET, VOLCENGINE_SECRET_KEY=SET, SUPERBED_TOKEN=SET');

  console.log('Step 1/2: uploading small test image to Superbed...');
  const uploaded = await uploadSmallImageToSuperbed(superbedToken);
  console.log(`Superbed upload OK: input=${Math.round(uploaded.inputSize / 1024)}KB, urlPrefix=${uploaded.url.slice(0, 36)}...`);

  console.log('Step 2/2: calling Volcengine enhance with public image URL...');
  const enhanced = await enhanceWithVolcengine(uploaded.url, accessKey, secretKey);
  console.log(`Volcengine enhance OK: output=${Math.round(enhanced.outputSize / 1024)}KB`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
