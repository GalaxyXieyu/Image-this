#!/usr/bin/env node

/**
 * 批量图片加水印 - 支持透明 PNG logo 叠加
 */

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const SUPPORTED_INPUTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function parseArgs(argv) {
  const options = {
    input: '',
    output: '',
    logo: '',
    position: 'left-top',
    scale: 0.22,
    margin: 32,
    quality: 95,
    overwrite: false,
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
    } else if (arg === '--logo' && next) {
      options.logo = next;
      index += 1;
    } else if (arg === '--position' && next) {
      options.position = next;
      index += 1;
    } else if (arg === '--scale' && next) {
      options.scale = Number(next);
      index += 1;
    } else if (arg === '--margin' && next) {
      options.margin = Number(next);
      index += 1;
    } else if (arg === '--quality' && next) {
      options.quality = Number(next);
      index += 1;
    } else if (arg === '--overwrite') {
      options.overwrite = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.input) {
    throw new Error('Missing --input directory');
  }
  if (!options.output) {
    throw new Error('Missing --output directory');
  }
  if (!options.logo) {
    throw new Error('Missing --logo path');
  }

  options.input = path.resolve(options.input);
  options.output = path.resolve(options.output);
  options.logo = path.resolve(options.logo);
  return options;
}

function printHelp() {
  console.log(`
Batch watermark images with a transparent PNG logo overlay.

Usage:
  node scripts/batch-watermark.mjs --input <dir> --output <dir> --logo <png>

Options:
  --input <dir>     Input image directory.
  --output <dir>    Output directory.
  --logo <path>     Path to transparent PNG logo.
  --position <pos>  Logo position: left-top, right-top, left-bottom, right-bottom, center. Default: left-top
  --scale <ratio>   Logo width as ratio of image width. Default: 0.22
  --margin <px>     Margin from edges. Default: 32
  --quality <n>     JPEG output quality 1-100. Default: 95
  --overwrite       Overwrite existing output files.
`);
}

async function listInputFiles(inputDir) {
  const entries = await fsp.readdir(inputDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SUPPORTED_INPUTS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(inputDir, entry.name))
    .sort();
}

async function addWatermark(inputPath, outputPath, logoPath, options) {
  const [imageMeta, logoMeta] = await Promise.all([
    sharp(inputPath).metadata(),
    sharp(logoPath).metadata(),
  ]);

  const imageWidth = imageMeta.width;
  const imageHeight = imageMeta.height;

  // Calculate logo size based on scale ratio
  const logoWidth = Math.round(imageWidth * options.scale);
  const logoHeight = Math.round((logoWidth / logoMeta.width) * logoMeta.height);

  // Calculate position
  let left, top;
  switch (options.position) {
    case 'left-top':
      left = options.margin;
      top = options.margin;
      break;
    case 'right-top':
      left = imageWidth - logoWidth - options.margin;
      top = options.margin;
      break;
    case 'left-bottom':
      left = options.margin;
      top = imageHeight - logoHeight - options.margin;
      break;
    case 'right-bottom':
      left = imageWidth - logoWidth - options.margin;
      top = imageHeight - logoHeight - options.margin;
      break;
    case 'center':
      left = Math.round((imageWidth - logoWidth) / 2);
      top = Math.round((imageHeight - logoHeight) / 2);
      break;
    default:
      left = options.margin;
      top = options.margin;
  }

  // Resize logo and composite
  const resizedLogo = await sharp(logoPath)
    .resize(logoWidth, logoHeight, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp(inputPath)
    .composite([{
      input: resizedLogo,
      left,
      top,
    }])
    .jpeg({ quality: options.quality, mozjpeg: true })
    .toFile(outputPath);

  return {
    imageWidth,
    imageHeight,
    logoWidth,
    logoHeight,
    margin: options.margin,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(options.logo)) {
    throw new Error(`Logo file not found: ${options.logo}`);
  }
  if (!fs.existsSync(options.input)) {
    throw new Error(`Input directory not found: ${options.input}`);
  }

  await fsp.mkdir(options.output, { recursive: true });
  const files = await listInputFiles(options.input);

  const report = {
    inputDir: options.input,
    outputDir: options.output,
    logoPath: options.logo,
    position: options.position,
    scale: options.scale,
    margin: options.margin,
    completed: 0,
    failed: 0,
    items: [],
  };

  console.log(`Input: ${options.input}`);
  console.log(`Output: ${options.output}`);
  console.log(`Logo: ${options.logo}`);
  console.log(`Position: ${options.position}`);
  console.log(`Scale: ${options.scale}`);
  console.log(`Margin: ${options.margin}px`);
  console.log(`Files: ${files.length}\n`);

  for (let i = 0; i < files.length; i++) {
    const inputPath = files[i];
    const fileName = path.basename(inputPath);
    const outputPath = path.join(options.output, fileName);

    if (!options.overwrite && fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${files.length}] skipped (exists): ${fileName}`);
      continue;
    }

    try {
      const result = await addWatermark(inputPath, outputPath, options.logo, options);
      report.completed += 1;
      report.items.push({
        status: 'completed',
        inputPath,
        outputPath,
        ...result,
      });
      console.log(`[${i + 1}/${files.length}] watermarked: ${fileName} (${result.logoWidth}x${result.logoHeight})`);
    } catch (error) {
      report.failed += 1;
      report.items.push({
        status: 'failed',
        inputPath,
        outputPath,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`[${i + 1}/${files.length}] failed: ${fileName} — ${error instanceof Error ? error.message : error}`);
    }
  }

  const reportPath = path.join(options.output, 'watermark-report.json');
  await fsp.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n✅ Completed: ${report.completed}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`📄 Report: ${reportPath}`);

  if (report.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
