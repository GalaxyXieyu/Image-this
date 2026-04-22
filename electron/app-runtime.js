const fs = require('fs');
const path = require('path');

function getAppResourceRoot(app) {
  if (!app.isPackaged) {
    return path.join(__dirname, '..');
  }

  let appPath = path.join(process.resourcesPath, 'app');
  if (!fs.existsSync(appPath)) {
    appPath = path.join(process.resourcesPath, 'app.asar.unpacked');
  }
  if (!fs.existsSync(appPath)) {
    appPath = app.getAppPath();
  }
  return appPath;
}

function getStandaloneDir(app) {
  return path.join(getAppResourceRoot(app), '.next', 'standalone');
}

function getPrismaDir(app) {
  return path.join(getAppResourceRoot(app), 'prisma');
}

function getUserDataPaths(app) {
  const userDataPath = app.getPath('userData');
  const dataDir = path.join(userDataPath, 'data');
  const configDir = path.join(userDataPath, 'config');
  const dbPath = path.join(dataDir, 'app.db');
  const backupDir = path.join(dataDir, 'backups');

  return {
    userDataPath,
    dataDir,
    configDir,
    dbPath,
    backupDir,
  };
}

module.exports = {
  getAppResourceRoot,
  getStandaloneDir,
  getPrismaDir,
  getUserDataPaths,
};
