#!/usr/bin/env node

/**
 * 生成透明背景 Logo PNG（用于水印叠加）
 */

import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 透明背景画笔 Logo SVG — 去掉背景矩形，保留 alpha
const logoSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 画笔主体渐变 - 3D白色 -->
    <linearGradient id="brushGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#e2e8f0"/>
      <stop offset="30%" style="stop-color:#ffffff"/>
      <stop offset="70%" style="stop-color:#ffffff"/>
      <stop offset="100%" style="stop-color:#cbd5e1"/>
    </linearGradient>

    <!-- 金属环渐变 -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#d97706"/>
      <stop offset="30%" style="stop-color:#fbbf24"/>
      <stop offset="50%" style="stop-color:#fef08a"/>
      <stop offset="70%" style="stop-color:#fbbf24"/>
      <stop offset="100%" style="stop-color:#d97706"/>
    </linearGradient>

    <!-- 笔刷渐变 -->
    <linearGradient id="tipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#fef3c7"/>
      <stop offset="50%" style="stop-color:#fde68a"/>
      <stop offset="100%" style="stop-color:#fbbf24"/>
    </linearGradient>

    <!-- 阴影 -->
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="4" dy="8" stdDeviation="12" flood-color="#6d28d9" flood-opacity="0.35"/>
    </filter>

    <!-- 光晕 -->
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 装饰圆环 -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

  <!-- 画笔主体 - 放大居中 -->
  <g filter="url(#shadow)" transform="translate(256, 256) rotate(-45) translate(-256, -256)">

    <!-- 笔杆 - 更粗 -->
    <rect x="226" y="80" width="60" height="240" rx="10" fill="url(#brushGrad)"/>

    <!-- 笔杆装饰线 -->
    <rect x="226" y="105" width="60" height="12" fill="#c7d2fe" rx="4"/>
    <rect x="226" y="130" width="60" height="6" fill="#ddd6fe" rx="3"/>

    <!-- 金属环 -->
    <rect x="218" y="310" width="76" height="35" rx="6" fill="url(#goldGrad)"/>
    <rect x="218" y="320" width="76" height="6" fill="#f59e0b"/>
    <rect x="218" y="335" width="76" height="3" fill="#fef08a" opacity="0.7"/>

    <!-- 笔刷 -->
    <path d="M220 345
             L215 410
             Q256 460 297 410
             L292 345 Z" fill="url(#tipGrad)"/>

    <!-- 笔刷纹理 -->
    <path d="M235 350 L230 420" stroke="#f59e0b" stroke-width="2" opacity="0.4"/>
    <path d="M256 348 L256 435" stroke="#f59e0b" stroke-width="2" opacity="0.5"/>
    <path d="M277 350 L282 420" stroke="#f59e0b" stroke-width="2" opacity="0.4"/>

    <!-- 笔尖 -->
    <path d="M240 415 L256 455 L272 415 Q256 435 240 415 Z" fill="#f59e0b"/>
  </g>

  <!-- 魔法光点 -->
  <g filter="url(#glow)">
    <circle cx="130" cy="130" r="14" fill="#fbbf24"/>
    <circle cx="400" cy="120" r="11" fill="#fcd34d"/>
    <circle cx="100" cy="300" r="9" fill="#fde047"/>
    <circle cx="420" cy="280" r="10" fill="#fbbf24"/>
    <circle cx="130" cy="420" r="8" fill="#fcd34d"/>
    <circle cx="400" cy="400" r="12" fill="#fde047"/>
  </g>

  <!-- 闪烁星星 -->
  <g fill="#ffffff" filter="url(#glow)">
    <path d="M160 200 L168 220 L190 220 L173 234 L180 256 L160 242 L140 256 L147 234 L130 220 L152 220 Z"/>
    <path d="M380 340 L386 354 L402 354 L390 364 L395 380 L380 370 L365 380 L370 364 L358 354 L374 354 Z" opacity="0.9"/>
  </g>

  <!-- 底部光晕 -->
  <ellipse cx="320" cy="430" rx="60" ry="12" fill="rgba(251,191,36,0.35)" filter="url(#glow)"/>
</svg>
`;

async function generateTransparentLogo() {
  console.log('🎨 生成透明背景 Logo...\n');

  const outputPath = join(projectRoot, 'volcengine-outpaint', 'logo-transparent.png');

  try {
    // 使用 sharp 将 SVG 转换为 PNG，保留 alpha 通道
    await sharp(Buffer.from(logoSvg))
      .resize(1024, 1024)
      .png()
      .toFile(outputPath);

    console.log('✅ 透明 Logo 生成成功！');
    console.log(`📁 输出路径: ${outputPath}`);

    // 验证 alpha 通道
    const metadata = await sharp(outputPath).metadata();
    console.log(`📊 通道: ${metadata.channels} (应有 4 个通道: R G B A)`);
    console.log(`📊 格式: ${metadata.format}`);
    console.log(`📊 尺寸: ${metadata.width}x${metadata.height}`);

    if (metadata.channels === 4) {
      console.log('\n🎉 Logo 包含 alpha 透明通道，可以直接用于水印叠加。');
    } else {
      console.log('\n⚠️ 警告: Logo 可能没有 alpha 通道！');
    }

  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    process.exit(1);
  }
}

generateTransparentLogo();
