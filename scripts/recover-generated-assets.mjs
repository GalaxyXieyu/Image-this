#!/usr/bin/env node

import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'recovered-assets');
const DEFAULT_DESKTOP_ROOT = path.join(os.homedir(), 'ImagineThis');
const RECOVERABLE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.mp4',
  '.webm',
  '.mov',
]);
const MIME_TO_EXTENSION = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

function parseArgs(argv) {
  const options = {
    db: process.env.DATABASE_URL?.startsWith('file:')
      ? process.env.DATABASE_URL.slice('file:'.length)
      : '',
    out: DEFAULT_OUTPUT_DIR,
    ids: new Set(),
    desktopRoot: DEFAULT_DESKTOP_ROOT,
    includeOriginals: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--db' && next) {
      options.db = next;
      index += 1;
    } else if (arg === '--out' && next) {
      options.out = next;
      index += 1;
    } else if (arg === '--ids' && next) {
      for (const id of next.split(',').map((item) => item.trim()).filter(Boolean)) {
        options.ids.add(id);
      }
      index += 1;
    } else if (arg === '--ids-file' && next) {
      const contents = fs.readFileSync(next, 'utf8');
      for (const id of contents.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean)) {
        options.ids.add(id);
      }
      index += 1;
    } else if (arg === '--desktop-root' && next) {
      options.desktopRoot = next;
      index += 1;
    } else if (arg === '--include-originals') {
      options.includeOriginals = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.db) {
    throw new Error('Missing --db. Example: --db "C:\\Users\\MyPC\\AppData\\Roaming\\imagine-this-nextjs\\data\\app.db"');
  }

  options.db = path.resolve(options.db);
  options.out = path.resolve(options.out);
  options.desktopRoot = path.resolve(options.desktopRoot);
  return options;
}

function printHelp() {
  console.log(`
Recover generated image/video files from ImagineThis SQLite records.

Usage:
  node scripts/recover-generated-assets.mjs --db <app.db> --out <dir>

Options:
  --db <path>             SQLite database path.
  --out <dir>             Output directory. Default: ./recovered-assets
  --ids <id,id>           Only recover matching task IDs or processed image IDs.
  --ids-file <path>       Read task/image IDs from a newline or comma separated file.
  --desktop-root <path>   Base path for /api/files URLs. Default: ~/ImagineThis
  --include-originals     Also recover originalUrl files when possible.
  --dry-run               Print what would be recovered without writing files.
`);
}

function safeJsonParse(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function collectUrlsFromObject(value, urls = []) {
  if (!value) {
    return urls;
  }

  if (typeof value === 'string') {
    if (
      value.startsWith('http://')
      || value.startsWith('https://')
      || value.startsWith('data:')
      || value.startsWith('/api/files/')
      || value.startsWith('/uploads/')
      || path.isAbsolute(value)
    ) {
      urls.push(value);
    }
    return urls;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUrlsFromObject(item, urls);
    }
    return urls;
  }

  if (typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectUrlsFromObject(item, urls);
    }
  }

  return urls;
}

function inferExtension(source, contentType = '') {
  const mimeType = contentType.split(';')[0].trim().toLowerCase();
  if (MIME_TO_EXTENSION[mimeType]) {
    return MIME_TO_EXTENSION[mimeType];
  }

  if (source.startsWith('data:')) {
    const match = source.match(/^data:([^;,]+)/);
    const dataMimeType = match?.[1]?.toLowerCase();
    return MIME_TO_EXTENSION[dataMimeType] || '.bin';
  }

  try {
    const parsed = source.startsWith('http') ? new URL(source) : null;
    const ext = path.extname(parsed ? parsed.pathname : source).toLowerCase();
    return ext || '.bin';
  } catch {
    const ext = path.extname(source).toLowerCase();
    return ext || '.bin';
  }
}

function sanitizeFilenamePart(value) {
  return String(value || 'unknown')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

function resolveLocalSource(source, options) {
  if (source.startsWith('/api/files/')) {
    return path.join(options.desktopRoot, source.slice('/api/files/'.length));
  }

  if (source.startsWith('/uploads/')) {
    return path.join(options.desktopRoot, source.slice(1));
  }

  if (path.isAbsolute(source)) {
    return source;
  }

  return null;
}

async function readSource(source, options) {
  if (source.startsWith('data:')) {
    const match = source.match(/^data:([^;,]+)?;base64,(.+)$/s);
    if (!match) {
      throw new Error('Unsupported data URL format');
    }
    return {
      buffer: Buffer.from(match[2], 'base64'),
      contentType: match[1] || '',
      sourceType: 'data-url',
    };
  }

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') || '',
      sourceType: 'remote-url',
    };
  }

  const localPath = resolveLocalSource(source, options);
  if (!localPath) {
    throw new Error('Unsupported local URL/path');
  }

  return {
    buffer: await fsp.readFile(localPath),
    contentType: '',
    sourceType: 'local-file',
  };
}

function buildCandidates(row, options) {
  const candidates = [];
  const metadata = safeJsonParse(row.metadata);
  const taskOutput = safeJsonParse(row.taskOutputData);
  const taskInput = safeJsonParse(row.taskInputData);

  if (row.processedUrl) {
    candidates.push({ kind: 'processed', source: row.processedUrl });
  }

  for (const url of collectUrlsFromObject(taskOutput)) {
    candidates.push({ kind: 'task-output', source: url });
  }

  for (const url of collectUrlsFromObject(metadata)) {
    candidates.push({ kind: 'metadata', source: url });
  }

  if (options.includeOriginals && row.originalUrl) {
    candidates.push({ kind: 'original', source: row.originalUrl });
  }

  if (options.includeOriginals) {
    for (const url of collectUrlsFromObject(taskInput)) {
      candidates.push({ kind: 'task-input', source: url });
    }
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate.source || seen.has(candidate.source)) {
      return false;
    }
    seen.add(candidate.source);
    return true;
  });
}

function getRows(database, options) {
  const idFilterEnabled = options.ids.size > 0;
  const rows = database.prepare(`
    SELECT
      pi.id AS processedImageId,
      pi.filename,
      pi.originalUrl,
      pi.processedUrl,
      pi.metadata,
      pi.processType,
      pi.status AS imageStatus,
      tq.id AS taskId,
      tq.type AS taskType,
      tq.status AS taskStatus,
      tq.inputData AS taskInputData,
      tq.outputData AS taskOutputData
    FROM processed_images pi
    LEFT JOIN task_queue tq ON tq.processedImageId = pi.id
    WHERE pi.status = 'COMPLETED'
    ORDER BY pi.createdAt ASC
  `).all();

  if (!idFilterEnabled) {
    return rows;
  }

  return rows.filter((row) => options.ids.has(row.processedImageId) || options.ids.has(row.taskId));
}

async function recoverRow(row, options, stats, reportRows) {
  const candidates = buildCandidates(row, options);
  const baseName = sanitizeFilenamePart(
    row.filename
      || `${row.taskType || row.processType || 'image'}-${row.processedImageId}`
  );

  for (const candidate of candidates) {
    try {
      const result = await readSource(candidate.source, options);
      const extension = inferExtension(candidate.source, result.contentType);
      if (extension !== '.bin' && !RECOVERABLE_EXTENSIONS.has(extension)) {
        reportRows.push({ row, status: 'skipped-unsupported-extension', source: candidate.source });
        continue;
      }

      const fileName = `${sanitizeFilenamePart(row.processedImageId)}-${baseName}${extension}`;
      const outputPath = path.join(options.out, fileName);

      if (!options.dryRun) {
        await fsp.mkdir(options.out, { recursive: true });
        await fsp.writeFile(outputPath, result.buffer);
      }

      stats.recovered += 1;
      reportRows.push({
        row,
        status: options.dryRun ? 'dry-run-recoverable' : 'recovered',
        source: candidate.source,
        outputPath,
        sourceType: result.sourceType,
        bytes: result.buffer.byteLength,
      });
      return;
    } catch (error) {
      reportRows.push({
        row,
        status: 'candidate-failed',
        source: candidate.source,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  stats.failed += 1;
  reportRows.push({
    row,
    status: 'unrecoverable',
    source: '',
    error: candidates.length === 0 ? 'No source URL/path found in database row' : 'All candidates failed',
  });
}

async function writeReport(options, reportRows) {
  if (options.dryRun) {
    return;
  }

  await fsp.mkdir(options.out, { recursive: true });
  const reportPath = path.join(options.out, 'recovery-report.json');
  const report = reportRows.map((item) => ({
    status: item.status,
    processedImageId: item.row.processedImageId,
    taskId: item.row.taskId,
    taskType: item.row.taskType,
    filename: item.row.filename,
    source: item.source,
    outputPath: item.outputPath,
    sourceType: item.sourceType,
    bytes: item.bytes,
    error: item.error,
  }));

  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report written: ${reportPath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(options.db)) {
    throw new Error(`Database does not exist: ${options.db}`);
  }

  const database = new DatabaseSync(options.db, { readOnly: true });
  const stats = { total: 0, recovered: 0, failed: 0 };
  const reportRows = [];

  try {
    const rows = getRows(database, options);
    stats.total = rows.length;

    for (const row of rows) {
      await recoverRow(row, options, stats, reportRows);
    }
  } finally {
    database.close();
  }

  await writeReport(options, reportRows);

  console.log(`Scanned: ${stats.total}`);
  console.log(`${options.dryRun ? 'Recoverable' : 'Recovered'}: ${stats.recovered}`);
  console.log(`Unrecoverable: ${stats.failed}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
