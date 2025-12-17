#!/usr/bin/env node

/**
 * macOS 图标生成脚本
 * 将 PNG 图标转换为 macOS 所需的 .icns 格式
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const iconPng = path.join(projectRoot, 'public/icon.png');
const iconIcns = path.join(projectRoot, 'public/icon.icns');

// 检查是否在 macOS 上
if (process.platform !== 'darwin') {
  console.log('⚠️  不在 macOS 上，跳过 .icns 图标生成');
  process.exit(0);
}

// 检查 PNG 图标是否存在
if (!fs.existsSync(iconPng)) {
  console.log('⚠️  找不到 icon.png，跳过图标生成');
  process.exit(0);
}

// 检查是否已经有 .icns 文件
if (fs.existsSync(iconIcns)) {
  console.log('✅ .icns 文件已存在，跳过生成');
  process.exit(0);
}

try {
  console.log('🔨 正在生成 macOS .icns 图标...');

  // 方法 1: 使用 sips 和 iconutil (最可靠的方法)
  const tempIconset = path.join(projectRoot, 'Icon.iconset');

  // 创建临时目录
  if (!fs.existsSync(tempIconset)) {
    fs.mkdirSync(tempIconset, { recursive: true });
  }

  // macOS 图标所需的尺寸列表
  const sizes = [
    16, 32, 64, 128, 256, 512, 1024
  ];

  // 为每个尺寸生成图标
  for (const size of sizes) {
    const outputPath = path.join(tempIconset, `icon_${size}x${size}.png`);
    const retinaPath = path.join(tempIconset, `icon_${size}x${size}@2x.png`);

    // 使用 sips 调整大小
    try {
      execSync(`sips -z ${size} ${size} "${iconPng}" --out "${outputPath}"`, { stdio: 'ignore' });
      console.log(`  ✓ 生成 ${size}x${size} 图标`);
    } catch (e) {
      console.log(`  ⚠️  生成 ${size}x${size} 图标失败`);
    }

    // 为 Retina 屏幕生成 2x 版本
    try {
      const retinaSize = size * 2;
      execSync(`sips -z ${retinaSize} ${retinaSize} "${iconPng}" --out "${retinaPath}"`, { stdio: 'ignore' });
      console.log(`  ✓ 生成 ${size}x${size}@2x 图标`);
    } catch (e) {
      // 可选的，失败也没关系
    }
  }

  // 转换为 .icns
  try {
    execSync(`iconutil -c icns -o "${iconIcns}" "${tempIconset}"`, { stdio: 'inherit' });
    console.log('✅ .icns 图标生成成功');
  } catch (e) {
    console.log('⚠️  iconutil 转换失败，但图标集已创建');
  }

  // 清理临时目录
  try {
    execSync(`rm -rf "${tempIconset}"`);
  } catch (e) {
    // 忽略清理错误
  }

} catch (error) {
  console.log('⚠️  图标生成遇到错误，但可以继续打包');
  console.log(`   错误: ${error.message}`);
  process.exit(0); // 不中断打包过程
}
