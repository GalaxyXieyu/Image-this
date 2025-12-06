#!/usr/bin/env node

/**
 * Post-build script for Next.js standalone mode
 * 自动复制 standalone 模式缺失的必要文件
 * 
 * Next.js standalone 不会自动包含：
 * - .next/static (CSS/JS)
 * - public (静态资源)
 * - prisma (数据库 schema)
 * - 原生模块 (sharp, @img, .prisma, @prisma)
 * - .env.production
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('⚠️ Standalone directory not found, skipping post-build');
  process.exit(0);
}

console.log('🔧 Running post-build tasks...\n');

// 需要复制的目录/文件列表
const copyTasks = [
  // 静态资源（必须）
  { from: '.next/static', to: '.next/standalone/.next/static', required: true },
  { from: 'public', to: '.next/standalone/public', required: true },
  
  // 数据库
  { from: 'prisma', to: '.next/standalone/prisma', required: true },
  
  // 原生模块
  { from: 'node_modules/sharp', to: '.next/standalone/node_modules/sharp', required: false },
  { from: 'node_modules/@img', to: '.next/standalone/node_modules/@img', required: false },
  { from: 'node_modules/.prisma', to: '.next/standalone/node_modules/.prisma', required: true },
  { from: 'node_modules/@prisma', to: '.next/standalone/node_modules/@prisma', required: true },
  
  // 环境配置
  { from: '.env.production', to: '.next/standalone/.env.production', required: false },
];

let hasError = false;

copyTasks.forEach(task => {
  const srcPath = path.join(projectRoot, task.from);
  const destPath = path.join(projectRoot, task.to);
  
  if (fs.existsSync(srcPath)) {
    try {
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
      console.log(`✅ ${task.from}`);
    } catch (e) {
      console.log(`❌ ${task.from}: ${e.message}`);
      if (task.required) hasError = true;
    }
  } else if (task.required) {
    console.log(`❌ ${task.from} (not found)`);
    hasError = true;
  } else {
    console.log(`⏭️  ${task.from} (skipped)`);
  }
});

console.log('\n' + (hasError ? '❌ Post-build completed with errors' : '✨ Post-build completed!'));
