import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const SECRET_STORE_FILE = 'desktop-secrets.json';

export type SecretKey =
  | 'volcengineAccessKey'
  | 'volcengineSecretKey'
  | 'gptApiKey'
  | 'geminiApiKey'
  | 'arkApiKey'
  | 'superbedToken';

type SecretRecord = Partial<Record<SecretKey, string>>;
type SecretStore = Record<string, SecretRecord>;

function isDesktopRuntime() {
  return process.env.IMAGINE_THIS_DESKTOP === 'true';
}

function getDesktopUserDataPath() {
  return process.env.IMAGINE_THIS_USER_DATA_PATH || '';
}

function getSecretStorePath() {
  const userDataPath = getDesktopUserDataPath();
  if (!userDataPath) {
    return null;
  }

  const configDir = path.join(userDataPath, 'config');
  fs.mkdirSync(configDir, { recursive: true });
  return path.join(configDir, SECRET_STORE_FILE);
}

function readSecretStore(): SecretStore {
  const storePath = getSecretStorePath();
  if (!storePath || !fs.existsSync(storePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8')) as SecretStore;
  } catch (error) {
    console.error('[secret-store] Failed to read store:', error);
    return {};
  }
}

function writeSecretStore(store: SecretStore) {
  const storePath = getSecretStorePath();
  if (!storePath) {
    return;
  }

  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function encryptWindowsSecret(secret: string) {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$secure = ConvertTo-SecureString -String $env:IMAGINE_THIS_SECRET -AsPlainText -Force; ' +
        '$encrypted = ConvertFrom-SecureString -SecureString $secure; ' +
        '[Console]::Out.Write($encrypted)'
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        IMAGINE_THIS_SECRET: secret,
      },
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to encrypt desktop secret');
  }

  return result.stdout.trim();
}

function decryptWindowsSecret(encryptedSecret: string) {
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$secure = ConvertTo-SecureString -String $env:IMAGINE_THIS_SECRET; ' +
        '$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); ' +
        'try { [Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)) } ' +
        'finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }'
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        IMAGINE_THIS_SECRET: encryptedSecret,
      },
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to decrypt desktop secret');
  }

  return result.stdout;
}

function encryptSecret(secret: string) {
  if (process.platform === 'win32') {
    return encryptWindowsSecret(secret);
  }

  return Buffer.from(secret, 'utf8').toString('base64');
}

function decryptSecret(secret: string) {
  if (process.platform === 'win32') {
    return decryptWindowsSecret(secret);
  }

  return Buffer.from(secret, 'base64').toString('utf8');
}

export function isDesktopSecretStoreEnabled() {
  return isDesktopRuntime() && !!getDesktopUserDataPath();
}

export async function getStoredSecrets(userId: string): Promise<SecretRecord> {
  if (!isDesktopSecretStoreEnabled()) {
    return {};
  }

  const store = readSecretStore();
  const encryptedSecrets = store[userId] || {};
  const decryptedEntries = Object.entries(encryptedSecrets).map(([key, value]) => {
    if (!value) {
      return [key, ''];
    }

    try {
      return [key, decryptSecret(value)];
    } catch (error) {
      console.error(`[secret-store] Failed to decrypt ${key} for ${userId}:`, error);
      return [key, ''];
    }
  });

  return Object.fromEntries(decryptedEntries) as SecretRecord;
}

export async function setStoredSecrets(userId: string, secrets: SecretRecord) {
  if (!isDesktopSecretStoreEnabled()) {
    return;
  }

  const store = readSecretStore();
  const currentSecrets = store[userId] || {};
  const nextSecrets: SecretRecord = { ...currentSecrets };

  for (const [key, value] of Object.entries(secrets) as Array<[SecretKey, string | undefined]>) {
    if (!value) {
      delete nextSecrets[key];
      continue;
    }

    nextSecrets[key] = encryptSecret(value);
  }

  store[userId] = nextSecrets;
  writeSecretStore(store);
}

export async function clearStoredSecrets(userId: string, keys?: SecretKey[]) {
  if (!isDesktopSecretStoreEnabled()) {
    return;
  }

  const store = readSecretStore();
  if (!store[userId]) {
    return;
  }

  if (!keys || keys.length === 0) {
    delete store[userId];
  } else {
    for (const key of keys) {
      delete store[userId][key];
    }

    if (Object.keys(store[userId]).length === 0) {
      delete store[userId];
    }
  }

  writeSecretStore(store);
}
