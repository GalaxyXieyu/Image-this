const path = require('path');
const { app } = require('electron');
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
  const isPortableBuild = Boolean(process.env.PORTABLE_EXECUTABLE_DIR);
  const state = {
    supported: process.platform === 'win32' && app.isPackaged && !isPortableBuild,
    enabled: false,
    status: 'idle',
    currentVersion: app.getVersion(),
    targetVersion: null,
    progress: 0,
    message: '',
    feedUrl: '',
    error: null,
    downloadedFileName: null,
  };

  let autoUpdater = null;
  let initialized = false;
  let checkTimer = null;

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
    const configuredBaseUrl = process.env.DESKTOP_UPDATE_BASE_URL;
    if (!configuredBaseUrl) {
      return '';
    }
    return `${normalizeBaseUrl(configuredBaseUrl)}/api/desktop-updates/windows`;
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
          message: 'Update downloaded. Restart to install.',
          error: null,
          downloadedFileName: info.files?.[0]?.url || null,
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

  function restartToInstall() {
    if (autoUpdater && state.status === 'downloaded') {
      autoUpdater.quitAndInstall(false, true);
    }
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
    getStatus,
    dispose,
  };
}

module.exports = {
  createUpdateManager,
};
