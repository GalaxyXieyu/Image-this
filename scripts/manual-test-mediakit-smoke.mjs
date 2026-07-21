/**
 * Manual MediaKit enhance/expand smoke test.
 * Loads .env, uploads a local sample image to Superbed, then calls MediaKit.
 * Usage: node scripts/manual-test-mediakit-smoke.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

loadEnv(path.join(root, '.env'));
loadEnv(path.join(root, '.env.local'));

const hasKey = !!(process.env.MEDIAKIT_API_KEY || process.env.VOLCENGINE_MEDIAKIT_API_KEY);
const hasSuperbed = !!process.env.SUPERBED_TOKEN;
console.log(JSON.stringify({ hasKey, hasSuperbed, base: process.env.MEDIAKIT_BASE_URL || 'default' }));
if (!hasKey) {
  console.error('MEDIAKIT_API_KEY missing');
  process.exit(1);
}
if (!hasSuperbed) {
  console.error('SUPERBED_TOKEN missing');
  process.exit(1);
}

// Import compiled-less TS via dynamic path using tsx register if available.
// Prefer direct HTTP smoke so we do not depend on path aliases / TS loader.
async function uploadToSuperbed(buffer, filename) {
  const token = process.env.SUPERBED_TOKEN;
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'image/jpeg' }), filename);
  const res = await fetch(`https://api.superbed.cn/upload?token=${token}`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (data.err !== 0 || !data.url) {
    throw new Error(`superbed upload failed: ${data.msg || JSON.stringify(data)}`);
  }
  return data.url;
}

async function postMediaKit(pathname, payload) {
  const apiKey = process.env.MEDIAKIT_API_KEY || process.env.VOLCENGINE_MEDIAKIT_API_KEY;
  const base = process.env.MEDIAKIT_BASE_URL || 'https://mediakit.cn-beijing.volces.com/api/v1';
  const res = await fetch(`${base}${pathname}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`invalid response HTTP ${res.status}: ${raw.slice(0, 300)}`);
  }
  if (!res.ok || data.success === false || !data.result) {
    throw new Error(`request failed: ${data.message || raw.slice(0, 500)}`);
  }
  return data.result;
}

async function main() {
  const local = path.join(root, 'tmp-mediakit-test.jpg');
  await sharp({
    create: {
      width: 512,
      height: 768,
      channels: 3,
      background: { r: 180, g: 120, b: 80 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="512" height="768"><rect x="80" y="120" width="352" height="480" rx="24" fill="#f5f0e6"/><text x="256" y="380" text-anchor="middle" font-size="42" fill="#333" font-family="Arial">SMOKE</text></svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 90 })
    .toFile(local);
  console.log('local image', local, fs.statSync(local).size);

  const publicUrl = await uploadToSuperbed(fs.readFileSync(local), 'tmp-mediakit-test.jpg');
  console.log('publicUrl host', new URL(publicUrl).host);

  console.log('--- enhance multiple=1.5 professional ---');
  const enhance = await postMediaKit('/tools-sync/enhance-image', {
    image_url: publicUrl,
    tool_version: 'professional',
    multiple: 1.5,
  });
  console.log(
    JSON.stringify(
      {
        width: enhance.image_width,
        height: enhance.image_height,
        size: enhance.image_size,
        format: enhance.image_format,
        hasUrl: !!enhance.image_url,
      },
      null,
      2
    )
  );
  const enhanceBuf = Buffer.from(await (await fetch(enhance.image_url)).arrayBuffer());
  fs.writeFileSync(path.join(root, 'tmp-mediakit-enhance.out.jpg'), enhanceBuf);
  console.log('saved tmp-mediakit-enhance.out.jpg', enhanceBuf.length);

  console.log('--- expand L/R 0.2 ---');
  const expand = await postMediaKit('/tools-sync/expand-image-canvas', {
    image_url: publicUrl,
    expand_left: 0.2,
    expand_right: 0.2,
    expand_top: 0,
    expand_bottom: 0,
  });
  console.log(
    JSON.stringify(
      {
        width: expand.image_width,
        height: expand.image_height,
        size: expand.image_size,
        format: expand.image_format,
        hasUrl: !!expand.image_url,
      },
      null,
      2
    )
  );
  const expandBuf = Buffer.from(await (await fetch(expand.image_url)).arrayBuffer());
  fs.writeFileSync(path.join(root, 'tmp-mediakit-expand.out.jpg'), expandBuf);
  console.log('saved tmp-mediakit-expand.out.jpg', expandBuf.length);

  // Also smoke the project helper module if tsx is available via dynamic import path.
  // Pure HTTP path is enough for key+endpoint validation.
  console.log('SMOKE_OK');
}

main().catch((err) => {
  console.error('SMOKE_FAILED', err instanceof Error ? err.message : err);
  process.exit(1);
});
