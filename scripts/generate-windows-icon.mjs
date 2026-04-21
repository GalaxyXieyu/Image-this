#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function main() {
  const source = join(projectRoot, 'public', 'icon.png');
  const buildDir = join(projectRoot, 'build');
  const target = join(buildDir, 'icon.ico');

  mkdirSync(buildDir, { recursive: true });

  const iconBuffer = await pngToIco(source);
  writeFileSync(target, iconBuffer);

  console.log(`Generated Windows icon: ${target}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
