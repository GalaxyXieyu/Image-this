import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

const HOST = process.env.UIUX_HOST || 'localhost';
const PORT = process.env.UIUX_PORT || '34123';
const BASE_URL = process.env.UIUX_BASE_URL || process.env.NEXTAUTH_URL || `http://${HOST}:${PORT}`;
const RUN_ID = process.env.UIUX_RUN_ID || `login-generate-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const OUTPUT_ROOT = path.resolve(process.env.UIUX_OUTPUT_DIR || 'out/ui-ux-plan', RUN_ID);
const SCREENSHOT_DIR = path.join(OUTPUT_ROOT, 'screenshots');
const TRACE_DIR = path.join(OUTPUT_ROOT, 'traces');
const OPENCLI_DIR = path.join(OUTPUT_ROOT, 'opencli');
const HEADLESS = process.env.UIUX_HEADLESS !== 'false';
const SKIP_SERVER = process.env.UIUX_SKIP_SERVER === 'true';
const REQUIRE_IMAGE = process.env.UIUX_REQUIRE_IMAGE === 'true';
const EMAIL = process.env.UIUX_EMAIL || 'test@imaginethis.local';
const PASSWORD = process.env.UIUX_PASSWORD || 'TestPassword123!';
const PRODUCT_IMAGE = path.resolve(process.env.UIUX_PRODUCT_IMAGE || 'public/brands/ip/lumo-helper-front.png');
const REFERENCE_IMAGE = path.resolve(process.env.UIUX_REFERENCE_IMAGE || 'public/brands/ip/lumo-helper-welcome.png');
const TASK_TIMEOUT_MS = Number(process.env.UIUX_TASK_TIMEOUT_MS || 180_000);
const PROVIDER_ENV_KEYS = Object.freeze([
  'GPT_API_URL',
  'GPT_API_KEY',
  'GPT_MODEL_NAME',
  'GEMINI_BASE_URL',
  'GEMINI_API_KEY',
  'VOLCENGINE_ACCESS_KEY',
  'VOLCENGINE_SECRET_KEY',
  'ARK_API_KEY',
  'SUPERBED_TOKEN',
]);
const DOT_ENV_PATH = path.resolve('.env');

const executionRows = [];
const bugRows = [];
const stepRows = [];
const networkRows = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

function addStep(step, status, detail, evidencePath = '') {
  stepRows.push({
    time: nowIso(),
    step,
    status,
    detail,
    evidencePath,
  });
}

function addExecution({ caseId, title, result, failureType = '', evidencePath = '', screenshotPath = '', notes = '' }) {
  executionRows.push({
    caseId,
    title,
    result,
    failureType,
    evidencePath,
    screenshotPath,
    notes,
  });

  if (result !== 'PASS') {
    bugRows.push({
      bugId: `BUG-${String(bugRows.length + 1).padStart(3, '0')}`,
      caseId,
      title,
      severity: result === 'FAIL' ? 'P1' : 'P2',
      failureType,
      status: 'OPEN',
      evidencePath,
      notes,
    });
  }
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  await fs.mkdir(TRACE_DIR, { recursive: true });
  await fs.mkdir(OPENCLI_DIR, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadProviderEnvOverrides() {
  try {
    const dotEnv = dotenv.parse(await fs.readFile(DOT_ENV_PATH, 'utf8'));
    const overrides = {};
    const appliedKeys = [];
    const shadowedKeys = [];
    const emptyKeys = [];

    for (const key of PROVIDER_ENV_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(dotEnv, key)) continue;

      const value = dotEnv[key];
      overrides[key] = value;
      appliedKeys.push(key);

      if (value === '') emptyKeys.push(key);
      if (process.env[key] !== undefined && process.env[key] !== value) shadowedKeys.push(key);
    }

    return { missingFile: false, overrides, appliedKeys, shadowedKeys, emptyKeys };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { missingFile: true, overrides: {}, appliedKeys: [], shadowedKeys: [], emptyKeys: [] };
    }

    throw error;
  }
}

function keyList(keys) {
  return keys.length > 0 ? keys.join(', ') : '无';
}

async function buildDevServerEnv() {
  const providerEnv = await loadProviderEnvOverrides();

  return {
    env: {
      ...process.env,
      ...providerEnv.overrides,
      NEXTAUTH_URL: BASE_URL,
      PORT,
    },
    providerEnv,
  };
}

function recordProviderEnv(providerEnv) {
  if (providerEnv.missingFile) {
    addStep('server-env', 'WARN', '未找到 .env，开发服务子进程将沿用外层 provider 环境变量');
    return;
  }

  const emptyNote = providerEnv.emptyKeys.length > 0 ? `；空值键：${keyList(providerEnv.emptyKeys)}` : '';
  addStep(
    'server-env',
    providerEnv.appliedKeys.length > 0 ? 'PASS' : 'WARN',
    `开发服务子进程从 .env 应用 provider 变量：${keyList(providerEnv.appliedKeys)}；覆盖外层同名变量：${keyList(providerEnv.shadowedKeys)}${emptyNote}`
  );
}

async function waitForHttpOk(url, timeoutMs = 75_000, shouldAbortEarly) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof shouldAbortEarly === 'function' && shouldAbortEarly()) {
      throw new Error(`本地服务已退出，无法访问：${url}`);
    }

    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || (res.status >= 300 && res.status < 500)) return true;
    } catch {
      // keep polling
    }
    await sleep(500);
  }
  throw new Error(`等待服务启动超时：${url}`);
}

async function isServerReachable() {
  try {
    const res = await fetch(BASE_URL, { redirect: 'manual' });
    return res.ok || (res.status >= 300 && res.status < 500);
  } catch {
    return false;
  }
}

function startDevServer(childEnv) {
  const nextBin = path.resolve('node_modules/.bin/next');
  const child = spawn(nextBin, ['dev', '-H', HOST, '-p', PORT], {
    stdio: 'inherit',
    env: childEnv,
  });

  let exited = false;
  child.on('exit', () => {
    exited = true;
  });

  return {
    isExited: () => exited,
    stop: async () => {
      if (exited) return;
      child.kill('SIGTERM');
      await sleep(800);
      if (!exited) child.kill('SIGKILL');
    },
  };
}

async function ensureServer() {
  if (SKIP_SERVER) {
    addStep('server-env', 'WARN', '复用外部服务（UIUX_SKIP_SERVER=true），runner 不会修改已运行进程环境变量');
    await waitForHttpOk(BASE_URL, 30_000);
    return null;
  }

  if (await isServerReachable()) {
    addStep('server-env', 'WARN', '复用已存在的本地服务，runner 不会修改已运行进程环境变量');
    return null;
  }

  const { env, providerEnv } = await buildDevServerEnv();
  recordProviderEnv(providerEnv);
  const server = startDevServer(env);
  await waitForHttpOk(BASE_URL, 90_000, () => server.isExited());
  return server;
}

async function screenshot(page, filename) {
  const target = path.join(SCREENSHOT_DIR, filename);
  const image = await page.screenshot({ fullPage: true });
  await fs.writeFile(target, image);
  return path.relative(OUTPUT_ROOT, target);
}

async function waitUntilPageText(page, texts, timeoutMs = 45_000) {
  const expected = Array.isArray(texts) ? texts : [texts];
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (expected.every((text) => bodyText.includes(text))) return bodyText;
    await page.waitForTimeout(300);
  }
  throw new Error(`等待页面文本超时：${expected.join(' / ')}`);
}

async function registerIfPossible(page, email, password) {
  const res = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: { name: 'UIUX Test User', email, password },
  });

  if (res.ok()) return { email, password };

  const fallbackEmail = `uiux+${Date.now()}@imaginethis.local`;
  const fallbackRes = await page.request.post(`${BASE_URL}/api/auth/register`, {
    data: { name: 'UIUX Test User', email: fallbackEmail, password },
  });

  if (fallbackRes.ok()) return { email: fallbackEmail, password };

  return { email, password };
}

async function waitForWorkspaceReady(page, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const reachedWorkspace = page.url().includes('/workspace/scene') && bodyText.includes('产品基础信息') && bodyText.includes('素材上传');
    if (reachedWorkspace) return bodyText;

    if (bodyText.includes('邮箱或密码错误') || bodyText.includes('登录失败，请稍后重试')) {
      throw new Error(`UI 登录失败：${bodyText.slice(0, 300)}`);
    }

    await page.waitForTimeout(300);
  }

  throw new Error(`等待登录后进入工作台超时：${page.url()}`);
}

async function loginThroughUi(page, credentials) {
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.getByLabel('邮箱').fill(credentials.email);
  await page.getByLabel('密码').fill(credentials.password);
  const loginScreenshot = await screenshot(page, '01-login-filled.png');
  await page.getByRole('button', { name: /^登录$/ }).click();
  await waitForWorkspaceReady(page, 60_000);
  const workspaceScreenshot = await screenshot(page, '02-workspace-after-login.png');
  addStep('login', 'PASS', `UI 登录成功：${credentials.email}`, workspaceScreenshot);
  addExecution({
    caseId: 'UIUX-LOGIN-001',
    title: '用户通过登录页进入场景工作台',
    result: 'PASS',
    evidencePath: loginScreenshot,
    screenshotPath: workspaceScreenshot,
    notes: credentials.email,
  });
}

async function selectByText(page, triggerText, optionText) {
  await page.getByText(triggerText, { exact: true }).click();
  await page.getByRole('option', { name: new RegExp(`^${optionText}`) }).click();
}

async function uploadAsset(page, triggerText, filePath) {
  if (!(await fileExists(filePath))) {
    throw new Error(`测试素材不存在：${filePath}`);
  }

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText(triggerText, { exact: true }).click(),
  ]);
  await chooser.setFiles(filePath);
  await page.locator('button').filter({ hasText: path.basename(filePath) }).first().waitFor({ timeout: 30_000 });
}

async function fillSceneForm(page) {
  await page.getByPlaceholder('例如：某某品牌保湿面霜').fill('LUMO UIUX 测试保湿面霜');
  await selectByText(page, '选择产品类型', '美妆护肤');
  await page.getByPlaceholder('例如：25-35 岁女性').fill('25-35 岁电商用户');
  await page.getByPlaceholder('例如：日常护肤').fill('清晨浴室台面自然光场景');
  await page.getByPlaceholder('请列出产品的核心卖点...').fill('补水保湿、质地轻盈、适合日常通勤前快速护肤。');
  await page.getByText('淘宝/天猫', { exact: true }).click();
  await uploadAsset(page, '上传商品图', PRODUCT_IMAGE);
  await uploadAsset(page, '上传场景参考图', REFERENCE_IMAGE);
  const filledScreenshot = await screenshot(page, '03-scene-form-filled.png');
  addStep('fill-scene-form', 'PASS', '商品信息与两张素材已填写上传', filledScreenshot);
  addExecution({
    caseId: 'UIUX-GEN-001',
    title: '填写商品信息并上传商品图/参考图',
    result: 'PASS',
    evidencePath: filledScreenshot,
    screenshotPath: filledScreenshot,
    notes: `product=${path.basename(PRODUCT_IMAGE)}; reference=${path.basename(REFERENCE_IMAGE)}`,
  });
}

async function chooseTemplate(page) {
  await page.getByRole('button', { name: /下一步：选择风格模板/ }).click();
  await waitUntilPageText(page, ['AI 生成预览', '简约自然'], 30_000);
  await page.getByText('简约自然', { exact: true }).click();
  const templateScreenshot = await screenshot(page, '04-template-selected.png');
  await page.getByRole('button', { name: /下一步：生成并调整/ }).click();
  await waitUntilPageText(page, ['准备生成', '开始生成'], 30_000);
  addStep('choose-template', 'PASS', '已选择简约自然模板并进入生成步骤', templateScreenshot);
  addExecution({
    caseId: 'UIUX-GEN-002',
    title: '选择风格模板并进入生成步骤',
    result: 'PASS',
    evidencePath: templateScreenshot,
    screenshotPath: templateScreenshot,
  });
}

async function setCandidateCountToOne(page) {
  const bodyText = await page.evaluate(() => document.body?.innerText || '');
  if (!bodyText.includes('候选数量')) return;

  try {
    await page.getByText('4 张', { exact: true }).click({ timeout: 3_000 });
    await page.getByRole('option', { name: /^1 张$/ }).click({ timeout: 3_000 });
  } catch {
    addStep('set-candidate-count', 'WARN', '候选数量控件未能自动切到 1 张，继续按页面默认数量执行');
  }
}

function extractTaskIds(bodyText) {
  const matches = bodyText.matchAll(/任务 ID：([\w-]+)/g);
  return [...new Set(Array.from(matches, (match) => match[1]))];
}

async function triggerWorker(page, taskIds) {
  try {
    const res = await page.request.post(`${BASE_URL}/api/tasks/worker`, {
      data: { batch: true, maxTasks: Math.max(1, taskIds.length), taskIds },
      timeout: Math.min(TASK_TIMEOUT_MS, 90_000),
    });
    return res.ok();
  } catch (error) {
    addStep('worker-trigger', 'WARN', `worker 触发失败：${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function pollTaskStatus(page, taskIds) {
  if (taskIds.length === 0) return [];

  const start = Date.now();
  let latest = [];
  let workerTriggerCount = 0;
  while (Date.now() - start < TASK_TIMEOUT_MS) {
    const res = await page.request.get(`${BASE_URL}/api/tasks/status?ids=${encodeURIComponent(taskIds.join(','))}`);
    if (res.ok()) {
      const json = await res.json();
      latest = Array.isArray(json.tasks) ? json.tasks : [];
      const allTerminal = latest.length > 0 && latest.every((task) => ['completed', 'failed', 'cancelled'].includes(task.status));
      const hasResultImage = latest.some((task) => task.resultImageUrl);
      if (allTerminal || hasResultImage) return latest;

      const hasPending = latest.some((task) => task.status === 'pending');
      if (hasPending && workerTriggerCount < 8) {
        workerTriggerCount++;
        await triggerWorker(page, taskIds);
      }
    }
    await page.waitForTimeout(3_000);
  }
  return latest;
}

async function submitGeneration(page) {
  await setCandidateCountToOne(page);
  const beforeGenerateScreenshot = await screenshot(page, '05-before-generate.png');
  await page.getByRole('button', { name: /开始生成/ }).click();

  let bodyText = '';
  try {
    bodyText = await waitUntilPageText(page, ['生成结果'], 60_000);
  } catch {
    bodyText = await page.evaluate(() => document.body?.innerText || '');
  }

  const submittedScreenshot = await screenshot(page, '06-generate-submitted.png');
  const taskIds = extractTaskIds(bodyText);

  if (taskIds.length === 0) {
    addStep('submit-generation', 'FAIL', '点击开始生成后未发现任务 ID', submittedScreenshot);
    addExecution({
      caseId: 'UIUX-GEN-003',
      title: '提交场景图生成任务',
      result: 'FAIL',
      failureType: 'PRODUCT',
      evidencePath: beforeGenerateScreenshot,
      screenshotPath: submittedScreenshot,
      notes: bodyText.slice(0, 500),
    });
    return { taskIds, statuses: [] };
  }

  addStep('submit-generation', 'PASS', `已创建生成任务：${taskIds.join(', ')}`, submittedScreenshot);
  addExecution({
    caseId: 'UIUX-GEN-003',
    title: '提交场景图生成任务',
    result: 'PASS',
    evidencePath: beforeGenerateScreenshot,
    screenshotPath: submittedScreenshot,
    notes: taskIds.join(', '),
  });

  const statuses = await pollTaskStatus(page, taskIds);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  const finalScreenshot = await screenshot(page, '07-final-task-status.png');
  const completedWithImage = statuses.some((task) => task.status === 'completed' && task.resultImageUrl);
  const failed = statuses.find((task) => task.status === 'failed' || task.status === 'cancelled');

  if (completedWithImage) {
    addStep('image-result', 'PASS', '至少一个生成任务已返回结果图', finalScreenshot);
    addExecution({
      caseId: 'UIUX-GEN-004',
      title: '生成任务返回结果图片',
      result: 'PASS',
      evidencePath: finalScreenshot,
      screenshotPath: finalScreenshot,
      notes: JSON.stringify(statuses.map(({ id, status, resultImageUrl }) => ({ id, status, resultImageUrl }))),
    });
  } else if (failed) {
    addStep('image-result', 'BLOCKED', `任务未出图：${failed.errorMessage || failed.currentStep || failed.status}`, finalScreenshot);
    addExecution({
      caseId: 'UIUX-GEN-004',
      title: '生成任务返回结果图片',
      result: 'BLOCKED',
      failureType: 'ENV',
      evidencePath: finalScreenshot,
      screenshotPath: finalScreenshot,
      notes: failed.errorMessage || failed.currentStep || JSON.stringify(failed),
    });
  } else {
    addStep('image-result', 'BLOCKED', '等待超时，任务尚未返回结果图', finalScreenshot);
    addExecution({
      caseId: 'UIUX-GEN-004',
      title: '生成任务返回结果图片',
      result: 'BLOCKED',
      failureType: 'ENV',
      evidencePath: finalScreenshot,
      screenshotPath: finalScreenshot,
      notes: JSON.stringify(statuses),
    });
  }

  return { taskIds, statuses };
}

function attachNetworkCapture(page) {
  page.on('requestfinished', async (request) => {
    const url = request.url();
    if (!url.includes('/api/')) return;

    try {
      const response = await request.response();
      networkRows.push({
        time: nowIso(),
        method: request.method(),
        url,
        status: response?.status() ?? '',
      });
    } catch {
      networkRows.push({
        time: nowIso(),
        method: request.method(),
        url,
        status: '',
      });
    }
  });
}

function summarizeGate() {
  if (executionRows.some((row) => row.result === 'FAIL')) return 'FAIL';
  if (executionRows.some((row) => row.result === 'BLOCKED')) return REQUIRE_IMAGE ? 'FAIL' : 'PASS_WITH_BLOCKED';
  return 'PASS';
}

function defectIdForCase(caseId) {
  return bugRows.find((row) => row.caseId === caseId)?.bugId || '';
}

async function writeArtifacts(runMeta) {
  await fs.writeFile(
    path.join(OUTPUT_ROOT, '01_scope.csv'),
    csv([
      ['scope_id', 'module', 'persona', 'entry_route', 'in_scope', 'out_scope', 'risk_level', 'owner', 'notes'],
      ['SCOPE-001', 'Auth + Scene Generation', 'authenticated ecommerce operator', '/auth/login', 'login + scene workspace + asset upload + task creation + result polling', 'provider credential setup, payment, desktop packaging', 'HIGH', '', '登录到生成图片主链路'],
    ])
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, '02_coverage_matrix.csv'),
    csv([
      ['module', 'critical_flow', 'permission', 'data_integrity', 'error_recovery', 'responsive', 'observability', 'coverage_status', 'gap_note'],
      ['Auth Login', 'Y', 'Y', 'Y', 'N', 'N', 'Y', 'covered', '本轮只覆盖成功登录'],
      ['Scene Workspace', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'covered', '覆盖表单、素材上传、模板选择和任务创建'],
      ['Task Result', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'partial', '真实出图依赖本地 provider 凭据'],
    ])
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, '03_test_cases.csv'),
    csv([
      ['case_id', 'priority', 'module', 'user_journey', 'preconditions', 'steps', 'api_expectation', 'ui_expectation', 'ux_checks', 'ui_checks'],
      ['UIUX-LOGIN-001', 'P0', 'Auth Login', 'password login success', 'valid or auto-created local test account', 'open login -> input credentials -> submit', 'session cookie set', 'redirect to /workspace/scene', 'loading state and error fallback understandable', 'login card layout stable'],
      ['UIUX-GEN-001', 'P0', 'Scene Workspace', 'fill product scene brief and upload assets', 'logged in', 'fill product fields -> choose platform -> upload product/reference image', '/api/input-assets returns asset refs', 'uploaded file names visible', 'upload affordance clear', 'form spacing and hierarchy stable'],
      ['UIUX-GEN-002', 'P0', 'Scene Workspace', 'choose visual template', 'product form completed', 'next step -> choose template -> next step', 'no API required', 'generate step visible', 'selected state clear', 'step bar stays understandable'],
      ['UIUX-GEN-003', 'P0', 'Task Queue', 'submit image generation task', 'input/reference assets exist', 'set candidate count -> click generate', '/api/tasks creates task', 'task id visible', 'disabled state prevents missing assets', 'result cards readable'],
      ['UIUX-GEN-004', 'P0', 'Task Result', 'wait for generated image', 'task created and worker triggered', 'poll /api/tasks/status', 'task returns resultImageUrl or provider error', 'result/error state visible', 'provider missing is marked BLOCKED/ENV', 'final state screenshot retained'],
    ])
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, '04_execution_log.csv'),
    csv([
      ['run_id', 'case_id', 'priority', 'result', 'failure_type', 'owner', 'eta', 'evidence_path', 'screenshot_path', 'defect_id', 'actual_result', 'notes'],
      ...executionRows.map((row) => [RUN_ID, row.caseId, 'P0', row.result, row.failureType, '', '', row.evidencePath, row.screenshotPath, defectIdForCase(row.caseId), row.title, row.notes]),
    ])
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, '05_bug_list.csv'),
    csv([
      ['defect_id', 'severity', 'module', 'case_id', 'title', 'repro_steps', 'expected', 'actual', 'status', 'owner', 'eta', 'evidence_path'],
      ...bugRows.map((row) => [row.bugId, row.severity, 'UI/UX login-to-generate', row.caseId, row.title, 'Run npm run test:uiux and inspect report artifacts', 'Case should pass or be explicitly blocked by environment', row.notes, row.status, '', '', row.evidencePath]),
    ])
  );

  const passCases = executionRows.filter((row) => row.result === 'PASS').length;
  const failCases = executionRows.filter((row) => row.result === 'FAIL').length;
  const blockedCases = executionRows.filter((row) => row.result === 'BLOCKED').length;
  const totalCases = executionRows.length;
  const p0PassRate = totalCases === 0 ? 0 : Math.round((passCases / totalCases) * 100);

  await fs.writeFile(
    path.join(OUTPUT_ROOT, '06_summary.csv'),
    csv([
      ['run_id', 'total_cases', 'pass_cases', 'fail_cases', 'blocked_cases', 'not_run_cases', 'p0_pass_rate', 'p1_pass_rate', 'gate_result', 'major_risks', 'next_actions'],
      [RUN_ID, totalCases, passCases, failCases, blockedCases, 0, p0PassRate, 0, summarizeGate(), blockedCases > 0 ? '真实出图依赖本地 provider 凭据或 worker 状态' : '', summarizeGate() === 'PASS' ? '可沉淀为稳定复跑基线' : '先确认 provider 配置或查看 FAIL 证据'],
    ])
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'step-log.jsonl'),
    stepRows.map((row) => JSON.stringify(row)).join('\n') + '\n'
  );

  await fs.writeFile(
    path.join(OUTPUT_ROOT, 'network.json'),
    JSON.stringify(networkRows, null, 2)
  );

  const report = [
    `# UI/UX 测试报告 - 登录到生成图片`,
    '',
    `- Run ID: \`${RUN_ID}\``,
    `- Base URL: ${BASE_URL}`,
    `- Gate: \`${summarizeGate()}\``,
    `- Started: ${runMeta.startedAt}`,
    `- Completed: ${nowIso()}`,
    `- Require actual image: \`${REQUIRE_IMAGE}\``,
    '',
    '## 执行结果',
    '',
    '| Case | Result | Evidence | Notes |',
    '|---|---|---|---|',
    ...executionRows.map((row) => `| ${row.caseId} ${row.title} | ${row.result} | ${row.screenshotPath ? `[screenshot](${row.screenshotPath})` : row.evidencePath} | ${String(row.notes || '').replaceAll('|', '\\|')} |`),
    '',
    '## 截图证据',
    '',
    ...executionRows
      .filter((row) => row.screenshotPath)
      .map((row) => [`### ${row.caseId} ${row.title}`, '', `![${row.caseId}](${row.screenshotPath})`, ''].join('\n')),
    '## Network/API 记录',
    '',
    `- API request count: ${networkRows.length}`,
    `- Full log: [network.json](network.json)`,
    '',
    '## 结论',
    '',
    summarizeGate() === 'PASS'
      ? '- 登录、素材上传、任务创建和真实结果图片返回均通过。'
      : summarizeGate() === 'PASS_WITH_BLOCKED'
        ? '- UI 主链路通过；真实出图阶段被环境或 provider 配置阻塞，已按 BLOCKED/ENV 记录。'
        : '- 存在阻断问题，需要优先查看 FAIL/BLOCKED 明细。',
    '',
  ].join('\n');

  await fs.writeFile(path.join(OUTPUT_ROOT, `ui-ux-test-report-${RUN_ID}.md`), report);
}

async function run() {
  await ensureDirs();
  const startedAt = nowIso();
  let server = null;
  let browser = null;
  let page = null;

  try {
    server = await ensureServer();
    browser = await chromium.launch({ headless: HEADLESS });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      recordVideo: { dir: TRACE_DIR, size: { width: 1440, height: 900 } },
    });
    await context.tracing.start({ screenshots: true, snapshots: true });
    page = await context.newPage();
    attachNetworkCapture(page);

    const credentials = await registerIfPossible(page, EMAIL, PASSWORD);
    await loginThroughUi(page, credentials);
    await fillSceneForm(page);
    await chooseTemplate(page);
    const generation = await submitGeneration(page);

    await context.tracing.stop({ path: path.join(TRACE_DIR, 'trace.zip') });
    await context.close();

    await writeArtifacts({ startedAt, generation });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let errorScreenshot = '';
    if (page && !page.isClosed()) {
      errorScreenshot = await screenshot(page, '99-runner-error.png').catch(() => '');
    }
    addStep('runner-error', 'FAIL', message, errorScreenshot);
    addExecution({
      caseId: 'UIUX-RUNNER-ERROR',
      title: 'UI/UX 测试脚本执行异常',
      result: 'FAIL',
      failureType: 'ENV',
      evidencePath: errorScreenshot,
      screenshotPath: errorScreenshot,
      notes: message,
    });
    await writeArtifacts({ startedAt });
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    if (server) await server.stop();
  }

  const gate = summarizeGate();
  console.log(`UI/UX 测试完成：${OUTPUT_ROOT}`);
  console.log(`Gate: ${gate}`);
  if (gate === 'FAIL') process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});