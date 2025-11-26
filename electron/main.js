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
    mainWindow.loadURL(`data:text/html,
      <html>
        <head>
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
      // 打包后的路径 - .next 目录被解包到 app.asar.unpacked
      const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');
      standaloneDir = path.join(unpackedPath, '.next', 'standalone');
      log(`Packaged mode, unpacked path: ${unpackedPath}`);
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

    // 等待服务器启动 - 优化：减少检查间隔，更快响应
    const checkServer = async () => {
      const http = require('http');
      const maxAttempts = 30; // 最多等待 15 秒
      let attempts = 0;
      
      // 等待 1 秒让服务器有时间启动
      await new Promise(r => setTimeout(r, 1000));
      
      while (attempts < maxAttempts) {
        try {
          await new Promise((res, rej) => {
            const req = http.get(`http://localhost:${PORT}`, (response) => {
              // 任何响应都表示服务器已启动
              res();
            });
            req.on('error', rej);
            req.setTimeout(1000, () => {
              req.destroy();
              rej(new Error('Timeout'));
            });
          });
          log(`Next.js server is ready on port ${PORT}!`);
          resolve();
          return;
        } catch (e) {
          attempts++;
          if (attempts % 5 === 0) {
            log(`Waiting for server... attempt ${attempts}/${maxAttempts}`);
          }
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      // 即使超时也继续，服务器可能已经在启动中
      log('Server check timeout, continuing...', 'WARN');
      resolve();
    };
    
    checkServer();
  });
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
  
  // 如果数据库不存在，从模板复制或创建
  if (!fs.existsSync(dbPath)) {
    log('Database does not exist, checking for template...');
    
    // 查找模板数据库
    let templateDbPath;
    if (app.isPackaged) {
      const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked');
      templateDbPath = path.join(unpackedPath, 'prisma', 'app.db');
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
    log('Database exists');
  }
  
  return dbPath;
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
    
    // 加载实际应用
    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url);
    
  } catch (error) {
    log(`Failed to start application: ${error.message}`, 'ERROR');
    log(`Error stack: ${error.stack}`, 'ERROR');
    
    // 在窗口中显示错误
    mainWindow.loadURL(`data:text/html,
      <html>
        <head>
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
