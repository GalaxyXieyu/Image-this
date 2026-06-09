import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.UIUX_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:34123';
const RUN_ID = process.env.UIUX_RUN_ID || `opencli-probe-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const OUTPUT_DIR = path.resolve(process.env.UIUX_OUTPUT_DIR || 'out/ui-ux-plan', RUN_ID, 'opencli');
const TARGET_URL = process.env.UIUX_OPENCLI_URL || `${BASE_URL}/auth/login`;
const TIMEOUT = process.env.UIUX_OPENCLI_TIMEOUT || '120000';

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const readme = [
    '# opencli probe',
    '',
    `- Target: ${TARGET_URL}`,
    `- Output: ${OUTPUT_DIR}`,
    `- Timeout: ${TIMEOUT}ms`,
    '',
    '这个入口只用于验证 opencli 对 UI/UX 探索过程的记录价值。',
    '默认不进入 `npm run test:uiux`，避免和 chrome-mcp 探索路径重复。',
    '',
  ].join('\n');
  await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), readme);

  const child = spawn('opencli', [
    'record',
    '--site',
    'image-this-uiux',
    '--out',
    OUTPUT_DIR,
    '--timeout',
    TIMEOUT,
    TARGET_URL,
  ], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});