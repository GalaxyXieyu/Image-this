#!/usr/bin/env node

/**
 * Windows 应用构建脚本（跨平台版本）
 * 可在 Mac/Linux 上构建 Windows 应用
 */

import { spawn } from 'child_process';
import { existsSync, copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import readline from 'readline';
import { rcedit } from 'rcedit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const require = createRequire(import.meta.url);
const { hasWindowsSigningConfig, signFiles } = require('./windows-signing-utils.cjs');
const prismaCli = process.platform === 'win32'
  ? join(projectRoot, 'node_modules', '.bin', 'prisma.cmd')
  : join(projectRoot, 'node_modules', '.bin', 'prisma');
const isolatedBuildHome = join(projectRoot, '.build-home');
const originalUserHomeEnv = {
  HOME: process.env.HOME,
  USERPROFILE: process.env.USERPROFILE,
  HOMEDRIVE: process.env.HOMEDRIVE,
  HOMEPATH: process.env.HOMEPATH,
  APPDATA: process.env.APPDATA,
  LOCALAPPDATA: process.env.LOCALAPPDATA,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
};

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

function removeIfExists(filePath) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
}

function removeDirectoryIfExists(dirPath) {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}

function removeFilesByPredicate(dirPath, predicate) {
  if (!existsSync(dirPath)) {
    return 0;
  }

  let removedCount = 0;

  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      removedCount += removeFilesByPredicate(fullPath, predicate);
      continue;
    }

    if (predicate(entry, fullPath)) {
      unlinkSync(fullPath);
      removedCount += 1;
    }
  }

  return removedCount;
}

async function patchWindowsExecutableIcon() {
  const iconPath = join(projectRoot, 'build', 'icon.ico');
  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
  const productName = packageJson?.build?.productName || packageJson?.build?.productFilename || 'ImagineThis';
  const outputDir = join(projectRoot, 'dist-electron');
  const targets = [
    join(outputDir, 'win-unpacked', `${productName}.exe`),
    ...readdirSync(outputDir)
      .filter((entry) => entry.endsWith('-Portable.exe'))
      .map((entry) => join(outputDir, entry)),
  ].filter((targetPath, index, allPaths) => existsSync(targetPath) && allPaths.indexOf(targetPath) === index);

  if (!existsSync(iconPath) || targets.length === 0) {
    return;
  }

  log('🪄 写入 Windows 可执行文件图标...', 'yellow');

  for (const targetPath of targets) {
    await rcedit(targetPath, {
      icon: iconPath,
    });
    log(`✅ 已修正图标: ${targetPath}`, 'green');
  }
}

function pruneStandaloneForWindows(standaloneDir) {
  log('🧹 精简 Windows 运行时文件...', 'yellow');

  removeDirectoryIfExists(join(standaloneDir, '.build-home'));
  removeDirectoryIfExists(join(standaloneDir, 'src'));

  const prismaClientDir = join(standaloneDir, 'node_modules', '.prisma', 'client');
  const prismaEnginesDir = join(standaloneDir, 'node_modules', '@prisma', 'engines');

  const removedClientEngines = removeFilesByPredicate(
    prismaClientDir,
    (fileName) =>
      (
        fileName.startsWith('libquery_engine-') ||
        fileName.startsWith('query_engine-') ||
        fileName.startsWith('schema-engine-')
      ) &&
      fileName !== 'query_engine-windows.dll.node'
  );

  const removedPackageEngines = removeFilesByPredicate(
    prismaEnginesDir,
    (fileName) =>
      (
        fileName.startsWith('libquery_engine-') ||
        fileName.startsWith('query_engine-') ||
        fileName.startsWith('schema-engine-')
      ) &&
      fileName !== 'query_engine-windows.dll.node' &&
      fileName !== 'schema-engine-windows.exe'
  );

  log(
    `✅ 已移除 ${removedClientEngines + removedPackageEngines} 个非 Windows Prisma 引擎文件\n`,
    'green'
  );
}

function prepareIsolatedBuildHome() {
  const roamingDir = join(isolatedBuildHome, 'AppData', 'Roaming');
  const localDir = join(isolatedBuildHome, 'AppData', 'Local');
  const tempDir = join(isolatedBuildHome, 'Temp');

  [isolatedBuildHome, roamingDir, localDir, tempDir].forEach((dirPath) => {
    mkdirSync(dirPath, { recursive: true });
  });

  process.env.HOME = isolatedBuildHome;
  process.env.USERPROFILE = isolatedBuildHome;
  process.env.HOMEDRIVE = 'D:';
  process.env.HOMEPATH = '\\code\\Image-this\\.build-home';
  process.env.APPDATA = roamingDir;
  process.env.LOCALAPPDATA = localDir;
  process.env.TEMP = tempDir;
  process.env.TMP = tempDir;
}

function restoreOriginalBuildHome() {
  Object.entries(originalUserHomeEnv).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
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
    log('📋 步骤 1/7: 检查构建环境', 'blue');
    try {
      await runCommand('node', ['-v']);
      await runCommand('npm', ['-v']);
      log('✅ 环境检查通过\n', 'green');
    } catch (error) {
      log('❌ 环境检查失败', 'red');
      throw error;
    }

    // 2. 检查生产环境配置
    log('📋 步骤 2/7: 检查环境配置', 'blue');
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
    log('📋 步骤 3/7: 检查依赖', 'blue');
    if (!existsSync(join(projectRoot, 'node_modules'))) {
      log('📦 安装项目依赖...', 'yellow');
      await runCommand('npm', ['install']);
    } else {
      log('✅ 依赖已安装', 'green');
    }

    log('🪄 生成 Windows 图标...', 'yellow');
    await runCommand('node', ['scripts/generate-windows-icon.mjs']);
    log('✅ Windows 图标已更新\n', 'green');
    
    // 3.1 安装 Windows 平台的 sharp
    log('📦 安装 Windows 平台 sharp 模块...', 'yellow');
    await runCommand('npm', ['install', '--os=win32', '--cpu=x64', 'sharp']);
    
    // 3.2 创建占位目录，避免 electron-builder 扫描时报错
    const sharpDarwinX64 = join(projectRoot, 'node_modules', '@img', 'sharp-darwin-x64');
    const sharpDarwinArm64 = join(projectRoot, 'node_modules', '@img', 'sharp-darwin-arm64');
    if (!existsSync(sharpDarwinX64)) {
      mkdirSync(sharpDarwinX64, { recursive: true });
      log('📁 创建 sharp-darwin-x64 占位目录', 'yellow');
    }
    if (!existsSync(sharpDarwinArm64)) {
      mkdirSync(sharpDarwinArm64, { recursive: true });
      log('📁 创建 sharp-darwin-arm64 占位目录', 'yellow');
    }
    log('✅ sharp 模块安装完成\n', 'green');

    // 4. 生成数据库
    log('📋 步骤 4/8: 准备数据库', 'blue');
    log('🔨 生成 Prisma Client（包含 Windows 引擎）...', 'yellow');
    // 设置环境变量以生成 Windows 平台的 Prisma 引擎
    process.env.PRISMA_CLI_BINARY_TARGETS = 'windows,darwin,darwin-arm64,linux-musl-openssl-3.0.x';
    await runCommand(prismaCli, ['generate']);
    
    // 4.1 创建最新结构的数据库模板（用于 Windows 端首次启动）
    log('🔨 创建数据库模板（确保包含最新表结构）...', 'yellow');
    const templateDbPath = join(projectRoot, 'prisma', 'app.db');
    const nestedTemplateDbPath = join(projectRoot, 'prisma', 'prisma', 'app.db');
    if (existsSync(templateDbPath)) {
      log('✅ 复用现有数据库模板 prisma/app.db\n', 'green');
    } else {
      // 使用 prisma db push 创建最新结构的数据库
      [
        `${templateDbPath}-shm`,
        `${templateDbPath}-wal`,
        nestedTemplateDbPath,
        `${nestedTemplateDbPath}-shm`,
        `${nestedTemplateDbPath}-wal`,
      ].forEach(removeIfExists);
      process.env.DATABASE_URL = 'file:./app.db';
      await runCommand(prismaCli, ['db', 'push', '--skip-generate']);
      if (!existsSync(templateDbPath) && existsSync(nestedTemplateDbPath)) {
        copyFileSync(nestedTemplateDbPath, templateDbPath);
        log('Template database was created in prisma/prisma/app.db, copied back to prisma/app.db', 'yellow');
      }
      if (!existsSync(templateDbPath)) {
        throw new Error(`未生成数据库模板: ${templateDbPath}`);
      }
      log('✅ 数据库模板创建完成（包含最新表结构）\n', 'green');
    }

    // 5. 构建 Next.js 应用
    log('📋 步骤 5/7: 构建 Next.js 应用', 'blue');
    log('🔨 开始构建...', 'yellow');
    prepareIsolatedBuildHome();
    await runCommand('npm', ['run', 'build']);
    restoreOriginalBuildHome();
    log('✅ Next.js 应用构建完成\n', 'green');

    // 6. 复制静态资源到 standalone 目录
    log('📋 步骤 6/7: 复制静态资源', 'blue');
    const standaloneDir = join(projectRoot, '.next', 'standalone');
    const staticSrc = join(projectRoot, '.next', 'static');
    const staticDest = join(standaloneDir, '.next', 'static');
    const publicSrc = join(projectRoot, 'public');
    const publicDest = join(standaloneDir, 'public');

    if (existsSync(staticSrc)) {
      log('📁 复制 .next/static 到 standalone/.next/static...', 'yellow');
      mkdirSync(join(standaloneDir, '.next'), { recursive: true });
      cpSync(staticSrc, staticDest, { recursive: true });
      log('✅ static 目录复制完成', 'green');
    }

    if (existsSync(publicSrc)) {
      log('📁 复制 public 到 standalone/public...', 'yellow');
      cpSync(publicSrc, publicDest, { recursive: true });
      log('✅ public 目录复制完成', 'green');
    }
    
    // 复制 sharp 模块到 standalone/node_modules
    const sharpSrc = join(projectRoot, 'node_modules', 'sharp');
    const sharpDest = join(standaloneDir, 'node_modules', 'sharp');
    const imgSrc = join(projectRoot, 'node_modules', '@img');
    const imgDest = join(standaloneDir, 'node_modules', '@img');
    
    if (existsSync(sharpSrc)) {
      log('📁 复制 sharp 模块到 standalone/node_modules...', 'yellow');
      cpSync(sharpSrc, sharpDest, { recursive: true });
      log('✅ sharp 模块复制完成', 'green');
    }
    
    if (existsSync(imgSrc)) {
      log('📁 复制 @img 模块到 standalone/node_modules...', 'yellow');
      cpSync(imgSrc, imgDest, { recursive: true });
      log('✅ @img 模块复制完成', 'green');
    }
    
    // 复制 prisma 目录到 standalone
    const prismaSrc = join(projectRoot, 'prisma');
    const prismaDest = join(standaloneDir, 'prisma');
    if (existsSync(prismaSrc)) {
      log('📁 复制 prisma 目录到 standalone...', 'yellow');
      cpSync(prismaSrc, prismaDest, { recursive: true });
      log('✅ prisma 目录复制完成', 'green');
    }
    
    // 复制 .prisma client（包含 Windows 引擎）
    const prismaClientSrc = join(projectRoot, 'node_modules', '.prisma');
    const prismaClientDest = join(standaloneDir, 'node_modules', '.prisma');
    if (existsSync(prismaClientSrc)) {
      log('📁 复制 .prisma client 到 standalone/node_modules...', 'yellow');
      cpSync(prismaClientSrc, prismaClientDest, { recursive: true });
      log('✅ .prisma client 复制完成', 'green');
    }
    
    // 复制 @prisma/client
    const prismaClientPkgSrc = join(projectRoot, 'node_modules', '@prisma');
    const prismaClientPkgDest = join(standaloneDir, 'node_modules', '@prisma');
    if (existsSync(prismaClientPkgSrc)) {
      log('📁 复制 @prisma 到 standalone/node_modules...', 'yellow');
      cpSync(prismaClientPkgSrc, prismaClientPkgDest, { recursive: true });
      log('✅ @prisma 复制完成', 'green');
    }
    
    // 复制 .env.production 到 standalone
    const envProdSrc = join(projectRoot, '.env.production');
    const envProdDest = join(standaloneDir, '.env.production');
    if (existsSync(envProdSrc)) {
      log('📁 复制 .env.production 到 standalone...', 'yellow');
      copyFileSync(envProdSrc, envProdDest);
      log('✅ .env.production 复制完成', 'green');
    }

    pruneStandaloneForWindows(standaloneDir);
    
    log('✅ 静态资源复制完成\n', 'green');

    // 7. 打包 Electron 应用
    log('📋 步骤 7/7: 打包 Windows 应用', 'blue');
    log('🔨 开始打包...', 'yellow');
    log('⏳ 这可能需要几分钟时间，请耐心等待...\n', 'yellow');
    await runCommand('npm', ['run', 'electron:build:win']);
    await patchWindowsExecutableIcon();
    const distDir = join(projectRoot, 'dist-electron');
    const signableArtifacts = readdirSync(distDir)
      .filter((entry) => entry.endsWith('.exe'))
      .map((entry) => join(distDir, entry));

    if (hasWindowsSigningConfig(process.env) && signableArtifacts.length > 0) {
      log('Signing Windows installer artifacts...', 'yellow');
      await signFiles(signableArtifacts, process.env);
      log('Windows installer artifacts signed.', 'green');
    } else {
      log('Trusted Windows signing is not configured; Smart App Control may still block this build.', 'yellow');
    }

    // 8. 验证构建
    log('📋 步骤 8/8: 验证构建', 'blue');
    try {
      await runCommand('node', ['scripts/verify-build.js']);
    } catch (e) {
      log('⚠️ 构建验证有警告，请检查输出', 'yellow');
    }

    // 完成
    log('\n✨ 构建完成！', 'green');
    log('\n📦 输出目录: dist-electron/', 'cyan');
    log('📁 查找生成的安装包：', 'cyan');
    log('   - NSIS 安装包：ImagineThis-*-x64-Setup.exe', 'cyan');
    log('   - Portable 版本：ImagineThis-*-x64-Portable.exe', 'cyan');
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
