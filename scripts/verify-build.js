#!/usr/bin/env node

/**
 * 构建验证脚本
 * 检查打包后的应用是否包含必要的文件
 * 确保 Windows 版本可以正常运行
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证 Windows 构建产物...');
console.log('=====================================\n');

const buildDir = path.join(__dirname, '../dist-electron/win-unpacked');

if (!fs.existsSync(buildDir)) {
  console.log('❌ 构建目录不存在，请先运行构建');
  process.exit(1);
}

// 检查关键文件和目录
const requiredPaths = [
  { path: 'ImagineThis.exe', desc: 'Electron 可执行文件' },
  { path: 'resources/app.asar', desc: 'Electron 应用包' },
  { path: 'resources/app.asar.unpacked', desc: '解包目录' },
  { path: 'resources/app.asar.unpacked/.next/standalone', desc: 'Standalone 目录' },
  { path: 'resources/app.asar.unpacked/.next/standalone/server.js', desc: 'Next.js 服务器' },
  { path: 'resources/app.asar.unpacked/.next/standalone/node_modules', desc: 'Standalone 依赖' },
  { path: 'resources/app.asar.unpacked/.next/standalone/.next/static', desc: '静态资源 (CSS/JS)', critical: true },
  { path: 'resources/app.asar.unpacked/.next/standalone/public', desc: '公共资源', critical: true },
  { path: 'resources/app.asar.unpacked/.next/standalone/node_modules/.prisma/client/query_engine-windows.dll.node', desc: 'Prisma Windows 引擎', critical: true },
  { path: 'resources/app.asar.unpacked/prisma', desc: 'Prisma Schema' },
  { path: 'resources/app.asar.unpacked/.env.production', desc: '生产环境配置' },
];

let allExists = true;
let criticalMissing = [];

console.log('📁 检查应用目录结构:\n');

requiredPaths.forEach(item => {
  const fullPath = path.join(buildDir, item.path);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  const criticalTag = item.critical ? ' [关键]' : '';
  
  console.log(`${status} ${item.desc}${criticalTag}`);
  
  if (!exists) {
    allExists = false;
    if (item.critical) {
      criticalMissing.push(item.desc);
    }
  } else {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const items = fs.readdirSync(fullPath).length;
      console.log(`   └─ ${items} 项`);
    } else {
      console.log(`   └─ ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }
});

// 检查 Windows DLL 文件
console.log('\n📦 检查 Windows 原生模块:\n');

const nativeModules = [
  { path: 'resources/app.asar.unpacked/.next/standalone/node_modules/.prisma/client/query_engine-windows.dll.node', desc: 'Prisma Windows 引擎' },
  { path: 'resources/app.asar.unpacked/node_modules/canvas/build/Release/canvas.node', desc: 'Canvas 模块' },
];

nativeModules.forEach(item => {
  const fullPath = path.join(buildDir, item.path);
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '⚠️';
  console.log(`${status} ${item.desc}`);
  if (exists) {
    const size = fs.statSync(fullPath).size;
    console.log(`   └─ ${(size / 1024 / 1024).toFixed(2)} MB`);
  }
});

// 检查静态资源内容
console.log('\n📄 检查静态资源内容:\n');

const staticDir = path.join(buildDir, 'resources/app.asar.unpacked/.next/standalone/.next/static');
if (fs.existsSync(staticDir)) {
  const staticContents = fs.readdirSync(staticDir);
  console.log(`✅ static 目录包含: ${staticContents.join(', ')}`);
  
  // 检查是否有 CSS 和 JS
  const hasChunks = staticContents.includes('chunks');
  const hasCss = staticContents.includes('css');
  const hasMedia = staticContents.includes('media');
  
  if (hasChunks) console.log('   ✅ chunks (JavaScript)');
  if (hasCss) console.log('   ✅ css (样式)');
  if (hasMedia) console.log('   ✅ media (字体/图片)');
} else {
  console.log('❌ static 目录不存在 - 这会导致样式无法加载!');
  criticalMissing.push('静态资源目录');
}

// 总结
console.log('\n=====================================');
if (criticalMissing.length > 0) {
  console.log('❌ 构建验证失败!\n');
  console.log('缺少关键文件:');
  criticalMissing.forEach(item => console.log(`  - ${item}`));
  console.log('\n💡 修复建议:');
  console.log('  1. 确保 Next.js 构建成功');
  console.log('  2. 确保 static 和 public 目录被复制到 standalone');
  console.log('  3. 重新运行 npm run build:windows');
  process.exit(1);
} else if (!allExists) {
  console.log('⚠️ 构建验证部分通过\n');
  console.log('有些非关键文件缺失，应用可能仍然可以运行');
} else {
  console.log('✅ 构建验证通过!\n');
  console.log('🎉 Windows 版本已准备就绪，可以测试!');
}
