#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('Standalone directory not found, skipping post-build.');
  process.exit(0);
}

console.log('Running post-build tasks...\n');

const copyTasks = [
  { from: '.next/static', to: '.next/standalone/.next/static', required: true },
  { from: 'public', to: '.next/standalone/public', required: true },
  { from: 'prisma', to: '.next/standalone/prisma', required: true },
  { from: 'node_modules/sharp', to: '.next/standalone/node_modules/sharp', required: false },
  { from: 'node_modules/@img', to: '.next/standalone/node_modules/@img', required: false },
  { from: 'node_modules/.prisma', to: '.next/standalone/node_modules/.prisma', required: true },
  { from: 'node_modules/@prisma', to: '.next/standalone/node_modules/@prisma', required: true },
  { from: '.env.production', to: '.next/standalone/.env.production', required: false },
];

let hasError = false;
const copiedModules = new Set();

function copyPath(sourcePath, destinationPath) {
  const stats = fs.statSync(sourcePath);
  if (stats.isDirectory()) {
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
  } else {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }
}

function copyTask(task) {
  const sourcePath = path.join(projectRoot, task.from);
  const destinationPath = path.join(projectRoot, task.to);

  if (!fs.existsSync(sourcePath)) {
    console.log(task.required ? `ERROR ${task.from} (not found)` : `SKIP  ${task.from}`);
    if (task.required) {
      hasError = true;
    }
    return;
  }

  try {
    copyPath(sourcePath, destinationPath);
    console.log(`COPY  ${task.from}`);
  } catch (error) {
    console.log(`ERROR ${task.from}: ${error.message}`);
    if (task.required) {
      hasError = true;
    }
  }
}

function getModuleSource(moduleName) {
  return path.join(projectRoot, 'node_modules', ...moduleName.split('/'));
}

function getModuleDestination(moduleName) {
  return path.join(standaloneDir, 'node_modules', ...moduleName.split('/'));
}

function copyNodeModuleTree(moduleName) {
  if (copiedModules.has(moduleName)) {
    return;
  }

  const sourcePath = getModuleSource(moduleName);
  const destinationPath = getModuleDestination(moduleName);

  if (!fs.existsSync(sourcePath)) {
    console.log(`ERROR node_modules/${moduleName} (not found)`);
    hasError = true;
    return;
  }

  try {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.cpSync(sourcePath, destinationPath, { recursive: true });
    copiedModules.add(moduleName);
    console.log(`COPY  node_modules/${moduleName}`);

    const packageJsonPath = path.join(sourcePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.optionalDependencies || {}),
    };

    for (const dependencyName of Object.keys(dependencies)) {
      copyNodeModuleTree(dependencyName);
    }
  } catch (error) {
    console.log(`ERROR node_modules/${moduleName}: ${error.message}`);
    hasError = true;
  }
}

copyTasks.forEach(copyTask);

console.log('\nCopying updater runtime dependencies...');
copyNodeModuleTree('electron-updater');

console.log(`\n${hasError ? 'Post-build completed with errors.' : 'Post-build completed successfully.'}`);
