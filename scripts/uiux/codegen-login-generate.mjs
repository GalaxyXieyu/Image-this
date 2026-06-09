import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const HOST = process.env.UIUX_HOST || 'localhost';
const PORT = process.env.UIUX_PORT || '34123';
const BASE_URL = process.env.UIUX_BASE_URL || process.env.NEXTAUTH_URL || `http://${HOST}:${PORT}`;
const RUN_ID = process.env.UIUX_RUN_ID || `codegen-login-generate-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const OUTPUT_ROOT = path.resolve(process.env.UIUX_OUTPUT_DIR || 'out/ui-ux-plan', RUN_ID);
const RECORDING_DIR = path.join(OUTPUT_ROOT, 'recordings');
const TARGET_URL = process.env.UIUX_CODEGEN_URL || `${BASE_URL}/auth/login`;
const TARGET = process.env.UIUX_CODEGEN_TARGET || 'javascript';
const VIEWPORT_SIZE = process.env.UIUX_VIEWPORT_SIZE || '1440,900';
const HAR_OUTPUT = path.resolve(process.env.UIUX_CODEGEN_HAR || path.join(RECORDING_DIR, 'login-generate.har'));
const STORAGE_OUTPUT = path.resolve(process.env.UIUX_CODEGEN_STORAGE || path.join(RECORDING_DIR, 'storage-state.json'));
const SCRIPT_OUTPUT = path.resolve(
  process.env.UIUX_CODEGEN_OUTPUT || path.join(RECORDING_DIR, `login-generate-recorded.${TARGET === 'javascript' ? 'js' : 'spec.ts'}`)
);

function localPlaywrightBin() {
  const executable = process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
  return path.resolve('node_modules', '.bin', executable);
}

function runCodegen() {
  return new Promise((resolve, reject) => {
    const child = spawn(localPlaywrightBin(), [
      'codegen',
      '--target',
      TARGET,
      '--output',
      SCRIPT_OUTPUT,
      '--save-har',
      HAR_OUTPUT,
      '--save-storage',
      STORAGE_OUTPUT,
      '--viewport-size',
      VIEWPORT_SIZE,
      TARGET_URL,
    ], {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 0));
  });
}

async function writeManifest(status, details = {}) {
  await fs.writeFile(
    path.join(RECORDING_DIR, 'recording-manifest.json'),
    JSON.stringify({
      runId: RUN_ID,
      status,
      baseUrl: BASE_URL,
      targetUrl: TARGET_URL,
      target: TARGET,
      viewportSize: VIEWPORT_SIZE,
      outputRoot: OUTPUT_ROOT,
      scriptOutput: SCRIPT_OUTPUT,
      harOutput: HAR_OUTPUT,
      storageOutput: STORAGE_OUTPUT,
      cleanupWorkflow: [
        '关闭 codegen 浏览器后检查 generated script。',
        '删除误点、重复等待、toast 临时定位和无关导航。',
        '把保留下来的稳定步骤迁移到 scripts/uiux/login-generate-image.mjs 或 tests/e2e/uiux/。',
        '运行 npm run test:uiux 生成 CSV、截图、trace、network 和 Markdown 报告。',
      ],
      ...details,
    }, null, 2)
  );
}

async function main() {
  await fs.mkdir(RECORDING_DIR, { recursive: true });
  await writeManifest('recording-started');

  console.log(`UI/UX 录制目录：${RECORDING_DIR}`);
  console.log(`录制脚本输出：${SCRIPT_OUTPUT}`);
  console.log(`HAR 输出：${HAR_OUTPUT}`);
  console.log('关闭 codegen 浏览器后会完成脚本、HAR 和 storage 写入。');

  const code = await runCodegen();
  await writeManifest(code === 0 ? 'recording-finished' : 'recording-failed', { exitCode: code });

  if (code !== 0) {
    process.exitCode = code;
    return;
  }

  console.log(`UI/UX 录制完成：${RECORDING_DIR}`);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await fs.mkdir(RECORDING_DIR, { recursive: true }).catch(() => undefined);
  await writeManifest('recording-error', { error: message }).catch(() => undefined);
  console.error(error);
  process.exit(1);
});