#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const HOST = 'visual.volcengineapi.com';
const REGION = 'cn-north-1';
const SERVICE = 'cv';
const VERSION = '2022-08-31';
const DEFAULT_PROMPT = '扩展图像，保持主体、光线、材质和背景风格一致，自然延伸画面，专业摄影，高质量。';
const SUPPORTED_INPUTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs(argv) {
  const options = {
    input: 'toapis-downloads/2026-05-27',
    output: 'volcengine-outpaint/2026-05-27',
    prompt: DEFAULT_PROMPT,
    top: 0.15,
    bottom: 0.15,
    left: 0.15,
    right: 0.15,
    maxWidth: 2048,
    maxHeight: 2048,
    concurrency: 2,
    limit: 0,
    skipExisting: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--input' && next) {
      options.input = next;
      index += 1;
    } else if (arg === '--output' && next) {
      options.output = next;
      index += 1;
    } else if (arg === '--prompt' && next) {
      options.prompt = next;
      index += 1;
    } else if (arg === '--top' && next) {
      options.top = Number(next);
      index += 1;
    } else if (arg === '--bottom' && next) {
      options.bottom = Number(next);
      index += 1;
    } else if (arg === '--left' && next) {
      options.left = Number(next);
      index += 1;
    } else if (arg === '--right' && next) {
      options.right = Number(next);
      index += 1;
    } else if (arg === '--max-width' && next) {
      options.maxWidth = Number(next);
      index += 1;
    } else if (arg === '--max-height' && next) {
      options.maxHeight = Number(next);
      index += 1;
    } else if (arg === '--concurrency' && next) {
      options.concurrency = Number(next);
      index += 1;
    } else if (arg === '--limit' && next) {
      options.limit = Number(next);
      index += 1;
    } else if (arg === '--overwrite') {
      options.skipExisting = false;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  options.input = path.resolve(options.input);
  options.output = path.resolve(options.output);
  options.concurrency = Math.max(1, Math.min(8, options.concurrency || 1));
  return options;
}

function printHelp() {
  console.log(`
Batch outpaint images with Volcengine CVProcess i2i_outpainting.

Usage:
  VOLCENGINE_ACCESS_KEY=... VOLCENGINE_SECRET_KEY=... \\
    node scripts/batch-volcengine-outpaint.mjs --input toapis-downloads/2026-05-27 --output volcengine-outpaint/2026-05-27

Options:
  --input <dir>          Input image directory. Default: toapis-downloads/2026-05-27
  --output <dir>         Output directory. Default: volcengine-outpaint/2026-05-27
  --prompt <text>        Outpaint prompt.
  --top <n>              Expand ratio top. Default: 0.15
  --bottom <n>           Expand ratio bottom. Default: 0.15
  --left <n>             Expand ratio left. Default: 0.15
  --right <n>            Expand ratio right. Default: 0.15
  --max-width <px>       Max output width. Default: 2048
  --max-height <px>      Max output height. Default: 2048
  --concurrency <n>      Parallel requests. Default: 2
  --limit <n>            Process first n files only.
  --overwrite            Reprocess existing outputs.
`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = sign(Buffer.from(secretKey, 'utf-8'), dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  return sign(kService, 'request');
}

function generateVolcengineSignature(method, requestPath, query, headers, body, timestamp, secretKey, accessKey) {
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = `${sortedHeaders
    .map((key) => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n')}\n`;
  const signedHeaders = sortedHeaders.map((key) => key.toLowerCase()).join(';');
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonicalRequest = [method, requestPath, query, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
  const date = timestamp.substring(0, 8);
  const credentialScope = `${date}/${REGION}/${SERVICE}/request`;
  const stringToSign = ['HMAC-SHA256', timestamp, credentialScope, hashedCanonicalRequest].join('\n');
  const signingKey = getSignatureKey(secretKey, date, REGION, SERVICE);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function generateVolcengineHeaders(body, accessKey, secretKey) {
  const timestamp = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '').replace('Z', '') + 'Z';
  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
  const headers = {
    'Content-Type': 'application/json',
    Host: HOST,
    'X-Date': timestamp,
    'X-Content-Sha256': payloadHash,
  };
  const query = `Action=CVProcess&Version=${VERSION}`;
  headers.Authorization = generateVolcengineSignature('POST', '/', query, headers, body, timestamp, secretKey, accessKey);
  return headers;
}

async function normalizeImageToBase64(filePath) {
  const buffer = await sharp(filePath)
    .rotate()
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 95, mozjpeg: true })
    .toBuffer();
  return buffer.toString('base64');
}

async function outpaintImage(filePath, options, credentials) {
  const imageBase64 = await normalizeImageToBase64(filePath);
  const requestBody = {
    req_key: 'i2i_outpainting',
    custom_prompt: options.prompt,
    binary_data_base64: [imageBase64],
    scale: 7.0,
    seed: -1,
    steps: 30,
    strength: 0.8,
    top: options.top,
    bottom: options.bottom,
    left: options.left,
    right: options.right,
    max_height: options.maxHeight,
    max_width: options.maxWidth,
  };
  const body = JSON.stringify(requestBody);
  const headers = generateVolcengineHeaders(body, credentials.accessKey, credentials.secretKey);
  const url = `https://${HOST}/?Action=CVProcess&Version=${VERSION}`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });
  const result = await response.json();

  if (!response.ok || result.code !== 10000) {
    throw new Error(`Volcengine outpaint failed: http=${response.status}, code=${result.code}, message=${result.message || 'Unknown'}`);
  }

  const outputBase64 = result.data?.binary_data_base64?.[0];
  if (!outputBase64) {
    throw new Error('Volcengine outpaint returned no binary_data_base64');
  }

  return {
    buffer: Buffer.from(outputBase64, 'base64'),
    timeElapsed: result.data?.time_elapsed || result.time_elapsed || null,
  };
}

async function listInputFiles(inputDir) {
  const entries = await fsp.readdir(inputDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_INPUTS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(inputDir, entry.name))
    .sort();
}

function outputPathFor(inputPath, outputDir) {
  const parsed = path.parse(inputPath);
  return path.join(outputDir, `${parsed.name}-outpaint.jpg`);
}

async function runWorker(workerId, queue, options, credentials, report, counters) {
  while (queue.length > 0) {
    const inputPath = queue.shift();
    if (!inputPath) {
      return;
    }

    const outputPath = outputPathFor(inputPath, options.output);
    const startedAt = Date.now();

    try {
      if (options.skipExisting && fs.existsSync(outputPath)) {
        counters.skipped += 1;
        report.push({ status: 'skipped-existing', inputPath, outputPath });
        continue;
      }

      const result = await outpaintImage(inputPath, options, credentials);
      await fsp.writeFile(outputPath, result.buffer);
      counters.completed += 1;
      report.push({
        status: 'completed',
        inputPath,
        outputPath,
        bytes: result.buffer.length,
        timeElapsed: result.timeElapsed,
        durationMs: Date.now() - startedAt,
      });
      console.log(`[${workerId}] completed ${counters.completed}/${counters.total}: ${path.basename(outputPath)}`);
    } catch (error) {
      counters.failed += 1;
      report.push({
        status: 'failed',
        inputPath,
        outputPath,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      });
      console.error(`[${workerId}] failed ${path.basename(inputPath)}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const credentials = {
    accessKey: process.env.VOLCENGINE_ACCESS_KEY || process.env.AccessKey || requireEnv('VOLCENGINE_ACCESS_KEY'),
    secretKey: process.env.VOLCENGINE_SECRET_KEY || process.env.SecretKey || requireEnv('VOLCENGINE_SECRET_KEY'),
  };

  await fsp.mkdir(options.output, { recursive: true });
  let files = await listInputFiles(options.input);
  if (options.limit > 0) {
    files = files.slice(0, options.limit);
  }

  const queue = [...files];
  const report = [];
  const counters = {
    total: files.length,
    completed: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`Input: ${options.input}`);
  console.log(`Output: ${options.output}`);
  console.log(`Files: ${files.length}`);
  console.log(`Concurrency: ${options.concurrency}`);
  console.log(`Expand: top=${options.top}, bottom=${options.bottom}, left=${options.left}, right=${options.right}`);

  const workers = Array.from({ length: options.concurrency }, (_, index) =>
    runWorker(index + 1, queue, options, credentials, report, counters)
  );
  await Promise.all(workers);

  const reportPath = path.join(options.output, 'batch-outpaint-report.json');
  await fsp.writeFile(reportPath, JSON.stringify({
    input: options.input,
    output: options.output,
    options: {
      prompt: options.prompt,
      top: options.top,
      bottom: options.bottom,
      left: options.left,
      right: options.right,
      maxWidth: options.maxWidth,
      maxHeight: options.maxHeight,
      concurrency: options.concurrency,
    },
    counters,
    items: report,
  }, null, 2));

  console.log('DONE');
  console.log(`Completed: ${counters.completed}`);
  console.log(`Skipped: ${counters.skipped}`);
  console.log(`Failed: ${counters.failed}`);
  console.log(`Report: ${reportPath}`);

  if (counters.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
