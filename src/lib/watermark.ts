import { createCanvas, loadImage, CanvasRenderingContext2D as NodeCanvasRenderingContext2D, Canvas } from 'canvas';

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
    outputResolution
  });
  
  const extractBase64FromDataUrl = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  };

  const base64Data = extractBase64FromDataUrl(imageUrl);
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  const img = await loadImage(imageBuffer);
  
  // 计算输出尺寸
  let outputWidth = img.width;
  let outputHeight = img.height;
  
  if (outputResolution && outputResolution !== 'original') {
    const [targetWidth, targetHeight] = outputResolution.split('x').map(Number);
    const aspectRatio = img.width / img.height;
    const targetAspectRatio = targetWidth / targetHeight;
    
    if (aspectRatio > targetAspectRatio) {
      outputWidth = targetWidth;
      outputHeight = Math.round(targetWidth / aspectRatio);
    } else {
      outputHeight = targetHeight;
      outputWidth = Math.round(targetHeight * aspectRatio);
    }
  }
  
  const canvas = createCanvas(outputWidth, outputHeight);
  const ctx = canvas.getContext('2d', { alpha: true });
  
  // 先用透明色填充整个画布，确保背景透明
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  
  // 绘制缩放后的图片
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);
  
    
  // 添加水印
  if (watermarkType === 'logo' && watermarkLogoUrl) {
    await addLogoWatermark(ctx, watermarkLogoUrl, watermarkOpacity, watermarkPosition, outputWidth, outputHeight);
  } else {
    addTextWatermark(ctx, watermarkText, watermarkOpacity, watermarkPosition, outputWidth, outputHeight);
  }
  
  // 使用PNG格式输出，保留透明度
  const outputBuffer = canvas.toBuffer('image/png', { 
    compressionLevel: 6
  });
  const base64Output = outputBuffer.toString('base64');
  const result = `data:image/png;base64,${base64Output}`;
  
  console.log('[addWatermarkToImage] 处理完成:', {
    outputFormat: 'PNG',
    bufferSize: outputBuffer.length
  });
  
  return result;
}

function addTextWatermark(
  ctx: NodeCanvasRenderingContext2D,
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
) {
  const fontSize = Math.max(20, Math.floor(width / 30));
  ctx.font = `bold ${fontSize}px Arial`;
  
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  const padding = 20;
  
  let x: number, y: number;
  
  switch (position) {
    case 'top-left':
      x = padding;
      y = padding + textHeight;
      break;
    case 'top-right':
      x = width - textWidth - padding;
      y = padding + textHeight;
      break;
    case 'bottom-left':
      x = padding;
      y = height - padding;
      break;
    case 'bottom-right':
      x = width - textWidth - padding;
      y = height - padding;
      break;
    case 'center':
      x = (width - textWidth) / 2;
      y = (height + textHeight) / 2;
      break;
    default:
      x = width - textWidth - padding;
      y = height - padding;
  }
  
  ctx.globalAlpha = opacity;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x - 10, y - textHeight - 5, textWidth + 20, textHeight + 15);
  
  ctx.fillStyle = 'white';
  ctx.fillText(text, x, y);
  
  ctx.globalAlpha = 1.0;
}

async function addLogoWatermark(
  ctx: NodeCanvasRenderingContext2D,
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
) {
  const extractBase64FromDataUrl = (dataUrl: string): string => {
    if (dataUrl.startsWith('data:')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  };

  const logoBase64 = extractBase64FromDataUrl(logoUrl);
  const logoBuffer = Buffer.from(logoBase64, 'base64');
  const logo = await loadImage(logoBuffer);
  
    
  // Logo尺寸和位置
  let logoWidth: number, logoHeight: number, x: number, y: number;
  
  if (typeof position === 'object' && 'x' in position) {
    // 使用交互式设置的位置和尺寸
    // 注意：position.x 和 position.y 是基于编辑器画布的坐标
    // 需要转换为实际图片尺寸的坐标
    
    // 使用编辑器传递的实际尺寸，如果没有则使用默认值
    const editorWidth = position.editorWidth || 600;
    const editorHeight = position.editorHeight || 400;
    
    // 计算实际图片和编辑器的比例
    const widthRatio = width / editorWidth;
    const heightRatio = height / editorHeight;
    
    // 如果提供了编辑器中 Logo 的实际显示尺寸，使用它来计算实际尺寸
    if (position.width && position.height) {
      // 直接按比例缩放编辑器中的 Logo 尺寸
      logoWidth = position.width * widthRatio;
      logoHeight = position.height * heightRatio;
    } else if (position.scale) {
      // 向后兼容：如果只有 scale，使用旧的计算方式
      const avgRatio = (widthRatio + heightRatio) / 2;
      const actualScale = position.scale * avgRatio;
      logoWidth = logo.width * actualScale;
      logoHeight = logo.height * actualScale;
    } else {
      // 默认值
      logoWidth = logo.width * 0.2;
      logoHeight = logo.height * 0.2;
    }
    
    // 使用相对位置（百分比）来确保位置一致
    const relativeX = position.x / editorWidth;
    const relativeY = position.y / editorHeight;
    
    x = relativeX * width;
    y = relativeY * height;
  } else {
    // 使用预设位置
    const maxLogoWidth = width * 0.2;
    const scale = Math.min(maxLogoWidth / logo.width, 1);
    logoWidth = logo.width * scale;
    logoHeight = logo.height * scale;
    
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
        x = (width - logoWidth) / 2;
        y = (height - logoHeight) / 2;
        break;
      default:
        x = width - logoWidth - padding;
        y = height - logoHeight - padding;
    }
  }
  
  // 绘制Logo水印
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = 'source-over'; // 确保正确的合成模式
  ctx.drawImage(logo, x, y, logoWidth, logoHeight);
  ctx.restore();
}
