/**
 * Batch generate template/case-study images via image-this-mcp (jimeng)
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const MCP_HOST = '120.76.159.103';
const MCP_PORT = 34128;
const MCP_PATH = '/mcp';
const AUTH = 'Bearer GdR3cM7pV9sL2xK8qH4nT6yB1wF5zJ0a';

const ASSETS = [
  {
    name: 'listing',
    dir: 'template-previews',
    prompt: '电商主图，一款精致极简手表放在浅灰色大理石台面上，专业产品摄影，柔和侧光，高清细节，质感高级',
    ratio: '1:1',
  },
  {
    name: 'whitebg',
    dir: 'template-previews',
    prompt: '白底图，一副白色无线耳机悬浮在纯白色背景上，无阴影，专业电商摄影，极简风格，高清',
    ratio: '1:1',
  },
  {
    name: 'scene',
    dir: 'template-previews',
    prompt: '场景图，现代温馨厨房，咖啡机放在大理石台面上，窗外自然光，生活方式摄影，暖色调',
    ratio: '1:1',
  },
  {
    name: 'poster',
    dir: 'template-previews',
    prompt: '电商促销海报，时尚品牌大促，粉色到紫色渐变背景，现代排版设计，竖版构图，视觉冲击力',
    ratio: '3:4',
  },
  {
    name: 'video',
    dir: 'template-previews',
    prompt: '短视频封面，一位年轻女性在户外花园手持化妆品自拍，金色阳光，竖屏构图，生动自然',
    ratio: '9:16',
  },
  {
    name: 'process',
    dir: 'template-previews',
    prompt: '图片处理工作流，笔记本电脑屏幕显示Photoshop修图界面，现代创意工作桌面，暖色台灯',
    ratio: '1:1',
  },
  {
    name: 'beauty',
    dir: 'case-studies',
    prompt: '美妆产品平铺摄影，口红粉饼和护肤品摆放在大理石台面上，柔和的粉玫瑰金色调，优雅高端',
    ratio: '3:2',
  },
  {
    name: 'food',
    dir: 'case-studies',
    prompt: '美食摄影，精致法式甜点放在白色瓷盘上，咖啡厅背景虚化，暖色调光线，令人食欲大开',
    ratio: '3:2',
  },
  {
    name: 'fashion',
    dir: 'case-studies',
    prompt: '时尚服饰平铺，驼色秋季毛衣搭配围巾和皮质手袋，中性大地色调，电商服装摄影',
    ratio: '3:2',
  },
  {
    name: 'home',
    dir: 'case-studies',
    prompt: '家居场景，北欧风现代客厅，灰色沙发搭配绿植和落地灯，自然光从大窗户照入，温馨舒适',
    ratio: '3:2',
  },
  {
    name: 'tech',
    dir: 'case-studies',
    prompt: '科技产品摄影，银色笔记本电脑和无线耳机放在极简白色桌面上，冷蓝灰色调，专业产品照',
    ratio: '3:2',
  },
  {
    name: 'baby',
    dir: 'case-studies',
    prompt: '母婴用品，婴儿奶瓶和柔软毛绒玩具摆放在白色针织毛毯上，柔和的粉蓝奶油色调，温馨柔和',
    ratio: '3:2',
  },
];

function mcpRequest(body, sessionId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: MCP_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': AUTH,
        'Content-Length': Buffer.byteLength(data),
        ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        // Parse SSE format: event: message\ndata: {...}\n\n
        const match = raw.match(/data: ({.*})/s);
        if (match) {
          try {
            resolve(JSON.parse(match[1]));
          } catch (e) {
            resolve({ raw });
          }
        } else {
          resolve({ raw });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', reject);
  });
}

async function getSessionId() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: MCP_HOST,
      port: MCP_PORT,
      path: MCP_PATH,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': AUTH,
      },
    };
    const req = http.request(options, (res) => {
      const sessionId = res.headers['mcp-session-id'];
      // consume body
      res.on('data', () => {});
      res.on('end', () => resolve(sessionId));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const sessionId = await getSessionId();
  console.log('Session:', sessionId);

  // Initialize
  await mcpRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'cursor', version: '1.0' } } }, sessionId);
  await mcpRequest({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);

  const publicDir = path.resolve(__dirname, '../public');

  for (const asset of ASSETS) {
    console.log(`\n[${asset.name}] Generating...`);
    try {
      const result = await mcpRequest({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 100000),
        method: 'tools/call',
        params: {
          name: 'generate_image',
          arguments: {
            prompt: asset.prompt,
            provider: 'jimeng',
            n: 1,
            aspect_ratio: asset.ratio,
          },
        },
      }, sessionId);

      // Extract URL from text content
      const textContent = result.result?.content?.find(c => c.type === 'text')?.text || '';
      const urlMatch = textContent.match(/(http:\/\/[^\s]+\.png)/);

      if (urlMatch) {
        const url = urlMatch[1];
        const destPath = path.join(publicDir, asset.dir, `${asset.name}.jpg`);
        console.log(`  URL: ${url}`);
        await httpGet(url, destPath);
        const stats = fs.statSync(destPath);
        console.log(`  Saved: ${destPath} (${(stats.size / 1024).toFixed(0)} KB)`);
      } else {
        console.log('  No image URL found in response:', JSON.stringify(result).slice(0, 300));
      }
    } catch (err) {
      console.error(`  Failed: ${err.message}`);
    }

    // Small delay between requests to respect serial queue
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nDone!');
}

main().catch(console.error);