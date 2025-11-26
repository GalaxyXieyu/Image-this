#!/usr/bin/env node

/**
 * Post-build script for Next.js standalone mode
 * Copies necessary files to standalone directory
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticDir = path.join(projectRoot, '.next', 'static');
const publicDir = path.join(projectRoot, 'public');
const prismaDir = path.join(projectRoot, 'prisma');

console.log('🔧 Running post-build tasks...');

// Copy .next/static to standalone
if (fs.existsSync(staticDir)) {
  const targetStaticDir = path.join(standaloneDir, '.next', 'static');
  console.log(`📁 Copying static files to: ${targetStaticDir}`);
  
  if (!fs.existsSync(targetStaticDir)) {
    fs.mkdirSync(path.dirname(targetStaticDir), { recursive: true });
  }
  
  copyRecursiveSync(staticDir, targetStaticDir);
  console.log('✅ Static files copied');
}

// Copy public directory to standalone
if (fs.existsSync(publicDir)) {
  const targetPublicDir = path.join(standaloneDir, 'public');
  console.log(`📁 Copying public files to: ${targetPublicDir}`);
  copyRecursiveSync(publicDir, targetPublicDir);
  console.log('✅ Public files copied');
}

// Copy prisma directory to standalone
if (fs.existsSync(prismaDir)) {
  const targetPrismaDir = path.join(standaloneDir, 'prisma');
  console.log(`📁 Copying prisma files to: ${targetPrismaDir}`);
  copyRecursiveSync(prismaDir, targetPrismaDir);
  console.log('✅ Prisma files copied');
}

// Copy .env.production if exists
const envProdPath = path.join(projectRoot, '.env.production');
if (fs.existsSync(envProdPath)) {
  const targetEnvPath = path.join(standaloneDir, '.env.production');
  console.log(`📁 Copying .env.production to: ${targetEnvPath}`);
  fs.copyFileSync(envProdPath, targetEnvPath);
  console.log('✅ Environment file copied');
}

console.log('✨ Post-build tasks completed!');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}
