const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * 生成 Windows .ico 文件
 * Windows 图标需要包含多个尺寸：16x16, 32x32, 48x48, 256x256
 */
async function generateWindowsIcon() {
  const inputIcon = path.join(__dirname, '../public/icon.png');
  const outputDir = path.join(__dirname, '../public');
  
  if (!fs.existsSync(inputIcon)) {
    console.error('❌ 未找到 icon.png 文件');
    process.exit(1);
  }

  try {
    // 生成不同尺寸的 PNG 图标
    const sizes = [16, 32, 48, 256];
    const pngFiles = [];

    console.log('🎨 开始生成 Windows 图标...');

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}.png`);
      await sharp(inputIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      pngFiles.push(outputPath);
      console.log(`✅ 生成 ${size}x${size} 图标`);
    }

    console.log('\n✨ Windows 图标生成完成！');
    console.log('📁 生成的文件：');
    pngFiles.forEach(file => console.log(`   - ${path.basename(file)}`));
    console.log('\n💡 提示：electron-builder 会自动将这些 PNG 文件打包成 .ico');
    console.log('   或者你可以使用在线工具将 icon.png 转换为 .ico 格式');
    console.log('   推荐工具：https://convertio.co/zh/png-ico/');

  } catch (error) {
    console.error('❌ 生成图标失败:', error);
    process.exit(1);
  }
}

generateWindowsIcon();
