const path = require('path');
const { app, dialog } = require('electron');
const { getStandaloneDir } = require('./app-runtime');

function loadAutoUpdater() {
  const standaloneDir = getStandaloneDir(app);
  const updaterModulePath = path.join(standaloneDir, 'node_modules', 'electron-updater');
  // eslint-disable-next-line global-require, import/no-dynamic-require
  return require(updaterModulePath);
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, '');
}

function createUpdateManager({ getMainWindow, log }) {
  const defaultFeedUrl = 'https://github.com/GalaxyXieyu/Image-this/releases/latest/download';
  const isPortableBuild = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
  const state = {
    supported: process.platform === 'win32' && app.isPackaged && !isPortableBuild,
    enabled: false,
    status: 'idle',
    currentVersion: app.getVersion(),
    targetVersion: null,
    progress: 0,
    message: '',
    installMode: null,
    feedUrl: '',
    error: null,
    downloadedFileName: null,
  };

  let autoUpdater = null;
  let initialized = false;
  let checkTimer = null;
  let downloadPromptShownForVersion = null;

  function sendStatus() {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('desktop-update-status', state);
    }
  }

  function updateState(patch) {
    Object.assign(state, patch);
    sendStatus();
  }

  function getFeedUrl() {
    const configuredFeedUrl = process.env.DESKTOP_UPDATE_FEED_URL;
    if (configuredFeedUrl) {
      return normalizeBaseUrl(configuredFeedUrl);
    }

    const configuredBaseUrl = process.env.DESKTOP_UPDATE_BASE_URL;
    if (configuredBaseUrl) {
      return `${normalizeBaseUrl(configuredBaseUrl)}/api/desktop-updates/windows`;
    }

    return defaultFeedUrl;
  }

  function schedulePeriodicChecks() {
    if (checkTimer || !state.enabled) {
      return;
    }

    checkTimer = setInterval(() => {
      checkForUpdates().catch((error) => {
        log(`Periodic update check failed: ${error.message}`, 'WARN');
      });
    }, 6 * 60 * 60 * 1000);
  }

  function initialize() {
    if (initialized) {
      return state.enabled;
    }

    initialized = true;

    if (!state.supported) {
      updateState({
        enabled: false,
        status: app.isPackaged ? 'unsupported' : 'disabled',
        message: isPortableBuild
          ? 'Portable builds use manual updates only.'
          : app.isPackaged
            ? 'Automatic updates are only enabled for Windows installer builds.'
            : 'Automatic updates are disabled in development mode.',
      });
      return false;
    }

    try {
      state.feedUrl = getFeedUrl();
      if (!state.feedUrl) {
        updateState({
          enabled: false,
          status: 'disabled',
          message: 'Automatic updates are not configured for this build.',
          error: null,
        });
        return false;
      }

      ({ autoUpdater } = loadAutoUpdater());
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = false;
      autoUpdater.disableWebInstaller = true;
      autoUpdater.setFeedURL({
        provider: 'generic',
        url: state.feedUrl,
      });

      autoUpdater.on('checking-for-update', () => {
        log('Checking for desktop updates...');
        updateState({
          enabled: true,
          status: 'checking',
          progress: 0,
          message: 'Checking for updates...',
          error: null,
        });
      });

      autoUpdater.on('update-available', (info) => {
        log(`Update available: ${info.version}`);
        updateState({
          enabled: true,
          status: 'available',
          targetVersion: info.version,
          progress: 0,
          message: `Version ${info.version} is downloading in the background.`,
          error: null,
        });
      });

      autoUpdater.on('update-not-available', () => {
        log('No desktop update available');
        updateState({
          enabled: true,
          status: 'not-available',
          targetVersion: null,
          progress: 100,
          message: 'You are already on the latest version.',
          error: null,
        });
      });

      autoUpdater.on('download-progress', (progress) => {
        updateState({
          enabled: true,
          status: 'downloading',
          progress: progress.percent,
          message: `Downloading update... ${Math.round(progress.percent)}%`,
          error: null,
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        log(`Update downloaded: ${info.version}`);
        updateState({
          enabled: true,
          status: 'downloaded',
          targetVersion: info.version,
          progress: 100,
          message: '更新已下载，可以立即重启安装，或退出应用时自动安装。',
          error: null,
          downloadedFileName: info.files?.[0]?.url || null,
        });
        promptForDownloadedUpdate(info).catch((error) => {
          log(`Failed to show update prompt: ${error.message}`, 'WARN');
        });
      });

      autoUpdater.on('error', (error) => {
        log(`Desktop update error: ${error.message}`, 'ERROR');
        updateState({
          enabled: true,
          status: 'error',
          message: error.message,
          error: error.message,
        });
      });

      updateState({
        enabled: true,
        status: 'idle',
        message: 'Automatic updates enabled.',
      });

      schedulePeriodicChecks();
      return true;
    } catch (error) {
      log(`Failed to initialize desktop updater: ${error.message}`, 'ERROR');
      updateState({
        enabled: false,
        status: 'error',
        message: error.message,
        error: error.message,
      });
      return false;
    }
  }

  async function checkForUpdates() {
    if (!initialize() || !autoUpdater) {
      return state;
    }

    await autoUpdater.checkForUpdates();
    return state;
  }

  async function promptForDownloadedUpdate(info) {
    if (downloadPromptShownForVersion === info.version) {
      return;
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    downloadPromptShownForVersion = info.version;
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已下载',
      message: `ImagineThis ${info.version} 已准备好`,
      detail: '可以现在重启完成安装，也可以选择退出应用时自动安装。',
      buttons: ['立即重启安装', '退出应用时安装', '稍后'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
    });

    if (result.response === 0) {
      restartToInstall();
      return;
    }

    if (result.response === 1) {
      installOnQuit();
    }
  }

  function installOnQuit() {
    if (autoUpdater && state.status === 'downloaded') {
      autoUpdater.autoInstallOnAppQuit = true;
      updateState({
        installMode: 'on-quit',
        message: '更新将在退出应用时自动安装，下次启动即为新版本。',
      });
      return true;
    }

    return false;
  }

  function restartToInstall() {
    if (autoUpdater && state.status === 'downloaded') {
      autoUpdater.quitAndInstall(false, true);
      return true;
    }

    return false;
  }

  function getStatus() {
    return { ...state };
  }

  function dispose() {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }

  return {
    initialize,
    checkForUpdates,
    restartToInstall,
    installOnQuit,
    getStatus,
    dispose,
  };
}

module.exports = {
  createUpdateManager,
};
