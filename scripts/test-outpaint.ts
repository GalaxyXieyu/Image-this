import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) return;
      
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        
        process.env[key] = value;
        console.log(`加载环境变量: ${key} = ${value.substring(0, 10)}...`);
      }
    });
  }
}

loadEnv();

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2024-06-06';

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

function generateSignature(
  method: string, 
  urlPath: string, 
  query: string, 
  headers: Record<string, string>, 
  body: string, 
  timestamp: string, 
  secretKey: string, 
  accessKey: string
) {
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
    urlPath,
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

async function testOutpaint() {
  const accessKey = process.env.AccessKey || process.env.VOLCENGINE_ACCESS_KEY || process.env.ARK_API_KEY;
  const secretKey = process.env.SecretKey || process.env.VOLCENGINE_SECRET_KEY;

  console.log('环境变量检查:');
  console.log('AccessKey:', accessKey ? `已设置 (${accessKey.substring(0, 10)}...)` : '未设置');
  console.log('SecretKey:', secretKey ? `已设置 (${secretKey.substring(0, 10)}...)` : '未设置');

  if (!accessKey) {
    throw new Error('缺少 AccessKey 环境变量');
  }
  
  if (!secretKey) {
    throw new Error('缺少 SecretKey 环境变量');
  }

  const imagePath = path.join(__dirname, '..', 'reference.jpg');
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');

  console.log('=== 开始测试火山扩图 ===');
  console.log('图片路径:', imagePath);
  console.log('图片大小:', (imageBuffer.length / 1024).toFixed(2), 'KB');

  const requestBody = {
    req_key: 'i2i_outpainting',
    custom_prompt: '扩展图像，保持风格一致',
    binary_data_base64: [imageBase64],
    scale: 7.0,
    seed: -1,
    steps: 30,
    strength: 0.8,
    top: 0.1,
    bottom: 0.1,
    left: 0.1,
    right: 0.1,
    max_height: 1920,
    max_width: 1920
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
  const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, secretKey, accessKey);
  
  headers['Authorization'] = authorization;

  console.log('发送请求到火山引擎...');
  const startTime = Date.now();

  const response = await fetch(`https://${HOST}/?${query}`, {
    method: 'POST',
    headers,
    body: bodyStr
  });

  const result = await response.json();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('请求耗时:', duration, '秒');

  if (!response.ok || result.code !== 10000) {
    console.error('扩图失败:', JSON.stringify(result, null, 2));
    throw new Error(`扩图API调用失败: ${JSON.stringify(result)}`);
  }

  console.log('=== 扩图成功 ===');
  console.log('处理时间:', result.data.time_elapsed);

  if (result.data.binary_data_base64 && result.data.binary_data_base64.length > 0) {
    const outputBase64 = result.data.binary_data_base64[0];
    const outputBuffer = Buffer.from(outputBase64, 'base64');
    const outputPath = path.join(__dirname, '..', `outpaint-result-${Date.now()}.jpg`);
    
    fs.writeFileSync(outputPath, outputBuffer);
    console.log('结果已保存到:', outputPath);
    console.log('输出图片大小:', (outputBuffer.length / 1024).toFixed(2), 'KB');
  } else {
    console.error('未获取到扩图结果');
  }
}

testOutpaint().catch(console.error);
