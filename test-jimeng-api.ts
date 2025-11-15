import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

// 火山引擎即梦API配置 - 使用视觉API
const ACCESS_KEY = 'AKLTYWNiZjUzOTNjYWYwNGFlNjk1Yjk1NmRkMzEyNGZhOTg';
const SECRET_KEY = 'TlRabU9UWmpZalJoTWpnd05HRTJZMkU1TURnNU1qUmlOREkxT0RaaE1UZw==';
const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

// 上传图片到SM.MS图床并返回URL (使用匿名上传)
async function uploadImageToSMMS(imageBuffer: Buffer, filename: string): Promise<string> {
  try {
    // 创建FormData
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('smfile', imageBuffer, {
      filename: filename,
      contentType: 'image/jpeg'
    });
    
    // 上传到SM.MS (匿名上传，无需API Key)
    const response = await fetch('https://sm.ms/api/v2/upload', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SM.MS上传失败 (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data?.url) {
      // 如果图片已存在，SM.MS会返回已有的URL
      if (result.code === 'image_repeated' && result.images) {
        console.log(`✓ 图片已存在于SM.MS: ${result.images}`);
        return result.images;
      }
      throw new Error(`SM.MS上传失败：${result.message || '未获取到图片链接'}`);
    }

    console.log(`✓ 图片已上传到SM.MS: ${result.data.url}`);
    return result.data.url;
    
  } catch (error) {
    console.error('SM.MS上传错误:', error);
    throw error;
  }
}

// 生成火山引擎签名 - 基于Python示例
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
  // 按字母顺序排序headers
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
  
  const date = timestamp.substring(0, 8); // YYYYMMDD格式
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  
  const stringToSign = [
    'HMAC-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  
  return `HMAC-SHA256 Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// 测试即梦文生图API
async function testJimengTextToImage() {
  try {
    console.log('===开始测试火山引擎即梦API===');
    
    if (!ACCESS_KEY) {
      console.error('错误: 请设置 ARK_API_KEY 环境变量');
      return;
    }
    
    if (!SECRET_KEY) {
      console.error('错误: 请设置 VOLCENGINE_SECRET_KEY 环境变量');
      return;
    }
    
    // 读取两个参考图片
    const referenceImagePath = '/data/xieyu/ai-images-generated/reference.jpg';
    const productImagePath = '/data/xieyu/ai-images-generated/product.jpg';
    
    const referenceImageBuffer = fs.readFileSync(referenceImagePath);
    const productImageBuffer = fs.readFileSync(productImagePath);
    
    console.log('场景图片(reference.jpg)已读取，大小:', referenceImageBuffer.length, 'bytes');
    console.log('产品图片(product.jpg)已读取，大小:', productImageBuffer.length, 'bytes');
    
    // 使用视觉API调用即梦
    console.log('\n使用视觉API调用即梦jimeng_t2i_v40模型...');
    
    // 上传图片到SM.MS并获取URL
    console.log('\n上传参考图片到SM.MS图床...');
    const referenceImageUrl = await uploadImageToSMMS(referenceImageBuffer, 'reference.jpg');
    const productImageUrl = await uploadImageToSMMS(productImageBuffer, 'product.jpg');
    
    console.log('场景图片URL:', referenceImageUrl);
    console.log('产品图片URL:', productImageUrl);

    // 使用URL方式调用即梦API
    const requestBody = {
      req_key: 'jimeng_t2i_v40',
      req_json: '{}',
      prompt: '将产品图片放置到场景图片中，保持自然的光照和透视效果，专业摄影，高质量，4K分辨率',
      width: 2048,
      height: 2048,
      scale: 0.5,
      force_single: true,
      image_urls: [
        referenceImageUrl,
        productImageUrl
      ]
    };

    const bodyStr = JSON.stringify(requestBody);
    const t = new Date();
    const timestamp = t.toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
    console.log('生成的时间戳:', timestamp);
    const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': HOST,
      'X-Date': timestamp,
      'X-Content-Sha256': payloadHash
    };

    const query = `Action=CVProcess&Version=${VERSION}`;
    const authorization = generateSignature('POST', '/', query, headers, bodyStr, timestamp, SECRET_KEY);
    
    headers['Authorization'] = authorization;

    console.log('请求参数:', JSON.stringify({
      ...requestBody,
      image_urls: [`图片1: ${requestBody.image_urls[0].substring(0, 50)}...`, `图片2: ${requestBody.image_urls[1].substring(0, 50)}...`]
    }, null, 2));
    console.log('请求URL:', `https://${HOST}/?${query}`);
    
    const response = await fetch(`https://${HOST}/?${query}`, {
      method: 'POST',
      headers,
      body: bodyStr
    });

    const result = await response.json();
    
    if (response.ok && result.code === 10000) {
      console.log('===API调用成功===');
      
      // 检查是否有图片URL
      if (result.data && result.data.image_urls) {
        console.log('===生成的图片URL===');
        result.data.image_urls.forEach((url: string, index: number) => {
          console.log(`图片${index + 1}: ${url}`);
        });
      }
      
      // 检查是否有base64图片数据并保存到本地
      if (result.data && result.data.binary_data_base64) {
        console.log('===生成的图片Base64数据===');
        console.log(`图片数量: ${result.data.binary_data_base64.length}`);
        
        if (result.data.binary_data_base64.length > 0) {
          const base64Data = result.data.binary_data_base64[0];
          console.log(`第一张图片Base64长度: ${base64Data.length}`);
          
          // 保存到本地文件
          const filename = `jimeng-generated-${Date.now()}.jpg`;
          const filepath = `/data/xieyu/ai-images-generated/${filename}`;
          
          // 去掉可能的data:image/jpeg;base64,前缀
          const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
          
          fs.writeFileSync(filepath, Buffer.from(cleanBase64, 'base64'));
          
          console.log(`===图片已保存到本地===`);
          console.log(`文件路径: ${filepath}`);
          console.log(`文件名: ${filename}`);
          
          // 检查文件大小
          const stats = fs.statSync(filepath);
          console.log(`文件大小: ${stats.size} bytes`);
        }
      }
      
      console.log('响应状态:', result.message);
      console.log('处理时间:', result.time_elapsed);
      
    } else {
      console.error('===API调用失败===');
      console.error('状态码:', response.status);
      console.error('错误代码:', result.code);
      console.error('错误信息:', result.message);
      console.error('完整响应:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('===测试失败===');
    console.error('错误:', error);
  }
}

// 运行测试
testJimengTextToImage();
