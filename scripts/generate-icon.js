const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const outputDir = path.join(__dirname, '../public');
  
  // 读取 SVG
  const svgBuffer = fs.readFileSync(svgPath);
  
  // 生成不同尺寸的 PNG
  const sizes = [
    { size: 512, name: 'icon.png' },
    { size: 256, name: 'icon-256.png' },
    { size: 128, name: 'icon-128.png' },
    { size: 64, name: 'icon-64.png' },
    { size: 32, name: 'icon-32.png' },
    { size: 16, name: 'icon-16.png' }
  ];
  
  for (const { size, name } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, name));
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }
  
  console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(console.error);
