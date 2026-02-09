/**
 * 即梦图床上传工具
 * 使用火山引擎的图片上传服务
 */

import { generateVolcengineSignature } from './image-processor/utils/volcengine-signature';
import axios from 'axios';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';

interface JimengUploadConfig {
  accessKey: string;
  secretKey: string;
}

/**
 * 上传 base64 图片到即梦图床
 * @param base64Data Base64 图片数据（可包含 data: 前缀）
 * @param config 火山引擎配置
 * @returns 图片 URL
 */
export async function uploadToJimengImageHost(
  base64Data: string,
  config: JimengUploadConfig
): Promise<string> {
  try {
    // 移除 data:image/xxx;base64, 前缀
    const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log(`[Jimeng Upload] 准备上传图片，大小: ${(base64String.length * 0.75 / 1024).toFixed(0)}KB`);

    const requestBody = {
      req_key: 'lens_upload',
      image_base64: base64String
    };

    const bodyStr = JSON.stringify(requestBody);
    const query = `Action=CVProcess&Version=${VERSION}`;

    // 生成签名和请求头
    const t = new Date();
    const timestamp = t.toISOString().replace(/[-:]|\\.\\d{3}/g, '').replace('Z', '') + 'Z';
    const payloadHash = require('crypto').createHash('sha256').update(bodyStr).digest('hex');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Host': HOST,
      'X-Date': timestamp,
      'X-Content-Sha256': payloadHash
    };

    const authorization = generateVolcengineSignature(
      'POST',
      '/',
      query,
      headers,
      bodyStr,
      timestamp,
      config.secretKey,
      config.accessKey
    );

    headers['Authorization'] = authorization;

    const apiUrl = `https://${HOST}/?${query}`;

    const response = await axios.post(apiUrl, requestBody, {
      headers,
      timeout: 30000
    });

    const result = response.data;

    if (result.code !== 10000) {
      throw new Error(`即梦图床上传失败: code=${result.code}, msg=${result.message || 'Unknown'}`);
    }

    if (!result.data || !result.data.image_url) {
      throw new Error('即梦图床上传失败: 未返回图片 URL');
    }

    console.log(`[Jimeng Upload] 上传成功: ${result.data.image_url}`);
    return result.data.image_url;

  } catch (error) {
    console.error('[Jimeng Upload] 上传失败:', error);
    throw error;
  }
}
