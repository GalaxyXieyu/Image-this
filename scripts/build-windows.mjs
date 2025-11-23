#!/usr/bin/env node

/**
 * Windows 应用构建脚本（跨平台版本）
 * 可在 Mac/Linux 上构建 Windows 应用
 */

import { spawn } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令执行失败，退出码: ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const autoMode = process.argv.includes('--auto') || process.argv.includes('-y');
  
  try {
    log('\n🚀 开始构建 Windows 应用...\n', 'cyan');

    // 1. 检查环境
    log('📋 步骤 1/6: 检查构建环境', 'blue');
    try {
      await runCommand('node', ['-v']);
      await runCommand('npm', ['-v']);
      log('✅ 环境检查通过\n', 'green');
    } catch (error) {
      log('❌ 环境检查失败', 'red');
      throw error;
    }

    // 2. 检查生产环境配置
    log('📋 步骤 2/6: 检查环境配置', 'blue');
    const envProdPath = join(projectRoot, '.env.production');
    const envExamplePath = join(projectRoot, '.env.production.example');

    if (!existsSync(envProdPath)) {
      log('⚠️  未找到 .env.production 文件', 'yellow');
      log('📝 正在从 .env.production.example 创建...', 'yellow');
      
      if (existsSync(envExamplePath)) {
        copyFileSync(envExamplePath, envProdPath);
        log('✅ 已创建 .env.production 文件', 'green');
        log('⚠️  请编辑 .env.production 文件，填写实际配置\n', 'yellow');
        
        if (!autoMode) {
          const answer = await askQuestion('是否继续构建？(y/n) ');
          if (answer.toLowerCase() !== 'y') {
            log('❌ 构建已取消', 'red');
            process.exit(0);
          }
        } else {
          log('🤖 自动模式：继续构建\n', 'cyan');
        }
      } else {
        log('❌ 未找到 .env.production.example 文件', 'red');
        throw new Error('缺少环境配置文件');
      }
    } else {
      log('✅ 找到 .env.production 配置文件\n', 'green');
    }

    // 3. 安装依赖
    log('📋 步骤 3/6: 检查依赖', 'blue');
    if (!existsSync(join(projectRoot, 'node_modules'))) {
      log('📦 安装项目依赖...', 'yellow');
      await runCommand('npm', ['install']);
    } else {
      log('✅ 依赖已安装\n', 'green');
    }

    // 4. 生成数据库
    log('📋 步骤 4/6: 准备数据库', 'blue');
    log('🔨 生成 Prisma Client...', 'yellow');
    await runCommand('npx', ['prisma', 'generate']);
    log('✅ 数据库准备完成\n', 'green');

    // 5. 构建 Next.js 应用
    log('📋 步骤 5/6: 构建 Next.js 应用', 'blue');
    log('🔨 开始构建...', 'yellow');
    await runCommand('npm', ['run', 'build']);
    log('✅ Next.js 应用构建完成\n', 'green');

    // 6. 打包 Electron 应用
    log('📋 步骤 6/6: 打包 Windows 应用', 'blue');
    log('🔨 开始打包...', 'yellow');
    log('⏳ 这可能需要几分钟时间，请耐心等待...\n', 'yellow');
    await runCommand('npm', ['run', 'electron:build:win']);

    // 完成
    log('\n✨ 构建完成！', 'green');
    log('\n📦 输出目录: dist-electron/', 'cyan');
    log('📁 查找生成的安装包：', 'cyan');
    log('   - NSIS 安装包：ImagineThis-*-x64.exe', 'cyan');
    log('   - Portable 版本：ImagineThis-*-x64.exe', 'cyan');
    log('\n💡 提示：', 'yellow');
    log('   - NSIS 安装包：适合需要安装的用户', 'yellow');
    log('   - Portable 版本：适合免安装直接运行', 'yellow');
    log('   - 构建产物在 dist-electron/ 目录下\n', 'yellow');

  } catch (error) {
    log(`\n❌ 构建失败: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
