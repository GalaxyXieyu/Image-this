const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
let nextServer;
const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 23000;

// 日志文件路径 - 使用更明显的位置
const LOG_DIR = path.join(os.homedir(), 'ImagineThis', 'logs');
const LOG_FILE = path.join(LOG_DIR, `app-${new Date().toISOString().split('T')[0]}.log`);
const ERROR_LOG_FILE = path.join(LOG_DIR, `error-${new Date().toISOString().split('T')[0]}.log`);

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
    if (level === 'ERROR') {
      fs.appendFileSync(ERROR_LOG_FILE, logMessage + '\n');
    }
  } catch (e) {
    console.error('Failed to write log:', e);
  }
}

// 错误处理
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'ERROR');
  log(`Stack: ${error.stack}`, 'ERROR');
  try {
    fs.appendFileSync(ERROR_LOG_FILE, `Uncaught Exception: ${error.message}\nStack: ${error.stack}\n\n`);
  } catch (e) {
    // 忽略写入错误
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection: ${reason}`, 'ERROR');
  try {
    fs.appendFileSync(ERROR_LOG_FILE, `Unhandled Rejection: ${reason}\n\n`);
  } catch (e) {
    // 忽略写入错误
  }
});

// 记录系统信息
log(`Application starting... isDev: ${isDev}, PORT: ${PORT}`);
log(`Platform: ${process.platform}, Arch: ${process.arch}`);
log(`CPU Info: ${JSON.stringify(os.cpus()[0])}`);
log(`Memory: ${os.totalmem() / 1024 / 1024 / 1024} GB total`);
log(`App Path: ${app.getAppPath()}`);
log(`Resources Path: ${process.resourcesPath}`);
log(`User Data: ${app.getPath('userData')}`);
log(`Log file: ${LOG_FILE}`);
log(`Error log file: ${ERROR_LOG_FILE}`);

// Windows 性能优化：禁用可能导致启动慢的 GPU 功能
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  app.commandLine.appendSwitch('disable-software-rasterizer');
  // 减少 V8 内存占用，加快启动
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
  log('Windows GPU optimizations applied');
}

function createWindow() {
  try {
    log('Creating main window...');
    
    // AMD 处理器兼容性：添加额外的 GPU 配置
    const gpuSettings = {
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        // 添加硬件加速相关配置
        offscreen: false,
        backgroundThrottling: false,
        // 针对 AMD GPU 的兼容性设置
        enableRemoteModule: false,
        webSecurity: true,
      },
      // AMD 处理器可能需要禁用某些硬件加速
      webSecurity: true,
      sandbox: false,
      // 禁用可能导致问题的功能
      skipTaskbar: false,
    };

    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      ...gpuSettings,
      icon: path.join(__dirname, '../public/icon.png'),
      title: 'Imagine This - AI 图像处理平台',
      backgroundColor: '#ffffff',
      show: false,
    });

    // 显示加载页面，提升用户体验
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: linear-gradient(135deg, %236366f1 0%25, %238b5cf6 100%25);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .loader {
              text-align: center;
              color: white;
            }
            .spinner {
              width: 50px;
              height: 50px;
              border: 4px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%25;
              animation: spin 1s linear infinite;
              margin: 0 auto 20px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h2 { margin: 0 0 10px; font-weight: 500; }
            p { margin: 0; opacity: 0.8; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="loader">
            <div class="spinner"></div>
            <h2>Imagine This</h2>
            <p>正在启动服务...</p>
          </div>
        </body>
      </html>
    `);
    mainWindow.show();

    log('Main window created successfully');

    mainWindow.once('ready-to-show', () => {
      log('Window ready to show');
      mainWindow.show();
    });

    // 添加页面加载错误处理
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      log(`Failed to load URL: ${validatedURL}, Error: ${errorCode} - ${errorDescription}`, 'ERROR');
    });

    mainWindow.webContents.on('did-finish-load', () => {
      log('Page loaded successfully');
    });

    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level >= 2) { // WARN and ERROR
        log(`Renderer Console [${level}]: ${message}`, level >= 3 ? 'ERROR' : 'WARN');
      }
    });

    // 开发模式下直接加载 URL
    if (isDev) {
      const url = `http://localhost:${PORT}`;
      log(`Loading URL: ${url}`);
      mainWindow.loadURL(url);
      mainWindow.webContents.openDevTools();
      log('Dev tools opened');
    }
    // 生产模式下，URL 加载由 app.whenReady 处理

    mainWindow.on('closed', () => {
      log('Window closed');
      mainWindow = null;
    });

  } catch (error) {
    log(`Failed to create window: ${error.message}`, 'ERROR');
    log(`Stack: ${error.stack}`, 'ERROR');
    throw error;
  }
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      log('Development mode: Next.js server should already be running');
      setTimeout(resolve, 2000);
      return;
    }

    log('Starting Next.js server in production mode...');
    
    // 确定应用根目录
    let standaloneDir;
    
    if (app.isPackaged) {
      // 打包后的路径
      // 优先检查 asar 禁用的情况（resources/app）
      let appPath = path.join(process.resourcesPath, 'app');
      
      // 如果 asar 禁用的路径不存在，尝试 asar.unpacked 路径
      if (!fs.existsSync(appPath)) {
        appPath = path.join(process.resourcesPath, 'app.asar.unpacked');
        log(`Using asar.unpacked path: ${appPath}`);
      }
      
      // 如果两者都不存在，尝试 app.asar 解压路径（备用）
      if (!fs.existsSync(appPath)) {
        appPath = app.getAppPath();
        log(`Using app.getAppPath(): ${appPath}`);
      }
      
      standaloneDir = path.join(appPath, '.next', 'standalone');
      log(`Packaged mode, app path: ${appPath}`);
    } else {
      // 开发模式路径
      const appRoot = path.join(__dirname, '..');
      standaloneDir = path.join(appRoot, '.next', 'standalone');
      log(`Development mode, app root: ${appRoot}`);
    }
    
    log(`Standalone dir: ${standaloneDir}`);
    log(`Standalone dir exists: ${fs.existsSync(standaloneDir)}`);
    
    // 列出 standalone 目录内容
    if (fs.existsSync(standaloneDir)) {
      const contents = fs.readdirSync(standaloneDir);
      log(`Standalone contents: ${contents.join(', ')}`);
    }
    
    if (!fs.existsSync(standaloneDir)) {
      const error = new Error(`Next.js standalone directory not found: ${standaloneDir}`);
      log(error.message, 'ERROR');
      reject(error);
      return;
    }

    const serverScript = path.join(standaloneDir, 'server.js');
    
    if (!fs.existsSync(serverScript)) {
      const error = new Error(`Standalone server.js not found: ${serverScript}`);
      log(error.message, 'ERROR');
      reject(error);
      return;
    }

    // 设置数据库路径 - 使用用户数据目录
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'data', 'app.db');
    const dbDir = path.dirname(dbPath);
    
    // 确保数据库目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      log(`Created database directory: ${dbDir}`);
    }
    
    log(`Database path: ${dbPath}`);
    log(`User data path: ${userDataPath}`);

    // 使用 fork 启动 Next.js 服务器（子进程）
    const { fork } = require('child_process');
    
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: PORT.toString(),
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: `file:${dbPath}`,
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_SECRET: 'electron-app-secret-key-min-32-characters-long',
    };
    
    log(`Starting Next.js server with fork...`);
    log(`Server script: ${serverScript}`);
    log(`PORT: ${PORT}`);
    log(`DATABASE_URL: ${env.DATABASE_URL}`);

    nextServer = fork(serverScript, [], {
      cwd: standaloneDir,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    });

    nextServer.stdout.on('data', (data) => {
      log(`[Next.js] ${data.toString().trim()}`);
    });

    nextServer.stderr.on('data', (data) => {
      log(`[Next.js ERROR] ${data.toString().trim()}`, 'ERROR');
    });

    nextServer.on('error', (error) => {
      log(`Next.js server error: ${error.message}`, 'ERROR');
      reject(error);
    });

    nextServer.on('exit', (code, signal) => {
      log(`Next.js server exited with code ${code}, signal: ${signal}`, code === 0 ? 'INFO' : 'ERROR');
    });

    // 等待服务器启动 - 优化：更快的检查间隔
    const checkServer = async () => {
      const http = require('http');
      const maxAttempts = 60; // 最多等待 18 秒
      let attempts = 0;
      
      // 等待 300ms 让服务器有时间启动（减少初始等待）
      await new Promise(r => setTimeout(r, 300));
      
      while (attempts < maxAttempts) {
        try {
          await new Promise((res, rej) => {
            const req = http.get(`http://localhost:${PORT}`, (response) => {
              // 任何响应都表示服务器已启动
              res();
            });
            req.on('error', rej);
            req.setTimeout(500, () => {
              req.destroy();
              rej(new Error('Timeout'));
            });
          });
          log(`Next.js server is ready on port ${PORT}!`);
          resolve();
          return;
        } catch (e) {
          attempts++;
          if (attempts % 10 === 0) {
            log(`Waiting for server... attempt ${attempts}/${maxAttempts}`);
          }
          // 更短的检查间隔
          await new Promise(r => setTimeout(r, 300));
        }
      }
      
      // 即使超时也继续，服务器可能已经在启动中
      log('Server check timeout, continuing...', 'WARN');
      resolve();
    };
    
    checkServer();
  });
}

// 检查数据库是否损坏
function isDatabaseCorrupted(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return false; // 数据库不存在，不算损坏
  }
  
  try {
    // 尝试读取数据库文件头（SQLite 文件头是 "SQLite format 3"）
    const fd = fs.openSync(dbPath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    const header = buffer.toString('utf8', 0, 15);
    if (!header.startsWith('SQLite format')) {
      log('Database header is invalid', 'WARN');
      return true;
    }
    
    // 检查文件大小（太小可能损坏）
    const stats = fs.statSync(dbPath);
    if (stats.size < 1024) {
      log('Database file is too small', 'WARN');
      return true;
    }
    
    return false;
  } catch (error) {
    log(`Error checking database: ${error.message}`, 'WARN');
    return true; // 无法读取，可能损坏
  }
}

// 备份损坏的数据库
function backupCorruptedDatabase(dbPath) {
  try {
    const backupDir = path.join(path.dirname(dbPath), 'corrupted-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `app-corrupted-${timestamp}.db`);
    
    fs.copyFileSync(dbPath, backupPath);
    log(`Corrupted database backed up to: ${backupPath}`);
    return backupPath;
  } catch (error) {
    log(`Failed to backup corrupted database: ${error.message}`, 'ERROR');
    return null;
  }
}

// 初始化数据库
async function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'data', 'app.db');
  const dbDir = path.dirname(dbPath);
  
  log(`Initializing database at: ${dbPath}`);
  
  // 确保数据库目录存在
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    log(`Created database directory: ${dbDir}`);
  }
  
  // 检查数据库是否损坏
  if (fs.existsSync(dbPath) && isDatabaseCorrupted(dbPath)) {
    log('Database is corrupted, attempting to repair...', 'WARN');
    
    // 备份损坏的数据库
    backupCorruptedDatabase(dbPath);
    
    // 删除损坏的数据库文件
    try {
      fs.unlinkSync(dbPath);
      log('Corrupted database deleted');
      
      // 删除相关的 WAL 和 SHM 文件
      const walPath = `${dbPath}-wal`;
      const shmPath = `${dbPath}-shm`;
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
        log('Deleted WAL file');
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
        log('Deleted SHM file');
      }
    } catch (error) {
      log(`Failed to delete corrupted database: ${error.message}`, 'ERROR');
      throw new Error('无法删除损坏的数据库文件，请手动删除后重试');
    }
  }
  
  // 如果数据库不存在，从模板复制或创建
  if (!fs.existsSync(dbPath)) {
    log('Database does not exist, checking for template...');
    
    // 查找模板数据库
    let templateDbPath;
    if (app.isPackaged) {
      // 优先检查 asar 禁用的情况
      let appPath = path.join(process.resourcesPath, 'app');
      if (!fs.existsSync(appPath)) {
        appPath = path.join(process.resourcesPath, 'app.asar.unpacked');
      }
      if (!fs.existsSync(appPath)) {
        appPath = app.getAppPath();
      }
      templateDbPath = path.join(appPath, 'prisma', 'app.db');
      log(`Template database path: ${templateDbPath}`);
    } else {
      templateDbPath = path.join(__dirname, '..', 'prisma', 'app.db');
    }
    
    if (fs.existsSync(templateDbPath)) {
      log(`Copying template database from: ${templateDbPath}`);
      fs.copyFileSync(templateDbPath, dbPath);
      log('Database template copied successfully');
    } else {
      log('No template database found, will be created on first API call');
    }
  } else {
    log('Database exists and is valid');
  }
  
  return dbPath;
}

// 预热单个 API
function warmupAPI(endpoint, description) {
  const http = require('http');
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const req = http.get(`http://localhost:${PORT}${endpoint}`, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        const duration = Date.now() - startTime;
        log(`[Warmup] ${description} completed in ${duration}ms`);
        resolve(true);
      });
    });
    
    req.on('error', (e) => {
      log(`[Warmup] ${description} failed: ${e.message}`, 'WARN');
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      log(`[Warmup] ${description} timeout`, 'WARN');
      req.destroy();
      resolve(false);
    });
  });
}

// 并行预热所有常用 API - 大幅提升首次加载速度
async function warmupDatabase() {
  log('Starting parallel API warmup...');
  const startTime = Date.now();
  
  // 并行预热多个 API，触发 Prisma 连接和查询缓存
  const warmupPromises = [
    warmupAPI('/api/health', 'Database connection'),
    warmupAPI('/api/tasks?limit=1', 'Task list query'),
    warmupAPI('/api/auth/session', 'Auth session'),
  ];
  
  await Promise.all(warmupPromises);
  
  const totalDuration = Date.now() - startTime;
  log(`All warmup completed in ${totalDuration}ms`);
}

app.whenReady().then(async () => {
  log('App ready, starting initialization...');
  
  // 立即创建窗口显示加载界面
  createWindow();
  
  try {
    // 初始化数据库
    await initDatabase();
    
    // 启动 Next.js 服务器
    await startNextServer();
    log('Next.js server started, loading app...');
    
    // 预热数据库连接（调用 health API 触发 Prisma 连接）
    await warmupDatabase();
    
    // 加载实际应用
    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url);
    
  } catch (error) {
    log(`Failed to start application: ${error.message}`, 'ERROR');
    log(`Error stack: ${error.stack}`, 'ERROR');
    
    // 在窗口中显示错误
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: %23fee2e2;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .error {
              text-align: center;
              color: %23991b1b;
              max-width: 500px;
              padding: 20px;
            }
            h2 { margin: 0 0 15px; }
            p { margin: 0 0 10px; font-size: 14px; }
            .path { font-size: 12px; background: white; padding: 10px; border-radius: 5px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>启动失败</h2>
            <p>${error.message.replace(/'/g, "\\'")}</p>
            <p class="path">日志文件: ${LOG_FILE.replace(/\\/g, '/')}</p>
          </div>
        </body>
      </html>
    `);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log('Application quitting, cleaning up...');
  // 关闭 Next.js 子进程
  if (nextServer && !nextServer.killed) {
    log('Killing Next.js server process...');
    nextServer.kill('SIGTERM');
  }
});

// 添加额外的错误处理
app.on('render-process-gone', (event, webContents, details) => {
  log(`Render process gone: ${JSON.stringify(details)}`, 'ERROR');
});

app.on('child-process-gone', (event, details) => {
  log(`Child process gone: ${JSON.stringify(details)}`, 'ERROR');
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths;
});
