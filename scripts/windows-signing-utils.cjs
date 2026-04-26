const { spawn } = require('child_process');
const { existsSync, readdirSync, statSync } = require('fs');
const path = require('path');

const DEFAULT_TIMESTAMP_URL = 'http://timestamp.digicert.com';
const SIGNABLE_EXTENSIONS = new Set(['.exe', '.dll', '.node']);

function getWindowsSigningConfig(env = process.env) {
  return {
    toolPath: env.WINDOWS_SIGN_TOOL_PATH || null,
    certPath: env.WINDOWS_SIGN_CERT_PATH || null,
    certPassword: env.WINDOWS_SIGN_CERT_PASSWORD || null,
    certSha1: env.WINDOWS_SIGN_CERT_SHA1 || null,
    certSubjectName: env.WINDOWS_SIGN_CERT_SUBJECT || null,
    timestampUrl: env.WINDOWS_SIGN_TIMESTAMP_URL || DEFAULT_TIMESTAMP_URL,
    fileDigest: env.WINDOWS_SIGN_FILE_DIGEST || 'sha256',
    timestampDigest: env.WINDOWS_SIGN_TIMESTAMP_DIGEST || 'sha256',
    description: env.WINDOWS_SIGN_DESCRIPTION || 'ImagineThis',
    url: env.WINDOWS_SIGN_URL || 'https://bojie.store',
  };
}

function hasWindowsSigningConfig(env = process.env) {
  const config = getWindowsSigningConfig(env);

  return Boolean(config.certPath || config.certSha1 || config.certSubjectName);
}

function resolveSigntoolPath(toolPath) {
  if (toolPath) {
    if (!existsSync(toolPath)) {
      throw new Error(`Configured signtool was not found: ${toolPath}`);
    }

    return Promise.resolve(toolPath);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('where.exe', ['signtool'], {
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || 'signtool.exe was not found in PATH. Set WINDOWS_SIGN_TOOL_PATH explicitly.'
          )
        );
        return;
      }

      const firstPath = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      if (!firstPath) {
        reject(new Error('signtool.exe lookup returned no usable path.'));
        return;
      }

      resolve(firstPath);
    });

    child.on('error', reject);
  });
}

function getSignCommandArgs(config, targetPath) {
  const args = [
    'sign',
    '/fd',
    config.fileDigest,
    '/td',
    config.timestampDigest,
    '/tr',
    config.timestampUrl,
    '/d',
    config.description,
    '/du',
    config.url,
  ];

  if (config.certPath) {
    args.push('/f', config.certPath);

    if (config.certPassword) {
      args.push('/p', config.certPassword);
    }
  }

  if (config.certSha1) {
    args.push('/sha1', config.certSha1);
  }

  if (config.certSubjectName) {
    args.push('/n', config.certSubjectName);
  }

  if (!config.certSha1 && !config.certSubjectName) {
    args.push('/a');
  }

  args.push(targetPath);

  return args;
}

function spawnAndWait(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${command}`));
      }
    });

    child.on('error', reject);
  });
}

async function signFile(targetPath, env = process.env) {
  const config = getWindowsSigningConfig(env);

  if (!hasWindowsSigningConfig(env)) {
    return false;
  }

  const signtoolPath = await resolveSigntoolPath(config.toolPath);
  const args = getSignCommandArgs(config, targetPath);
  await spawnAndWait(signtoolPath, args);
  return true;
}

async function signFiles(targetPaths, env = process.env) {
  if (!hasWindowsSigningConfig(env)) {
    return [];
  }

  const signedPaths = [];

  for (const targetPath of targetPaths) {
    await signFile(targetPath, env);
    signedPaths.push(targetPath);
  }

  return signedPaths;
}

function collectSignableFiles(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(rootDir)) {
    const fullPath = path.join(rootDir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectSignableFiles(fullPath));
      continue;
    }

    if (SIGNABLE_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

module.exports = {
  collectSignableFiles,
  getWindowsSigningConfig,
  hasWindowsSigningConfig,
  resolveSigntoolPath,
  signFile,
  signFiles,
};
