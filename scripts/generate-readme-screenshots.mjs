import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

// NextAuth 默认把 Session Cookie 绑定到 NEXTAUTH_URL 的域名。
// 为了避免 localhost/127.0.0.1 域名不一致导致登录态丢失，默认使用 localhost。
const SCREENSHOT_HOST = process.env.SCREENSHOT_HOST || 'localhost';
const SCREENSHOT_PORT = process.env.SCREENSHOT_PORT || '23000';
const BASE_URL =
  process.env.SCREENSHOT_BASE_URL ||
  process.env.NEXTAUTH_URL ||
  `http://${SCREENSHOT_HOST}:${SCREENSHOT_PORT}`;
const OUTPUT_DIR = path.resolve('docs/screenshots');
const HEADLESS = process.env.HEADLESS !== 'false';
const SKIP_SERVER = process.env.SCREENSHOT_SKIP_SERVER === 'true';
const SCREENSHOT_EMAIL = process.env.SCREENSHOT_EMAIL || 'admin@qq.com';
const SCREENSHOT_PASSWORD = process.env.SCREENSHOT_PASSWORD || 'mimamima';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function waitForWorkspaceReady(page, timeoutMs = 60_000) {
  // workspace 页面加载成功后，侧边栏会出现“一键增强”等入口按钮
  const workspaceTab = page.getByRole('button', { name: /^一键增强/ }).first();

  await Promise.race([
    page.waitForURL('**/workspace', { timeout: timeoutMs }),
    workspaceTab.waitFor({ timeout: timeoutMs }),
  ]);

  await workspaceTab.waitFor({ timeout: timeoutMs });
}

async function waitForHttpOk(url, timeoutMs = 60_000, shouldAbortEarly) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof shouldAbortEarly === 'function' && shouldAbortEarly()) {
      throw new Error(
        `本地服务似乎已退出，无法访问：${url}\n` +
          '建议：在你自己的终端先手动启动服务，然后用 SCREENSHOT_SKIP_SERVER=true 运行截图脚本。'
      );
    }

    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || (res.status >= 300 && res.status < 500)) return;
    } catch {
      // 忽略，继续轮询
    }
    await sleep(500);
  }
  throw new Error(`等待服务启动超时：${url}`);
}

function startDevServer() {
  const nextBin = path.resolve('node_modules/.bin/next');
  const child = spawn(nextBin, ['dev', '-H', SCREENSHOT_HOST, '-p', SCREENSHOT_PORT], {
    stdio: 'inherit',
    env: { ...process.env },
  });

  let exited = false;
  child.on('exit', (code) => {
    exited = true;
    if (code && code !== 0) {
      console.error(`Next.js dev server 异常退出，exit code=${code}`);
    }
  });

  return {
    process: child,
    isExited: () => exited,
    stop: async () => {
      if (exited) return;
      child.kill('SIGTERM');
      await sleep(800);
      if (!exited) child.kill('SIGKILL');
    },
  };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function waitUntilReady(page, options) {
  const { mustHaveTexts = [], mustNotHaveTexts = ['加载中...'], timeoutMs = 45_000 } = options || {};
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const bodyText = await page.evaluate(() => document.body?.innerText || '');

    if (mustNotHaveTexts.some((t) => bodyText.includes(t))) {
      await page.waitForTimeout(300);
      continue;
    }

    if (mustHaveTexts.length > 0 && !mustHaveTexts.some((t) => bodyText.includes(t))) {
      await page.waitForTimeout(300);
      continue;
    }

    return;
  }

  throw new Error(`等待页面就绪超时：${page.url()}`);
}

async function screenshotFullPage(page, filename, readyOptions) {
  await waitUntilReady(page, readyOptions);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, filename), fullPage: true });
}

async function signInWithCredentialsApi(page, email, password) {
  const csrfRes = await page.request.get(`${BASE_URL}/api/auth/csrf`);
  if (!csrfRes.ok()) {
    throw new Error(`获取 CSRF 失败：HTTP ${csrfRes.status()} ${await csrfRes.text()}`);
  }
  const csrfJson = await csrfRes.json();
  const csrfToken = csrfJson?.csrfToken;
  if (!csrfToken) throw new Error('获取 CSRF 失败：响应中缺少 csrfToken');

  const form = new URLSearchParams();
  form.set('csrfToken', csrfToken);
  form.set('email', email);
  form.set('password', password);
  form.set('callbackUrl', `${BASE_URL}/workspace`);
  form.set('json', 'true');

  const signInRes = await page.request.post(`${BASE_URL}/api/auth/callback/credentials`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: form.toString(),
  });

  if (!signInRes.ok()) {
    return { ok: false, status: signInRes.status(), text: await signInRes.text() };
  }

  // next-auth redirect:false 会返回 json，包含 url；这里只要 Cookie 写入成功即可
  return { ok: true, status: signInRes.status(), text: await signInRes.text() };
}

async function loginOrRegister(page, email, password) {
  // 优先用固定账号登录（通过 next-auth API，避免 UI 不确定性）
  const firstTry = await signInWithCredentialsApi(page, email, password);
  if (!firstTry.ok) {
    // 失败则注册一次性账号并登录
    const oneOffEmail = `screenshot+${Date.now()}@example.com`;
    const registerRes = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: { name: '截图账号', email: oneOffEmail, password },
    });
    if (!registerRes.ok()) {
      throw new Error(`注册一次性账号失败：HTTP ${registerRes.status()} ${await registerRes.text()}`);
    }

    const secondTry = await signInWithCredentialsApi(page, oneOffEmail, password);
    if (!secondTry.ok) {
      throw new Error(`登录失败：HTTP ${secondTry.status} ${secondTry.text}`);
    }
  }

  await page.goto(`${BASE_URL}/workspace`, { waitUntil: 'domcontentloaded' });
  await waitForWorkspaceReady(page, 60_000);
}

async function main() {
  await ensureDir(OUTPUT_DIR);

  const server = SKIP_SERVER ? null : startDevServer();
  try {
    await waitForHttpOk(BASE_URL, 90_000, () => Boolean(server?.isExited()));

    const browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // 1) 首页（未登录态）
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await screenshotFullPage(page, '01-homepage.png', {
      mustHaveTexts: ['强大的功能特性', 'AI 图像处理', '登录', '欢迎回来'],
      mustNotHaveTexts: ['加载中...', 'missing required error components', 'ChunkLoadError'],
      timeoutMs: 60_000,
    });

    // 2) 注册并自动登录，进入工作区
    await loginOrRegister(page, SCREENSHOT_EMAIL, SCREENSHOT_PASSWORD);
    await waitUntilReady(page, { mustHaveTexts: ['功能模块', '一键增强'], timeoutMs: 60_000 });

    const workspaceShots = [
      { tabName: '一键增强', file: 'workspace-01-oneclick.png' },
      { tabName: '背景替换', file: 'workspace-02-background-replace.png' },
      { tabName: '图像扩展', file: 'workspace-03-outpaint.png' },
      { tabName: '图像高清化', file: 'workspace-04-enhance.png' },
      { tabName: '叠加水印', file: 'workspace-05-watermark.png' },
    ];

    for (const { tabName, file } of workspaceShots) {
      // 避免 Playwright strict mode：例如“`一键增强`”会同时匹配侧边栏 tab 与“开始一键增强”按钮
      const tabButton = page
        .getByRole('button', { name: new RegExp(`^${escapeRegExp(tabName)}`) })
        .first();
      await tabButton.click();
      await screenshotFullPage(page, file, {
        mustHaveTexts: [tabName],
        mustNotHaveTexts: ['加载中...'],
        timeoutMs: 45_000,
      });
    }

    // 3) 任务中心
    await page.goto(`${BASE_URL}/history`, { waitUntil: 'domcontentloaded' });
    await screenshotFullPage(page, '04-task-center.png', {
      mustHaveTexts: ['任务中心'],
      mustNotHaveTexts: ['加载中...'],
      timeoutMs: 45_000,
    });

    // 4) 图片库
    await page.goto(`${BASE_URL}/gallery`, { waitUntil: 'domcontentloaded' });
    await screenshotFullPage(page, '05-gallery.png', {
      mustHaveTexts: ['图片管理', '图片分类'],
      mustNotHaveTexts: ['加载中...'],
      timeoutMs: 45_000,
    });

    await context.close();
    await browser.close();

    console.log(`截图生成完成：${OUTPUT_DIR}`);
  } finally {
    if (server) await server.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
