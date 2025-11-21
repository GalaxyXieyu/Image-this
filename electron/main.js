const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextServer;
const isDev = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 23000;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Imagine This - AI 图像处理平台',
    backgroundColor: '#ffffff',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL(`http://localhost:${PORT}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      console.log('Development mode: Next.js server should already be running');
      setTimeout(resolve, 2000);
      return;
    }

    const nextBin = path.join(process.resourcesPath, 'app/node_modules/.bin/next');
    const args = ['start', '-p', PORT.toString()];

    nextServer = spawn(nextBin, args, {
      cwd: path.join(process.resourcesPath, 'app'),
      env: { ...process.env, NODE_ENV: 'production' },
    });

    nextServer.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`Next.js: ${output}`);
      
      if (output.includes('Ready') || output.includes('started server')) {
        resolve();
      }
    });

    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js Error: ${data}`);
    });

    nextServer.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    nextServer.on('close', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });

    setTimeout(resolve, 5000);
  });
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    dialog.showErrorBox('启动失败', '无法启动应用服务,请检查日志');
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (nextServer) {
    nextServer.kill();
  }
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
