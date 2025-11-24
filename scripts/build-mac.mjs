#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * macOS 应用打包脚本
 * 自动化执行：环境检查 -> 图标生成 -> Next.js 构建 -> Electron 打包
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`[步骤 ${step}] ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    log(`\n执行命令: ${command} ${args.join(' ')}`, 'blue');
    
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      } else {
        resolve();
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function checkEnvironment() {
  logStep(1, '环境检查');
  
  // 检查是否在 macOS 上
  if (process.platform !== 'darwin') {
    log('⚠️  警告: 当前不在 macOS 系统上，可能无法生成 .icns 图标', 'yellow');
    log('   打包仍会继续，但建议在 macOS 上进行完整打包', 'yellow');
  } else {
    log('✅ 运行环境: macOS', 'green');
  }

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  log(`✅ Node.js 版本: ${nodeVersion}`, 'green');

  // 检查必要文件
  const requiredFiles = [
    'package.json',
    'electron/main.js',
    'public/icon.png',
  ];

  for (const file of requiredFiles) {
    const filePath = join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`缺少必要文件: ${file}`);
    }
  }
  log('✅ 必要文件检查通过', 'green');
}

async function generateIcon() {
  logStep(2, '生成 macOS 图标');
  
  try {
    await runCommand('node', ['scripts/generate-mac-icon.js']);
    log('✅ 图标生成成功', 'green');
  } catch (error) {
    log('⚠️  图标生成失败，将使用现有图标继续', 'yellow');
  }
}

async function buildNextApp() {
  logStep(3, '构建 Next.js 应用');
  
  await runCommand('npm', ['run', 'build']);
  log('✅ Next.js 应用构建成功', 'green');
}

async function buildElectronApp() {
  logStep(4, '打包 Electron 应用');
  
  log('\n开始打包 macOS 应用...', 'cyan');
  log('这可能需要几分钟时间，请耐心等待...', 'yellow');
  
  await runCommand('electron-builder', ['--mac']);
  log('✅ Electron 应用打包成功', 'green');
}

async function showResults() {
  logStep(5, '打包完成');
  
  const distDir = join(projectRoot, 'dist-electron');
  
  if (fs.existsSync(distDir)) {
    log('\n📦 打包产物位置:', 'bright');
    log(`   ${distDir}`, 'cyan');
    
    // 列出生成的文件
    const files = fs.readdirSync(distDir);
    const macFiles = files.filter(f => f.endsWith('.dmg') || f.endsWith('.zip'));
    
    if (macFiles.length > 0) {
      log('\n📁 生成的安装包:', 'bright');
      macFiles.forEach(file => {
        const filePath = join(distDir, file);
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        log(`   ✅ ${file} (${sizeMB} MB)`, 'green');
      });
    }
  }

  log('\n' + '='.repeat(60), 'cyan');
  log('🎉 macOS 应用打包完成！', 'bright');
  log('='.repeat(60), 'cyan');
  
  log('\n💡 下一步操作:', 'bright');
  log('   1. 在 dist-electron 目录找到 .dmg 或 .zip 文件', 'yellow');
  log('   2. 双击 .dmg 文件进行安装测试', 'yellow');
  log('   3. 如需分发，可以上传到网站或应用商店', 'yellow');
}

async function main() {
  const startTime = Date.now();
  
  log('\n🚀 开始 macOS 应用打包流程', 'bright');
  log('项目: Imagine This - AI 图像处理平台\n', 'cyan');

  try {
    await checkEnvironment();
    await generateIcon();
    await buildNextApp();
    await buildElectronApp();
    await showResults();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`\n⏱️  总耗时: ${duration} 秒`, 'cyan');
    
  } catch (error) {
    log('\n❌ 打包失败:', 'red');
    log(error.message, 'red');
    if (error.stack) {
      log('\n错误堆栈:', 'yellow');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
