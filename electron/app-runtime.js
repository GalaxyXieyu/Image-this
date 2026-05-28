const fs = require('fs');
const path = require('path');

const EXTERNAL_DATA_DIR_NAME = 'ImagineThisData';
const DATA_ROOT_POINTER_FILE = 'data-root.json';
const MIGRATION_MARKER_FILE = '.appdata-migration.json';
const CRITICAL_MIGRATION_FILES = new Set([
  path.join('data', 'app.db'),
  path.join('data', 'app.db-wal'),
  path.join('data', 'app.db-shm'),
  path.join('data', 'app.db-journal'),
  path.join('config', 'desktop-secrets.json'),
  path.join('config', 'desktop-settings.json'),
]);

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

function getLegacyUserDataPath(app) {
  return app.getPath('userData');
}

function getPackagedExternalUserDataPath(app) {
  const platform = process.env.IMAGINE_THIS_PLATFORM_OVERRIDE || process.platform;
  if (platform !== 'win32' || !app.isPackaged) {
    return null;
  }

  const executableDir = path.dirname(app.getPath('exe'));
  return path.join(executableDir, EXTERNAL_DATA_DIR_NAME);
}

function resolveUserConfiguredDataRoot(app) {
  const pointerPath = path.join(getLegacyUserDataPath(app), DATA_ROOT_POINTER_FILE);
  if (!fs.existsSync(pointerPath)) {
    return null;
  }

  try {
    const pointer = JSON.parse(fs.readFileSync(pointerPath, 'utf8'));
    if (typeof pointer.dataRoot === 'string' && pointer.dataRoot.trim()) {
      return path.resolve(pointer.dataRoot.trim());
    }
  } catch {
    return null;
  }

  return null;
}

function canUseDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const probePath = path.join(dirPath, `.write-test-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probePath, 'ok');
    fs.rmSync(probePath, { force: true });
    return true;
  } catch {
    return false;
  }
}

function getPreferredUserDataPath(app) {
  const configuredDataRoot = resolveUserConfiguredDataRoot(app);
  if (configuredDataRoot && canUseDirectory(configuredDataRoot)) {
    return configuredDataRoot;
  }

  const externalPath = getPackagedExternalUserDataPath(app);
  if (externalPath && canUseDirectory(externalPath)) {
    return externalPath;
  }

  return getLegacyUserDataPath(app);
}

function getUserDataPaths(app) {
  const userDataPath = getPreferredUserDataPath(app);
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

function backupExistingTargetFile(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${targetPath}.pre-appdata-migration-${timestamp}.bak`;
  fs.copyFileSync(targetPath, backupPath);
  return backupPath;
}

function copyDirectoryContents(sourceDir, targetDir, log, relativeBase = '', options = {}) {
  if (!fs.existsSync(sourceDir)) {
    return { copied: 0, skipped: 0 };
  }

  fs.mkdirSync(targetDir, { recursive: true });
  let copied = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    const relativePath = path.join(relativeBase, entry.name);

    if (entry.isDirectory()) {
      const result = copyDirectoryContents(sourcePath, targetPath, log, relativePath, options);
      copied += result.copied;
      skipped += result.skipped;
      continue;
    }

    if (!entry.isFile()) {
      skipped += 1;
      continue;
    }

    const shouldOverwrite = options.overwriteCriticalFiles
      && CRITICAL_MIGRATION_FILES.has(relativePath);

    if (fs.existsSync(targetPath) && !shouldOverwrite) {
      skipped += 1;
      continue;
    }

    const backupPath = shouldOverwrite ? backupExistingTargetFile(targetPath) : null;
    fs.copyFileSync(sourcePath, targetPath);
    copied += 1;
    log?.(`Migrated user data file: ${relativePath}${backupPath ? ` (existing target backed up to ${backupPath})` : ''}`);
  }

  return { copied, skipped };
}

function ensureExternalUserDataMigrated(app, log) {
  const legacyUserDataPath = getLegacyUserDataPath(app);
  const configuredDataRoot = resolveUserConfiguredDataRoot(app);
  const externalUserDataPath = configuredDataRoot || getPackagedExternalUserDataPath(app);

  if (!externalUserDataPath || externalUserDataPath === legacyUserDataPath) {
    return {
      migrated: false,
      userDataPath: getPreferredUserDataPath(app),
      legacyUserDataPath,
      reason: 'external-user-data-not-enabled',
    };
  }

  if (!canUseDirectory(externalUserDataPath)) {
    log?.(`External user data path is not writable, falling back to AppData: ${externalUserDataPath}`, 'WARN');
    return {
      migrated: false,
      userDataPath: legacyUserDataPath,
      legacyUserDataPath,
      reason: 'external-user-data-not-writable',
    };
  }

  const markerPath = path.join(externalUserDataPath, MIGRATION_MARKER_FILE);
  let existingMarker = null;
  if (fs.existsSync(markerPath)) {
    try {
      existingMarker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch {
      existingMarker = null;
    }
  }

  if (existingMarker?.legacyUserDataPath === legacyUserDataPath) {
    return {
      migrated: false,
      userDataPath: externalUserDataPath,
      legacyUserDataPath,
      reason: 'already-migrated',
    };
  }

  const legacyDataDir = path.join(legacyUserDataPath, 'data');
  const legacyConfigDir = path.join(legacyUserDataPath, 'config');
  const externalDataDir = path.join(externalUserDataPath, 'data');
  const externalConfigDir = path.join(externalUserDataPath, 'config');

  const copyOptions = { overwriteCriticalFiles: true };
  const dataResult = copyDirectoryContents(legacyDataDir, externalDataDir, log, 'data', copyOptions);
  const configResult = copyDirectoryContents(legacyConfigDir, externalConfigDir, log, 'config', copyOptions);
  const marker = {
    migratedAt: new Date().toISOString(),
    legacyUserDataPath,
    userDataPath: externalUserDataPath,
    copied: dataResult.copied + configResult.copied,
    skipped: dataResult.skipped + configResult.skipped,
  };
  fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf8');

  log?.(
    `External user data migration finished: copied=${marker.copied}, skipped=${marker.skipped}, target=${externalUserDataPath}`
  );

  return {
    migrated: marker.copied > 0,
    userDataPath: externalUserDataPath,
    legacyUserDataPath,
    reason: 'migrated',
    copied: marker.copied,
    skipped: marker.skipped,
  };
}

module.exports = {
  DATA_ROOT_POINTER_FILE,
  getAppResourceRoot,
  getStandaloneDir,
  getPrismaDir,
  ensureExternalUserDataMigrated,
  getLegacyUserDataPath,
  getUserDataPaths,
};
