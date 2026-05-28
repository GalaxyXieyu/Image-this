#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DATA_URL_PATTERN = /data:[^;,]+;base64,[A-Za-z0-9+/=\r\n]+/gi;
const STRIPPED_DATA_URL = '[stripped-data-url]';

const TEXT_COLUMNS = [
  { table: 'processed_images', idColumn: 'id', columns: ['originalUrl', 'processedUrl', 'thumbnailUrl', 'metadata', 'qualityReview'] },
  { table: 'task_queue', idColumn: 'id', columns: ['inputData', 'outputData', 'errorMessage'] },
];

function parseArgs(argv) {
  const options = {
    db: process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL.slice('file:'.length)
      : '',
    apply: false,
    noBackup: false,
    vacuum: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--db' && next) {
      options.db = next;
      index += 1;
    } else if (arg === '--apply') {
      options.apply = true;
    } else if (arg === '--no-backup') {
      options.noBackup = true;
    } else if (arg === '--no-vacuum') {
      options.vacuum = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.db) {
    throw new Error('Missing --db. Example: node scripts/compact-sqlite-payloads.mjs --db app.db --apply');
  }

  options.db = path.resolve(options.db);
  return options;
}

function printHelp() {
  console.log(`
Strip base64 data URLs from ImagineThis SQLite text columns and optionally VACUUM.

Usage:
  node scripts/compact-sqlite-payloads.mjs --db <app.db>
  node scripts/compact-sqlite-payloads.mjs --db <app.db> --apply

Options:
  --db <path>      SQLite database path.
  --apply          Write changes. Without this, runs a dry-run report only.
  --no-backup      Do not create a .bak copy before applying.
  --no-vacuum      Skip VACUUM after applying.
`);
}

function backupDatabase(dbPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.payload-cleanup-${timestamp}.bak`;
  fs.copyFileSync(dbPath, backupPath);
  return backupPath;
}

function stripDataUrls(value) {
  if (typeof value !== 'string' || !value.includes('data:')) {
    return { value, removed: 0, bytesSaved: 0 };
  }

  let removed = 0;
  let bytesSaved = 0;
  const nextValue = value.replace(DATA_URL_PATTERN, (match) => {
    removed += 1;
    bytesSaved += Buffer.byteLength(match) - Buffer.byteLength(STRIPPED_DATA_URL);
    return STRIPPED_DATA_URL;
  });

  return { value: nextValue, removed, bytesSaved };
}

function scanAndClean(database, options) {
  const stats = {
    scannedRows: 0,
    changedRows: 0,
    changedCells: 0,
    removedDataUrls: 0,
    estimatedBytesSaved: 0,
  };

  for (const spec of TEXT_COLUMNS) {
    const selectColumns = [spec.idColumn, ...spec.columns].map((column) => `"${column}"`).join(', ');
    const rows = database.prepare(`SELECT ${selectColumns} FROM "${spec.table}"`).all();
    const updateStatements = new Map();

    for (const row of rows) {
      stats.scannedRows += 1;
      const updates = {};

      for (const column of spec.columns) {
        const original = row[column];
        const result = stripDataUrls(original);
        if (result.removed === 0) {
          continue;
        }

        updates[column] = result.value;
        stats.changedCells += 1;
        stats.removedDataUrls += result.removed;
        stats.estimatedBytesSaved += Math.max(0, result.bytesSaved);
      }

      const updateColumns = Object.keys(updates);
      if (updateColumns.length === 0) {
        continue;
      }

      stats.changedRows += 1;
      if (!options.apply) {
        continue;
      }

      const statementKey = updateColumns.join(',');
      let statement = updateStatements.get(statementKey);
      if (!statement) {
        statement = database.prepare(
          `UPDATE "${spec.table}" SET ${updateColumns.map((column) => `"${column}" = ?`).join(', ')} WHERE "${spec.idColumn}" = ?`
        );
        updateStatements.set(statementKey, statement);
      }
      statement.run(...updateColumns.map((column) => updates[column]), row[spec.idColumn]);
    }
  }

  return stats;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.db)) {
    throw new Error(`Database does not exist: ${options.db}`);
  }

  const beforeSize = fs.statSync(options.db).size;
  let backupPath = '';
  if (options.apply && !options.noBackup) {
    backupPath = backupDatabase(options.db);
  }

  const database = new DatabaseSync(options.db);
  let stats;
  try {
    if (options.apply) {
      database.exec('BEGIN');
      try {
        stats = scanAndClean(database, options);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    } else {
      stats = scanAndClean(database, options);
    }

    if (options.apply && options.vacuum) {
      database.exec('VACUUM');
    }
  } finally {
    database.close();
  }

  const afterSize = fs.statSync(options.db).size;
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log(`Database: ${options.db}`);
  if (backupPath) {
    console.log(`Backup: ${backupPath}`);
  }
  console.log(`Rows scanned: ${stats.scannedRows}`);
  console.log(`Rows changed: ${stats.changedRows}`);
  console.log(`Cells changed: ${stats.changedCells}`);
  console.log(`Data URLs stripped: ${stats.removedDataUrls}`);
  console.log(`Estimated payload bytes saved: ${stats.estimatedBytesSaved}`);
  console.log(`Database size before: ${beforeSize}`);
  console.log(`Database size after: ${afterSize}`);
}

main();

