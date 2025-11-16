import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const API_ENDPOINT = process.env.VOLCENGINE_TEST_ENDPOINT || 'http://localhost:3000/api/volcengine/enhance';
const DEFAULT_USER_ID = process.env.VOLCENGINE_TEST_USER || 'test-user';
const DEFAULT_IMAGE = path.resolve(process.cwd(), 'product.jpg');

async function run() {
  const imagePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_IMAGE;
  const userId = process.argv[3] || DEFAULT_USER_ID;

  console.log('[Volcengine Test] 使用图片:', imagePath);
  const buffer = await readFile(imagePath);
  const base64 = buffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const payload = {
    userId,
    serverCall: true,
    imageUrl: dataUrl,
    resultFormat: 1,
    jpgQuality: 95
  };

  console.log('[Volcengine Test] 请求接口:', API_ENDPOINT);
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`[Volcengine Test] 状态码: ${response.status}`);
  try {
    console.log('[Volcengine Test] 响应 JSON:', JSON.parse(text));
  } catch (err) {
    console.log('[Volcengine Test] 响应文本:', text);
  }
}

run().catch(err => {
  console.error('[Volcengine Test] 运行失败:', err);
  process.exit(1);
});
