const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const path = require('path');
const { fork } = require('child_process');
const { ensureDesktopDatabaseReady, getUserDataPaths } = require('./database-manager');
const { getStandaloneDir } = require('./app-runtime');
const { createUpdateManager } = require('./update-manager');

let mainWindow = null;
let nextServer = null;
let updateManager = null;
let renderRecoveryInProgress = false;
let applicationUrl = null;
let workerSchedulerTimer = null;
let workerTriggerInFlight = false;

const isDev = process.env.NODE_ENV === 'development';
const DEFAULT_PORT = Number(process.env.PORT || 23000);
const WINDOWS_RENDERER_MAX_OLD_SPACE_MB = 1024;
let serverPort = DEFAULT_PORT;
const WORKER_SCHEDULER_INTERVAL_MS = 8000;

const LEGACY_LOG_DIR = path.join(os.homedir(), 'ImagineThis', 'logs');
const DESKTOP_SETTINGS_FILE = 'desktop-settings.json';
const MAX_LOG_READ_BYTES = 256 * 1024;
let currentLogDir = null;
let currentLogFile = null;
let currentErrorLogFile = null;
let logStream = null;
let errorLogStream = null;

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDesktopSettingsPath() {
  const { configDir } = getUserDataPaths(app);
  ensureDirectory(configDir);
  return path.join(configDir, DESKTOP_SETTINGS_FILE);
}

function readDesktopSettings() {
  if (!app.isReady()) {
    return {};
  }

  const settingsPath = getDesktopSettingsPath();
  if (!fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeDesktopSettings(settings) {
  const settingsPath = getDesktopSettingsPath();
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

function getDefaultLogDir() {
  return LEGACY_LOG_DIR;
}

function resolveLogDir() {
  const settings = readDesktopSettings();
  if (typeof settings.logDirectory === 'string' && settings.logDirectory.trim()) {
    return path.resolve(settings.logDirectory.trim());
  }
  return getDefaultLogDir();
}

function getTodayLogPaths(logDir) {
  const date = new Date().toISOString().split('T')[0];
  return {
    appLogFile: path.join(logDir, `app-${date}.log`),
    errorLogFile: path.join(logDir, `error-${date}.log`),
  };
}

function initializeLogStreams(reason = 'startup') {
  const nextLogDir = resolveLogDir();
  ensureDirectory(nextLogDir);
  const { appLogFile, errorLogFile } = getTodayLogPaths(nextLogDir);

  logStream?.end();
  errorLogStream?.end();

  currentLogDir = nextLogDir;
  currentLogFile = appLogFile;
  currentErrorLogFile = errorLogFile;
  logStream = fs.createWriteStream(currentLogFile, { flags: 'a' });
  errorLogStream = fs.createWriteStream(currentErrorLogFile, { flags: 'a' });

  if (reason !== 'startup') {
    log(`Log directory switched to ${currentLogDir}`, 'INFO');
  }
}

function isPathInside(parentDir, targetPath) {
  const relativePath = path.relative(parentDir, targetPath);
  return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function sanitizeLogContent(content) {
  return content
    .replace(/(apiKey|api_key|secretKey|secret_key|token|authorization|accessKey|secretKey)(["'\s:=]+)([^"'\s,}]+)/gi, '$1$2***')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1***');
}

function readLogTail(fileName, maxBytes = MAX_LOG_READ_BYTES) {
  if (!currentLogDir) {
    return '';
  }

  const safeFileName = path.basename(fileName || '');
  if (!safeFileName.endsWith('.log')) {
    throw new Error('Only .log files can be read.');
  }

  const filePath = path.join(currentLogDir, safeFileName);
  if (!isPathInside(currentLogDir, filePath) || !fs.existsSync(filePath)) {
    return '';
  }

  const stats = fs.statSync(filePath);
  const bytesToRead = Math.min(Math.max(1, Number(maxBytes) || MAX_LOG_READ_BYTES), MAX_LOG_READ_BYTES, stats.size);
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytesToRead);
    fs.readSync(fd, buffer, 0, bytesToRead, stats.size - bytesToRead);
    return sanitizeLogContent(buffer.toString('utf8'));
  } finally {
    fs.closeSync(fd);
  }
}

function getLogInfo() {
  const settings = readDesktopSettings();
  return {
    directory: currentLogDir || resolveLogDir(),
    defaultDirectory: getDefaultLogDir(),
    isCustom: Boolean(settings.logDirectory),
    appLogFile: currentLogFile ? path.basename(currentLogFile) : null,
    errorLogFile: currentErrorLogFile ? path.basename(currentErrorLogFile) : null,
  };
}

function listLogFiles() {
  if (!currentLogDir || !fs.existsSync(currentLogDir)) {
    return [];
  }

  return fs
    .readdirSync(currentLogDir)
    .filter((fileName) => fileName.endsWith('.log'))
    .map((fileName) => {
      const filePath = path.join(currentLogDir, fileName);
      const stats = fs.statSync(filePath);
      return {
        name: fileName,
        sizeBytes: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      };
    })
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

initializeLogStreams();

function parseEnvFileContents(contents) {
  const parsed = {};
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t');

    if (key && process.env[key] === undefined) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function loadDesktopEnvironment() {
  const envCandidates = [
    path.join(__dirname, '..', '.env.production'),
    path.join(__dirname, '..', '.next', 'standalone', '.env.production'),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const parsed = parseEnvFileContents(fs.readFileSync(envPath, 'utf8'));
    Object.assign(process.env, parsed);
    return envPath;
  }

  return null;
}

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);

  try {
    logStream?.write(`${logMessage}\n`);
    if (level === 'ERROR' || level === 'WARN') {
      errorLogStream?.write(`${logMessage}\n`);
    }
  } catch (error) {
    console.error('Failed to write log file:', error);
  }
}

const loadedDesktopEnvPath = loadDesktopEnvironment();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusPageHtml({ title, message, accent = '#2563eb' }) {
  return `data:text/html;charset=utf-8,
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(160deg, #eff6ff 0%, #f8fafc 100%);
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
          .panel {
            width: min(560px, calc(100vw - 48px));
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid #dbeafe;
            border-radius: 18px;
            padding: 28px;
            box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
          }
          .badge {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            background: ${accent};
            color: white;
            font-size: 12px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          h2 {
            margin: 16px 0 12px;
            font-size: 24px;
          }
          p {
            margin: 0;
            color: #475569;
            line-height: 1.7;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        <div class="panel">
          <div class="badge">Imagine This</div>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
      </body>
    </html>`;
}

function showWindowStatusPage(title, message, accent) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.loadURL(getStatusPageHtml({ title, message, accent })).catch((error) => {
    log(`Failed to load status page: ${error.message}`, 'ERROR');
  });
}

function recoverMainWindow(reason) {
  if (!mainWindow || mainWindow.isDestroyed() || renderRecoveryInProgress) {
    return;
  }

  renderRecoveryInProgress = true;
  log(`Attempting renderer recovery after: ${reason}`, 'WARN');
  showWindowStatusPage('界面正在恢复', '检测到渲染进程异常，正在尝试重新加载应用。', '#f59e0b');

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed() || !applicationUrl) {
      renderRecoveryInProgress = false;
      return;
    }

    mainWindow.loadURL(applicationUrl)
      .catch((error) => {
        log(`Renderer recovery failed: ${error.message}`, 'ERROR');
      })
      .finally(() => {
        renderRecoveryInProgress = false;
      });
  }, 1200);
}

function createWindow() {
  log('Creating main window...');

  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#ffffff',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Imagine This',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      offscreen: false,
      backgroundThrottling: false,
      enableRemoteModule: false,
      webSecurity: true,
    },
  };

  mainWindow = new BrowserWindow(windowOptions);
  showWindowStatusPage('正在启动', '正在准备数据库和桌面服务，请稍候。', '#2563eb');

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log(`Failed to load URL: ${validatedURL}, ${errorCode} ${errorDescription}`, 'ERROR');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('Page loaded successfully');
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) {
      log(`Renderer console [${level}]: ${message}`, level >= 3 ? 'ERROR' : 'WARN');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer();

    tester.once('error', () => {
      resolve(false);
    });

    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });

    tester.listen(port, '0.0.0.0');
  });
}

async function resolveServerPort() {
  if (await isPortAvailable(DEFAULT_PORT)) {
    return DEFAULT_PORT;
  }

  const fallbackServer = net.createServer();

  return new Promise((resolve, reject) => {
    fallbackServer.once('error', reject);
    fallbackServer.listen(0, '0.0.0.0', () => {
      const address = fallbackServer.address();
      const fallbackPort = typeof address === 'object' && address ? address.port : DEFAULT_PORT;

      fallbackServer.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(fallbackPort);
      });
    });
  });
}

function getServerEnv() {
  const { userDataPath, dbPath } = getUserDataPaths(app);

  return {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(serverPort),
    HOSTNAME: '0.0.0.0',
    DATABASE_URL: `file:${dbPath}`,
    IMAGINE_THIS_DESKTOP: 'true',
    IMAGINE_THIS_USER_DATA_PATH: userDataPath,
    NEXTAUTH_URL: `http://localhost:${serverPort}`,
    NEXTAUTH_SECRET: 'electron-app-secret-key-min-32-characters-long',
  };
}

async function waitForServerReady() {
  const maxAttempts = 60;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const request = http.get(`http://localhost:${serverPort}/api/health`, (response) => {
          response.resume();
          response.on('end', resolve);
        });

        request.on('error', reject);
        request.setTimeout(800, () => {
          request.destroy(new Error('timeout'));
        });
      });

      return;
    } catch (error) {
      if (attempt % 10 === 0) {
        log(`Waiting for Next.js server... ${attempt}/${maxAttempts}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  throw new Error('Timed out while waiting for the desktop server to start.');
}

function startNextServer() {
  if (isDev) {
    applicationUrl = `http://localhost:${serverPort}`;
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const standaloneDir = getStandaloneDir(app);
    const serverScript = path.join(standaloneDir, 'server.js');

    log(`Standalone directory: ${standaloneDir}`);

    if (!fs.existsSync(standaloneDir)) {
      reject(new Error(`Next.js standalone directory not found: ${standaloneDir}`));
      return;
    }

    if (!fs.existsSync(serverScript)) {
      reject(new Error(`Standalone server.js not found: ${serverScript}`));
      return;
    }

    const env = getServerEnv();
    log(`Database path: ${env.DATABASE_URL}`);
    log(`Starting Next.js server: ${serverScript}`);

    nextServer = fork(serverScript, [], {
      cwd: standaloneDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    nextServer.stdout.on('data', (data) => {
      log(`[Next.js] ${data.toString().trim()}`);
    });

    nextServer.stderr.on('data', (data) => {
      log(`[Next.js ERROR] ${data.toString().trim()}`, 'ERROR');
    });

    nextServer.once('error', reject);
    nextServer.on('exit', (code, signal) => {
      stopWorkerScheduler();
      const level = code === 0 || signal === 'SIGTERM' ? 'INFO' : 'ERROR';
      log(`Next.js server exited with code ${code}, signal: ${signal}`, level);
    });

    waitForServerReady()
      .then(() => {
        applicationUrl = `http://localhost:${serverPort}`;
        resolve();
      })
      .catch(reject);
  });
}

async function warmupApi(endpoint, description) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const request = http.get(`http://localhost:${serverPort}${endpoint}`, (response) => {
      response.resume();
      response.on('end', () => {
        log(`[Warmup] ${description} completed in ${Date.now() - startedAt}ms`);
        resolve(true);
      });
    });

    request.on('error', (error) => {
      log(`[Warmup] ${description} failed: ${error.message}`, 'WARN');
      resolve(false);
    });

    request.setTimeout(2500, () => {
      request.destroy(new Error('timeout'));
    });
  });
}

async function warmupApplication() {
  if (isDev) {
    return;
  }

  await Promise.all([
    warmupApi('/api/health', 'Health check'),
    warmupApi('/api/tasks?limit=1', 'Task list'),
    warmupApi('/api/auth/session', 'Auth session'),
  ]);
}

function triggerBackgroundWorker(reason = 'manual') {
  if (!applicationUrl || workerTriggerInFlight) {
    return Promise.resolve(false);
  }

  workerTriggerInFlight = true;

  return new Promise((resolve) => {
    const payload = JSON.stringify({ batch: true });
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        path: '/api/tasks/worker',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          workerTriggerInFlight = false;
          if ((response.statusCode || 500) >= 200 && (response.statusCode || 500) < 300) {
            log(`[Worker Scheduler] Triggered (${reason}) with status ${response.statusCode}`);
            resolve(true);
            return;
          }

          log(
            `[Worker Scheduler] Trigger failed (${reason}): HTTP ${response.statusCode} ${responseBody.slice(0, 200)}`,
            'WARN'
          );
          resolve(false);
        });
      }
    );

    request.on('error', (error) => {
      workerTriggerInFlight = false;
      log(`[Worker Scheduler] Trigger failed (${reason}): ${error.message}`, 'WARN');
      resolve(false);
    });

    request.setTimeout(5000, () => {
      request.destroy(new Error('timeout'));
    });

    request.write(payload);
    request.end();
  });
}

function startWorkerScheduler() {
  if (workerSchedulerTimer) {
    return;
  }

  log(`Starting background worker scheduler (${WORKER_SCHEDULER_INTERVAL_MS}ms interval)...`);
  void triggerBackgroundWorker('startup');
  workerSchedulerTimer = setInterval(() => {
    void triggerBackgroundWorker('interval');
  }, WORKER_SCHEDULER_INTERVAL_MS);
}

function stopWorkerScheduler() {
  if (workerSchedulerTimer) {
    clearInterval(workerSchedulerTimer);
    workerSchedulerTimer = null;
  }
}

async function bootstrapApplication() {
  initializeLogStreams('app-ready');
  createWindow();

  updateManager = createUpdateManager({
    getMainWindow: () => mainWindow,
    log,
  });
  updateManager.initialize();

  try {
    serverPort = await resolveServerPort();
    if (serverPort !== DEFAULT_PORT) {
      log(`Default port ${DEFAULT_PORT} is busy, selected fallback port ${serverPort}`, 'WARN');
    }

    await ensureDesktopDatabaseReady(app, log);
    await startNextServer();
    startWorkerScheduler();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    await mainWindow.loadURL(applicationUrl);

    setTimeout(() => {
      warmupApplication().catch((error) => {
        log(`Warmup failed: ${error.message}`, 'WARN');
      });
    }, 1500);

    setTimeout(() => {
      updateManager?.checkForUpdates().catch((error) => {
        log(`Initial update check failed: ${error.message}`, 'WARN');
      });
    }, 5000);
  } catch (error) {
    log(`Failed to bootstrap application: ${error.message}`, 'ERROR');
    log(error.stack || 'No stack available', 'ERROR');
    showWindowStatusPage(
      '启动失败',
      `${error.message}\n\n日志文件: ${currentLogFile || getTodayLogPaths(resolveLogDir()).appLogFile}`,
      '#dc2626'
    );
  }
}

function cleanupServerProcess() {
  stopWorkerScheduler();
  logStream?.end();
  errorLogStream?.end();
  if (nextServer && !nextServer.killed) {
    log('Stopping Next.js child process...');
    nextServer.kill('SIGTERM');
  }
}

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'ERROR');
  log(error.stack || 'No stack available', 'ERROR');
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${String(reason)}`, 'ERROR');
});

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${WINDOWS_RENDERER_MAX_OLD_SPACE_MB}`);
}

log(`Application starting. isDev=${isDev} preferredPort=${DEFAULT_PORT}`);
log(`Platform=${process.platform} arch=${process.arch}`);
log(`App path=${app.getAppPath()}`);
log(`Resources path=${process.resourcesPath}`);
log(`User data path=${app.getPath('userData')}`);
log(
  loadedDesktopEnvPath
    ? `Desktop environment loaded from ${loadedDesktopEnvPath}`
    : 'Desktop environment file not found, using process environment only.'
);

app.whenReady().then(bootstrapApplication);

app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length > 0) {
    return;
  }

  createWindow();

  if (applicationUrl && mainWindow && !mainWindow.isDestroyed()) {
    try {
      await mainWindow.loadURL(applicationUrl);
    } catch (error) {
      log(`Failed to restore window on activate: ${error.message}`, 'ERROR');
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  updateManager?.dispose();
  cleanupServerProcess();
});

app.on('render-process-gone', (_event, webContents, details) => {
  log(`Render process gone: ${JSON.stringify(details)}`, 'ERROR');
  if (mainWindow && !mainWindow.isDestroyed() && webContents.id === mainWindow.webContents.id) {
    recoverMainWindow(details.reason || 'unknown');
  }
});

app.on('child-process-gone', (_event, details) => {
  log(`Child process gone: ${JSON.stringify(details)}`, 'ERROR');
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
  });
  return result.filePaths;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.filePaths;
});

ipcMain.handle('logs:get-info', async () => {
  return getLogInfo();
});

ipcMain.handle('logs:list-files', async () => {
  return listLogFiles();
});

ipcMain.handle('logs:read-tail', async (_event, payload = {}) => {
  const fileName = payload?.fileName || path.basename(currentErrorLogFile || currentLogFile || '');
  return {
    fileName,
    content: readLogTail(fileName, payload?.maxBytes),
  };
});

ipcMain.handle('logs:open-directory', async () => {
  ensureDirectory(currentLogDir || resolveLogDir());
  await shell.openPath(currentLogDir || resolveLogDir());
  return true;
});

ipcMain.handle('logs:choose-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return getLogInfo();
  }

  const settings = readDesktopSettings();
  settings.logDirectory = result.filePaths[0];
  writeDesktopSettings(settings);
  initializeLogStreams('directory-change');
  return getLogInfo();
});

ipcMain.handle('logs:reset-directory', async () => {
  const settings = readDesktopSettings();
  delete settings.logDirectory;
  writeDesktopSettings(settings);
  initializeLogStreams('directory-reset');
  return getLogInfo();
});

ipcMain.handle('updates:get-status', async () => {
  return updateManager?.getStatus() ?? null;
});

ipcMain.handle('updates:check', async () => {
  return updateManager?.checkForUpdates() ?? null;
});

ipcMain.handle('updates:restart-and-install', async () => {
  updateManager?.restartToInstall();
  return true;
});
