#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join, parse } from 'path';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const isolatedBuildHome = join(projectRoot, '.build-home');

function createBuildEnv() {
  const env = { ...process.env };

  if (process.platform !== 'win32') {
    return env;
  }

  const roamingDir = join(isolatedBuildHome, 'AppData', 'Roaming');
  const localDir = join(isolatedBuildHome, 'AppData', 'Local');
  const tempDir = join(isolatedBuildHome, 'Temp');
  const parsedRoot = parse(isolatedBuildHome).root;

  [isolatedBuildHome, roamingDir, localDir, tempDir].forEach((dirPath) => {
    mkdirSync(dirPath, { recursive: true });
  });

  env.HOME = isolatedBuildHome;
  env.USERPROFILE = isolatedBuildHome;
  env.HOMEDRIVE = parsedRoot.replace(/\\$/, '');
  env.HOMEPATH = isolatedBuildHome.replace(/^[A-Za-z]:/, '');
  env.APPDATA = roamingDir;
  env.LOCALAPPDATA = localDir;
  env.TEMP = tempDir;
  env.TMP = tempDir;

  return env;
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      env,
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

const env = createBuildEnv();
const nextCliPath = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

await runCommand(process.execPath, [nextCliPath, 'build'], env);
await runCommand(process.execPath, ['scripts/post-build.js'], env);
