import sharp from 'sharp';

interface WatermarkOptions {
  imageUrl: string;
  watermarkType: 'text' | 'logo';
  watermarkLogoUrl?: string;
  watermarkPosition: string | { 
    x: number; 
    y: number; 
    width?: number;
    height?: number;
    scale?: number; 
    editorWidth?: number; 
    editorHeight?: number 
  };
  watermarkOpacity?: number;
  watermarkText?: string;
  outputResolution?: string;
}

/**
 * 从 data URL 提取 base64 数据
 */
function extractBase64FromDataUrl(dataUrl: string): string {
  if (dataUrl.startsWith('data:')) {
    return dataUrl.split(',')[1];
  }
  return dataUrl;
}

/**
 * 使用 sharp 添加水印到图片
 */
export async function addWatermarkToImage(options: WatermarkOptions): Promise<string> {
  const {
    imageUrl,
    watermarkType,
    watermarkLogoUrl,
    watermarkPosition,
    watermarkOpacity = 1.0,
    watermarkText = 'Watermark',
    outputResolution
  } = options;

  console.log('[addWatermarkToImage] 开始处理水印:', {
    watermarkType,
    hasLogoUrl: !!watermarkLogoUrl,
    position: typeof watermarkPosition === 'string' ? watermarkPosition : 'custom',
    outputResolution
  });

  // 解析原始图片
  const base64Data = extractBase64FromDataUrl(imageUrl);
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  // 获取原始图片信息
  const metadata = await sharp(imageBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  // 计算输出尺寸
  let outputWidth = originalWidth;
  let outputHeight = originalHeight;
  
  if (outputResolution && outputResolution !== 'original') {
    const [targetWidth, targetHeight] = outputResolution.split('x').map(Number);
    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;
    
    if (aspectRatio > targetAspectRatio) {
      outputWidth = targetWidth;
      outputHeight = Math.round(targetWidth / aspectRatio);
    } else {
      outputHeight = targetHeight;
      outputWidth = Math.round(targetHeight * aspectRatio);
    }
  }

  // 调整图片尺寸
  let processedImage = sharp(imageBuffer).resize(outputWidth, outputHeight);

  // 添加水印
  if (watermarkType === 'logo' && watermarkLogoUrl) {
    processedImage = await addLogoWatermark(
      processedImage,
      watermarkLogoUrl,
      watermarkOpacity,
      watermarkPosition,
      outputWidth,
      outputHeight
    );
  } else {
    processedImage = await addTextWatermark(
      processedImage,
      watermarkText,
      watermarkOpacity,
      watermarkPosition,
      outputWidth,
      outputHeight
    );
  }

  // 输出为 PNG
  const outputBuffer = await processedImage.png().toBuffer();
  const base64Output = outputBuffer.toString('base64');

  console.log('[addWatermarkToImage] 水印处理完成');
  return `data:image/png;base64,${base64Output}`;
}

/**
 * 添加 Logo 水印
 */
async function addLogoWatermark(
  image: sharp.Sharp,
  logoUrl: string,
  opacity: number,
  position: string | { 
    x: number; 
    y: number; 
    width?: number;
    height?: number;
    scale?: number; 
    editorWidth?: number; 
    editorHeight?: number 
  },
  width: number,
  height: number
): Promise<sharp.Sharp> {
  // 解析 Logo 图片
  const logoBase64 = extractBase64FromDataUrl(logoUrl);
  const logoBuffer = Buffer.from(logoBase64, 'base64');
  
  // 获取 Logo 原始尺寸
  const logoMetadata = await sharp(logoBuffer).metadata();
  const logoOriginalWidth = logoMetadata.width || 100;
  const logoOriginalHeight = logoMetadata.height || 100;

  let logoWidth: number, logoHeight: number, x: number, y: number;

  if (typeof position === 'object' && 'x' in position) {
    // 使用交互式设置的位置和尺寸
    const editorWidth = position.editorWidth || 600;
    const editorHeight = position.editorHeight || 400;
    
    // 计算实际图片和编辑器的比例
    const widthRatio = width / editorWidth;
    const heightRatio = height / editorHeight;
    
    if (position.width && position.height) {
      // 直接按比例缩放编辑器中的 Logo 尺寸
      logoWidth = Math.round(position.width * widthRatio);
      logoHeight = Math.round(position.height * heightRatio);
    } else if (position.scale) {
      // 向后兼容：如果只有 scale
      const avgRatio = (widthRatio + heightRatio) / 2;
      const actualScale = position.scale * avgRatio;
      logoWidth = Math.round(logoOriginalWidth * actualScale);
      logoHeight = Math.round(logoOriginalHeight * actualScale);
    } else {
      // 默认值
      logoWidth = Math.round(logoOriginalWidth * 0.2);
      logoHeight = Math.round(logoOriginalHeight * 0.2);
    }
    
    // 使用相对位置（百分比）来确保位置一致
    const relativeX = position.x / editorWidth;
    const relativeY = position.y / editorHeight;
    
    x = Math.round(relativeX * width);
    y = Math.round(relativeY * height);
  } else {
    // 使用预设位置
    const maxLogoWidth = width * 0.2;
    const scale = Math.min(maxLogoWidth / logoOriginalWidth, 1);
    logoWidth = Math.round(logoOriginalWidth * scale);
    logoHeight = Math.round(logoOriginalHeight * scale);
    
    const padding = 20;
    
    switch (position) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-right':
        x = width - logoWidth - padding;
        y = padding;
        break;
      case 'bottom-left':
        x = padding;
        y = height - logoHeight - padding;
        break;
      case 'bottom-right':
        x = width - logoWidth - padding;
        y = height - logoHeight - padding;
        break;
      case 'center':
        x = Math.round((width - logoWidth) / 2);
        y = Math.round((height - logoHeight) / 2);
        break;
      default:
        x = width - logoWidth - padding;
        y = height - logoHeight - padding;
    }
  }

  // 确保尺寸至少为 1
  logoWidth = Math.max(1, logoWidth);
  logoHeight = Math.max(1, logoHeight);

  // 调整 Logo 尺寸并应用透明度
  let logoImage = sharp(logoBuffer).resize(logoWidth, logoHeight);
  
  // 如果透明度不是 1，需要调整 alpha 通道
  if (opacity < 1) {
    // 确保图片有 alpha 通道，然后调整透明度
    const logoWithAlpha = await logoImage
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data, info } = logoWithAlpha;
    
    // 调整每个像素的 alpha 值
    for (let i = 3; i < data.length; i += 4) {
      data[i] = Math.round(data[i] * opacity);
    }
    
    logoImage = sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    });
  }

  const logoCompositeBuffer = await logoImage.png().toBuffer();

  // 确保坐标不为负
  x = Math.max(0, x);
  y = Math.max(0, y);

  // 合成图片
  const baseBuffer = await image.toBuffer();
  return sharp(baseBuffer).composite([{
    input: logoCompositeBuffer,
    left: x,
    top: y,
    blend: 'over'
  }]);
}

/**
 * 添加文字水印
 */
async function addTextWatermark(
  image: sharp.Sharp,
  text: string,
  opacity: number,
  position: string | { 
    x: number; 
    y: number; 
    width?: number;
    height?: number;
    scale?: number; 
    editorWidth?: number; 
    editorHeight?: number 
  },
  width: number,
  height: number
): Promise<sharp.Sharp> {
  // 计算字体大小
  const fontSize = Math.max(20, Math.floor(width / 30));
  const padding = 20;
  
  // 估算文字宽度（粗略估计：每个字符约 0.6 倍字体大小）
  const textWidth = text.length * fontSize * 0.6;
  const textHeight = fontSize;

  let x: number, y: number;

  if (typeof position === 'string') {
    switch (position) {
      case 'top-left':
        x = padding;
        y = padding;
        break;
      case 'top-right':
        x = width - textWidth - padding;
        y = padding;
        break;
      case 'bottom-left':
        x = padding;
        y = height - textHeight - padding;
        break;
      case 'bottom-right':
        x = width - textWidth - padding;
        y = height - textHeight - padding;
        break;
      case 'center':
        x = Math.round((width - textWidth) / 2);
        y = Math.round((height - textHeight) / 2);
        break;
      default:
        x = width - textWidth - padding;
        y = height - textHeight - padding;
    }
  } else {
    // 自定义位置
    const editorWidth = position.editorWidth || 600;
    const editorHeight = position.editorHeight || 400;
    x = Math.round((position.x / editorWidth) * width);
    y = Math.round((position.y / editorHeight) * height);
  }

  // 确保坐标不为负
  x = Math.max(0, x);
  y = Math.max(0, y);

  // 创建 SVG 文字水印
  const svgText = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          fill: white;
          font-size: ${fontSize}px;
          font-family: Arial, sans-serif;
          font-weight: bold;
          opacity: ${opacity};
        }
        .watermark-bg {
          fill: rgba(0, 0, 0, 0.5);
          opacity: ${opacity};
        }
      </style>
      <rect class="watermark-bg" x="${x - 10}" y="${y - 5}" width="${textWidth + 20}" height="${textHeight + 15}" rx="4"/>
      <text class="watermark" x="${x}" y="${y + textHeight}">${escapeXml(text)}</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgText);
  const baseBuffer = await image.toBuffer();

  return sharp(baseBuffer).composite([{
    input: svgBuffer,
    blend: 'over'
  }]);
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
