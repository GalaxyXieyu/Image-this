#!/usr/bin/env node

/**
 * Build verification script
 * Checks if all necessary files are in place after build
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : 'red';
  log(`${status} ${description}: ${filePath}`, color);
  return exists;
}

function checkDir(dirPath, description) {
  const exists = fs.existsSync(dirPath);
  const status = exists ? '✅' : '❌';
  const color = exists ? 'green' : 'red';
  let message = `${status} ${description}: ${dirPath}`;
  
  if (exists) {
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      message += ` (${files.length} items)`;
    }
  }
  
  log(message, color);
  return exists;
}

log('\n📋 Checking build output...\n', 'cyan');

let allPassed = true;

// Check Next.js build
log('🔍 Next.js Build:', 'cyan');
allPassed &= checkDir(path.join(projectRoot, '.next'), 'Next.js build directory');
allPassed &= checkDir(path.join(projectRoot, '.next', 'standalone'), 'Standalone directory');
allPassed &= checkFile(path.join(projectRoot, '.next', 'standalone', 'server.js'), 'Server entry point');
allPassed &= checkDir(path.join(projectRoot, '.next', 'static'), 'Static assets');
console.log();

// Check standalone structure
log('🔍 Standalone Structure:', 'cyan');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
if (fs.existsSync(standaloneDir)) {
  allPassed &= checkDir(path.join(standaloneDir, '.next', 'static'), 'Static in standalone');
  allPassed &= checkDir(path.join(standaloneDir, 'public'), 'Public in standalone');
  allPassed &= checkDir(path.join(standaloneDir, 'prisma'), 'Prisma in standalone');
  checkFile(path.join(standaloneDir, '.env.production'), 'Environment config (optional)');
}
console.log();

// Check Electron files
log('🔍 Electron Files:', 'cyan');
allPassed &= checkFile(path.join(projectRoot, 'electron', 'main.js'), 'Main process');
allPassed &= checkFile(path.join(projectRoot, 'electron', 'preload.js'), 'Preload script');
console.log();

// Check package configuration
log('🔍 Package Configuration:', 'cyan');
allPassed &= checkFile(path.join(projectRoot, 'package.json'), 'Package.json');
checkFile(path.join(projectRoot, '.env.production'), 'Production environment (optional)');
console.log();

// Check icons
log('🔍 Application Icons:', 'cyan');
checkFile(path.join(projectRoot, 'public', 'icon.png'), 'PNG icon (Windows)');
checkFile(path.join(projectRoot, 'public', 'icon.icns'), 'ICNS icon (Mac)');
console.log();

// Summary
if (allPassed) {
  log('✅ All required files are present!', 'green');
  log('👍 Ready to build Electron app', 'green');
} else {
  log('❌ Some required files are missing!', 'red');
  log('⚠️  Please run "npm run build" first', 'yellow');
  process.exit(1);
}

// Additional info
log('\n📊 Build Statistics:', 'cyan');
const nextBuildDir = path.join(projectRoot, '.next');
if (fs.existsSync(nextBuildDir)) {
  const size = getDirectorySize(nextBuildDir);
  log(`Next.js build size: ${formatBytes(size)}`, 'cyan');
}

function getDirectorySize(dirPath) {
  let size = 0;
  
  function traverse(currentPath) {
    const stats = fs.statSync(currentPath);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      files.forEach(file => {
        traverse(path.join(currentPath, file));
      });
    }
  }
  
  try {
    traverse(dirPath);
  } catch (error) {
    // Ignore errors
  }
  
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

log('');
