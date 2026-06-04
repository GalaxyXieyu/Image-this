const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { ensureExternalUserDataMigrated, getPrismaDir, getUserDataPaths, getLegacyUserDataPath } = require('./app-runtime');

const REQUIRED_TABLES = [
  'users',
  'accounts',
  'sessions',
  'verificationtokens',
  'task_queue',
];

const SECRET_STORE_FILE = 'desktop-secrets.json';
const SECRET_KEYS = [
  'volcengineAccessKey',
  'volcengineSecretKey',
  'gptApiKey',
  'geminiApiKey',
  'arkApiKey',
  'superbedToken',
];
const USER_COLUMN_PATCHES = [
  {
    name: 'gptModelName',
    sql: `ALTER TABLE "users" ADD COLUMN "gptModelName" TEXT`,
  },
  {
    name: 'jimengBaseUrl',
    sql: `ALTER TABLE "users" ADD COLUMN "jimengBaseUrl" TEXT`,
  },
  {
    name: 'jimengModelName',
    sql: `ALTER TABLE "users" ADD COLUMN "jimengModelName" TEXT`,
  },
  {
    name: 'hasJimengCredentials',
    sql: `ALTER TABLE "users" ADD COLUMN "hasJimengCredentials" BOOLEAN NOT NULL DEFAULT false`,
  },
  {
    name: 'taskConcurrency',
    sql: `ALTER TABLE "users" ADD COLUMN "taskConcurrency" INTEGER NOT NULL DEFAULT 2`,
  },
];
const MAX_DATABASE_BACKUPS_PER_PREFIX = 5;

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getSecretStorePath(app) {
  const { configDir } = getUserDataPaths(app);
  ensureDirectory(configDir);
  return path.join(configDir, SECRET_STORE_FILE);
}

function readSecretStore(app) {
  const secretStorePath = getSecretStorePath(app);
  if (!fs.existsSync(secretStorePath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(secretStorePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeSecretStore(app, store) {
  const secretStorePath = getSecretStorePath(app);
  fs.writeFileSync(secretStorePath, JSON.stringify(store, null, 2), 'utf8');
}

function encryptSecret(secret) {
  if (process.platform !== 'win32') {
    return Buffer.from(secret, 'utf8').toString('base64');
  }

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
    throw new Error(result.stderr || 'Failed to encrypt secret');
  }

  return result.stdout.trim();
}

function getMigrationFiles(app) {
  const migrationRoot = path.join(getPrismaDir(app), 'migrations');
  if (!fs.existsSync(migrationRoot)) {
    return [];
  }

  return fs
    .readdirSync(migrationRoot)
    .map((name) => ({
      name,
      filePath: path.join(migrationRoot, name, 'migration.sql'),
    }))
    .filter((item) => fs.existsSync(item.filePath))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function ensureMigrationTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS desktop_migrations (
      name TEXT NOT NULL PRIMARY KEY,
      checksum TEXT,
      appliedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function hasRequiredDatabaseSchema(database) {
  const statement = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'");
  const rows = statement.all();
  const existingTables = new Set(rows.map((row) => row.name));
  return REQUIRED_TABLES.every((tableName) => existingTables.has(tableName));
}

function checksum(text) {
  return require('crypto').createHash('sha256').update(text).digest('hex');
}

function markMigrationApplied(database, migrationName, migrationSql) {
  const insert = database.prepare(`
    INSERT OR REPLACE INTO desktop_migrations (name, checksum, appliedAt)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `);
  insert.run(migrationName, checksum(migrationSql));
}

function backupDatabase(dbPath, backupDir, prefix) {
  ensureDirectory(backupDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `${prefix}-${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function pruneDatabaseBackups(backupDir, prefix, log) {
  if (!fs.existsSync(backupDir)) {
    return;
  }

  const backupFiles = fs
    .readdirSync(backupDir)
    .filter((name) => name.startsWith(`${prefix}-`) && name.endsWith('.db'))
    .map((name) => {
      const filePath = path.join(backupDir, name);
      return {
        filePath,
        mtimeMs: fs.statSync(filePath).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  for (const backup of backupFiles.slice(MAX_DATABASE_BACKUPS_PER_PREFIX)) {
    fs.rmSync(backup.filePath, { force: true });
    log(`Pruned old database backup: ${backup.filePath}`);
  }
}

function getPendingSqlMigrations(app, database, log) {
  ensureMigrationTable(database);
  const migrationFiles = getMigrationFiles(app);
  if (migrationFiles.length === 0) {
    return [];
  }

  const appliedRows = database.prepare('SELECT name FROM desktop_migrations').all();
  const appliedNames = new Set(appliedRows.map((row) => row.name));

  if (appliedNames.size === 0 && hasRequiredDatabaseSchema(database)) {
    const baseline = migrationFiles[0];
    const baselineSql = fs.readFileSync(baseline.filePath, 'utf8');
    markMigrationApplied(database, baseline.name, baselineSql);
    appliedNames.add(baseline.name);
    log(`Marked existing database baseline as applied: ${baseline.name}`);
  }

  const pendingMigrations = [];
  for (const migration of migrationFiles) {
    if (appliedNames.has(migration.name)) {
      continue;
    }

    const migrationSql = fs.readFileSync(migration.filePath, 'utf8');
    if (isMigrationAlreadySatisfied(database, migrationSql)) {
      markMigrationApplied(database, migration.name, migrationSql);
      appliedNames.add(migration.name);
      log(`Marked already-satisfied desktop migration as applied: ${migration.name}`);
      continue;
    }

    pendingMigrations.push({
      ...migration,
      sql: migrationSql,
    });
  }

  return pendingMigrations;
}

function toSqliteBoolean(value) {
  return value ? 1 : 0;
}

function isDatabaseCorrupted(dbPath) {
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const fd = fs.openSync(dbPath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    const header = buffer.toString('utf8', 0, 15);
    return !header.startsWith('SQLite format');
  } catch {
    return true;
  }
}

function removeDatabaseSidecars(dbPath) {
  for (const filePath of [`${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`]) {
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function restoreDatabaseFromTemplate(app, dbPath, log) {
  const templateDbPath = path.join(getPrismaDir(app), 'app.db');
  if (!fs.existsSync(templateDbPath)) {
    throw new Error(`Template database path does not exist: ${templateDbPath}`);
  }

  fs.copyFileSync(templateDbPath, dbPath);
  log(`Database restored from template: ${templateDbPath}`);
}

function runSqlMigrations(app, dbPath, log) {
  const database = new DatabaseSync(dbPath);

  try {
    const migrationFiles = getMigrationFiles(app);
    if (migrationFiles.length === 0) {
      log('No SQL migrations found, skipping desktop migration step');
      return;
    }

    const pendingMigrations = getPendingSqlMigrations(app, database, log);
    if (pendingMigrations.length === 0) {
      log('No pending SQL migrations found, skipping desktop migration step');
      return;
    }

    for (const migration of pendingMigrations) {
      log(`Applying desktop migration: ${migration.name}`);
      database.exec('BEGIN');
      try {
        database.exec(migration.sql);
        markMigrationApplied(database, migration.name, migration.sql);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    }
  } finally {
    database.close();
  }
}

function isMigrationAlreadySatisfied(database, migrationSql) {
  const addColumnStatements = migrationSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map(parseAddColumnStatement);

  if (addColumnStatements.length === 0 || addColumnStatements.some((statement) => !statement)) {
    return false;
  }

  return addColumnStatements.every(({ tableName, columnName }) => {
    const existingColumns = new Set(
      database
        .prepare(`PRAGMA table_info("${tableName.replace(/"/g, '""')}")`)
        .all()
        .map((column) => column.name)
    );

    return existingColumns.has(columnName);
  });
}

function parseAddColumnStatement(statement) {
  const matched = statement.match(
    /^ALTER\s+TABLE\s+"?([^"\s]+)"?\s+ADD\s+COLUMN\s+"?([^"\s]+)"?/i
  );

  if (!matched) {
    return null;
  }

  return {
    tableName: matched[1],
    columnName: matched[2],
  };
}

function migrateLegacySecrets(app, dbPath, log) {
  const database = new DatabaseSync(dbPath);

  try {
    const columns = new Set(
      database
        .prepare("PRAGMA table_info('users')")
        .all()
        .map((column) => column.name)
    );

    const hasLegacyColumns = SECRET_KEYS.every((key) => columns.has(key))
      && columns.has('hasVolcengineCredentials')
      && columns.has('hasGptApiKey')
      && columns.has('hasGeminiApiKey')
      && columns.has('hasArkApiKey')
      && columns.has('hasSuperbedToken');

    if (!hasLegacyColumns) {
      return;
    }

    const users = database.prepare(`
      SELECT
        id,
        volcengineAccessKey,
        volcengineSecretKey,
        gptApiKey,
        geminiApiKey,
        arkApiKey,
        superbedToken,
        hasVolcengineCredentials,
        hasGptApiKey,
        hasGeminiApiKey,
        hasArkApiKey,
        hasSuperbedToken
      FROM users
    `).all();

    if (users.length === 0) {
      return;
    }

    const store = readSecretStore(app);
    let migratedCount = 0;

    for (const user of users) {
      const encryptedSecrets = {};

      if (user.volcengineAccessKey) {
        encryptedSecrets.volcengineAccessKey = encryptSecret(user.volcengineAccessKey);
      }
      if (user.volcengineSecretKey) {
        encryptedSecrets.volcengineSecretKey = encryptSecret(user.volcengineSecretKey);
      }
      if (user.gptApiKey) {
        encryptedSecrets.gptApiKey = encryptSecret(user.gptApiKey);
      }
      if (user.geminiApiKey) {
        encryptedSecrets.geminiApiKey = encryptSecret(user.geminiApiKey);
      }
      if (user.arkApiKey) {
        encryptedSecrets.arkApiKey = encryptSecret(user.arkApiKey);
      }
      if (user.superbedToken) {
        encryptedSecrets.superbedToken = encryptSecret(user.superbedToken);
      }

      if (Object.keys(encryptedSecrets).length === 0) {
        continue;
      }

      store[user.id] = {
        ...(store[user.id] || {}),
        ...encryptedSecrets,
      };

      database.prepare(`
        UPDATE users
        SET
          volcengineAccessKey = NULL,
          volcengineSecretKey = NULL,
          gptApiKey = NULL,
          geminiApiKey = NULL,
          arkApiKey = NULL,
          superbedToken = NULL,
          hasVolcengineCredentials = ?,
          hasGptApiKey = ?,
          hasGeminiApiKey = ?,
          hasArkApiKey = ?,
          hasSuperbedToken = ?
        WHERE id = ?
      `).run(
        toSqliteBoolean(user.volcengineAccessKey && user.volcengineSecretKey),
        toSqliteBoolean(user.gptApiKey),
        toSqliteBoolean(user.geminiApiKey),
        toSqliteBoolean(user.arkApiKey),
        toSqliteBoolean(user.superbedToken),
        user.id
      );

      migratedCount += 1;
    }

    if (migratedCount > 0) {
      writeSecretStore(app, store);
      log(`Migrated ${migratedCount} legacy user secret record(s) to desktop secret store`);
    }
  } finally {
    database.close();
  }
}

function patchUserSchemaColumns(dbPath, log) {
  const database = new DatabaseSync(dbPath);

  try {
    const existingColumns = new Set(
      database
        .prepare("PRAGMA table_info('users')")
        .all()
        .map((column) => column.name)
    );

    for (const patch of USER_COLUMN_PATCHES) {
      if (existingColumns.has(patch.name)) {
        continue;
      }

      database.exec(patch.sql);
      log(`Patched users table with missing column: ${patch.name}`);
    }
  } finally {
    database.close();
  }
}

function applyDesktopPragmas(dbPath, log) {
  const database = new DatabaseSync(dbPath);

  try {
    const journalMode = database.prepare('PRAGMA journal_mode = WAL').get();
    database.exec('PRAGMA synchronous = NORMAL');
    database.exec('PRAGMA temp_store = MEMORY');
    database.exec('PRAGMA foreign_keys = ON');
    log(`Applied desktop SQLite pragmas (journal_mode=${journalMode?.journal_mode || 'WAL'})`);
  } finally {
    database.close();
  }
}

function hasPendingSqlMigrations(app, dbPath, log) {
  const database = new DatabaseSync(dbPath);

  try {
    return getPendingSqlMigrations(app, database, log).length > 0;
  } finally {
    database.close();
  }
}

async function ensureDesktopDatabaseReady(app, log) {
  const migrationResult = ensureExternalUserDataMigrated(app, log);
  if (migrationResult.reason === 'external-user-data-not-writable') {
    log(`Using legacy AppData path because external data path is not writable: ${migrationResult.userDataPath}`, 'WARN');
  } else if (migrationResult.reason === 'already-migrated') {
    log(`Using external user data path: ${migrationResult.userDataPath}`);
  }

  const { dataDir, configDir, dbPath, backupDir } = getUserDataPaths(app);
  ensureDirectory(dataDir);
  ensureDirectory(configDir);
  ensureDirectory(backupDir);
  pruneDatabaseBackups(backupDir, 'pre-migration', log);
  pruneDatabaseBackups(backupDir, 'corrupted', log);

  log(`Initializing database at: ${dbPath}`);

  if (fs.existsSync(dbPath) && isDatabaseCorrupted(dbPath)) {
    const corruptedBackup = backupDatabase(dbPath, backupDir, 'corrupted');
    log(`Database was corrupted, backup created at: ${corruptedBackup}`, 'WARN');
    fs.rmSync(dbPath, { force: true });
    removeDatabaseSidecars(dbPath);
  }

  if (!fs.existsSync(dbPath)) {
    log('Database does not exist, restoring from template...');
    restoreDatabaseFromTemplate(app, dbPath, log);
  } else if (hasPendingSqlMigrations(app, dbPath, log)) {
    const migrationBackup = backupDatabase(dbPath, backupDir, 'pre-migration');
    log(`Created pre-migration backup: ${migrationBackup}`);
  } else {
    log('Database is already up to date, skipping pre-migration backup');
  }

  runSqlMigrations(app, dbPath, log);
  patchUserSchemaColumns(dbPath, log);
  migrateLegacySecrets(app, dbPath, log);
  applyDesktopPragmas(dbPath, log);

  return dbPath;
}

module.exports = {
  ensureDesktopDatabaseReady,
  getLegacyUserDataPath,
  getUserDataPaths,
};
