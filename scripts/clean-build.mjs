#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const prismaCli = process.platform === 'win32'
  ? join(projectRoot, 'node_modules', '.bin', 'prisma.cmd')
  : join(projectRoot, 'node_modules', '.bin', 'prisma');

const targets = [
  '.next',
  'dist-electron',
  'node_modules/.cache',
  'node_modules/.prisma',
  'node_modules/@prisma/client',
];

function log(message) {
  console.log(message);
}

function removeTarget(relativePath) {
  const fullPath = join(projectRoot, relativePath);
  if (!existsSync(fullPath)) {
    log(`skip ${relativePath}`);
    return;
  }

  rmSync(fullPath, { recursive: true, force: true });
  log(`removed ${relativePath}`);
}

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        PRISMA_CLI_BINARY_TARGETS: 'windows,darwin,darwin-arm64,linux-musl-openssl-3.0.x',
      },
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with exit code ${code}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  log('Cleaning build outputs...');
  targets.forEach(removeTarget);

  log('Regenerating Prisma client...');
  await runCommand(prismaCli, ['generate']);
  log('Clean complete.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
