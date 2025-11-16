import fs from 'fs';
import path from 'path';

const API_ENDPOINT = process.env.VOLCENGINE_TEST_ENDPOINT || 'http://localhost:3000/api/volcengine/enhance';
const DEFAULT_USER_ID = process.env.VOLCENGINE_TEST_USER || 'test-user';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_IMAGE_PATH = path.join(PROJECT_ROOT, 'product.jpg');

async function main() {
  const imagePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_IMAGE_PATH;
  const userId = process.argv[3] || DEFAULT_USER_ID;

  console.log('[Volcengine Test] 读取图片:', imagePath);
  const fileBuffer = fs.readFileSync(imagePath);
  const base64 = fileBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const payload = {
    userId,
    serverCall: true,
    imageUrl: dataUrl,
    resultFormat: 1,
    jpgQuality: 95
  };

  console.log('[Volcengine Test] 发起请求到:', API_ENDPOINT);
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`[Volcengine Test] 响应状态: ${response.status}`);
  console.log('[Volcengine Test] 响应正文:');
  try {
    console.log(JSON.parse(text));
  } catch (err) {
    console.log(text);
  }
}

main().catch(err => {
  console.error('[Volcengine Test] 运行失败:', err);
  process.exit(1);
});
