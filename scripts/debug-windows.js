#!/usr/bin/env node

/**
 * Windows 调试脚本
 * 帮助收集系统信息和检查常见问题
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🔍 ImagineThis Windows 调试工具');
console.log('=====================================');

// 收集系统信息
const systemInfo = {
  platform: os.platform(),
  arch: os.arch(),
  release: os.release(),
  hostname: os.hostname(),
  cpus: os.cpus(),
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  homedir: os.homedir(),
  tempdir: os.tmpdir(),
};

console.log('\n📊 系统信息:');
console.log(`操作系统: ${systemInfo.platform} ${systemInfo.release}`);
console.log(`架构: ${systemInfo.arch}`);
console.log(`CPU: ${systemInfo.cpus[0].model}`);
console.log(`CPU 核心数: ${systemInfo.cpus.length}`);
console.log(`总内存: ${(systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`可用内存: ${(systemInfo.freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`);

// 检查日志目录
const logDir = path.join(systemInfo.homedir, 'ImagineThis', 'logs');
console.log(`\n📁 日志目录: ${logDir}`);

if (fs.existsSync(logDir)) {
  console.log('✅ 日志目录存在');
  
  try {
    const files = fs.readdirSync(logDir);
    console.log('📄 日志文件:');
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
    });
  } catch (error) {
    console.log('❌ 无法读取日志目录:', error.message);
  }
} else {
  console.log('❌ 日志目录不存在');
}

// 检查应用安装目录
const possiblePaths = [
  path.join('C:', 'Program Files', 'ImagineThis'),
  path.join('C:', 'Program Files (x86)', 'ImagineThis'),
  path.join('C:', 'Users', systemInfo.hostname, 'AppData', 'Local', 'Programs', 'ImagineThis'),
];

console.log('\n🔍 检查可能的安装位置:');
possiblePaths.forEach(p => {
  if (fs.existsSync(p)) {
    console.log(`✅ ${p}`);
  } else {
    console.log(`❌ ${p}`);
  }
});

// 检查端口占用
console.log('\n🌐 检查端口 23000:');
const { exec } = require('child_process');

exec('netstat -ano | findstr :23000', (error, stdout, stderr) => {
  if (stdout.includes('LISTENING')) {
    console.log('⚠️  端口 23000 已被占用:');
    console.log(stdout);
  } else {
    console.log('✅ 端口 23000 可用');
  }
});

// 创建诊断报告
const report = {
  timestamp: new Date().toISOString(),
  systemInfo,
  logDir,
  logDirExists: fs.existsSync(logDir),
  possiblePaths: possiblePaths.map(p => ({ path: p, exists: fs.existsSync(p) })),
};

const reportPath = path.join(systemInfo.tempdir, 'imaginethis-debug-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log(`\n📋 诊断报告已保存到: ${reportPath}`);
console.log('\n💡 如果应用无法启动，请:');
console.log('1. 查看日志文件内容');
console.log('2. 检查端口 23000 是否被占用');
console.log('3. 确保有足够的内存和磁盘空间');
console.log('4. 尝试以管理员身份运行应用');
