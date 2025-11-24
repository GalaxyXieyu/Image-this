const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 生成 macOS .icns 文件
 * macOS 图标需要包含多个尺寸：16x16, 32x32, 64x64, 128x128, 256x256, 512x512, 1024x1024
 */
async function generateMacIcon() {
  const inputIcon = path.join(__dirname, '../public/icon.png');
  const outputDir = path.join(__dirname, '../public');
  const iconsetDir = path.join(outputDir, 'icon.iconset');
  
  if (!fs.existsSync(inputIcon)) {
    console.error('❌ 未找到 icon.png 文件');
    process.exit(1);
  }

  try {
    // 创建 iconset 目录
    if (fs.existsSync(iconsetDir)) {
      fs.rmSync(iconsetDir, { recursive: true });
    }
    fs.mkdirSync(iconsetDir);

    console.log('🎨 开始生成 macOS 图标...');

    // macOS 需要的所有尺寸（包括 @2x 版本）
    const iconSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' },
    ];

    // 生成所有尺寸的图标
    for (const { size, name } of iconSizes) {
      const outputPath = path.join(iconsetDir, name);
      await sharp(inputIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ 生成 ${name} (${size}x${size})`);
    }

    // 使用 iconutil 将 iconset 转换为 icns
    console.log('\n🔄 正在转换为 .icns 格式...');
    try {
      const icnsPath = path.join(outputDir, 'icon.icns');
      execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
      console.log('✅ 成功生成 icon.icns');
      
      // 清理临时文件
      fs.rmSync(iconsetDir, { recursive: true });
      console.log('🧹 清理临时文件');
      
      console.log('\n✨ macOS 图标生成完成！');
      console.log('📁 生成的文件：icon.icns');
      console.log('💡 该图标将用于 macOS 应用打包');
      
    } catch (error) {
      console.warn('\n⚠️  iconutil 命令执行失败（可能不在 macOS 系统上）');
      console.log('📁 已生成 iconset 文件夹，请在 macOS 上手动运行：');
      console.log(`   iconutil -c icns "${iconsetDir}" -o "${path.join(outputDir, 'icon.icns')}"`);
    }

  } catch (error) {
    console.error('❌ 生成图标失败:', error);
    process.exit(1);
  }
}

generateMacIcon();
