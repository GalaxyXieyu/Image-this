import { createCanvas, loadImage } from 'canvas';

export async function addWatermarkToImage(
  imageUrl: string,
  watermarkText: string,
  opacity: number,
  position: string,
  watermarkType?: 'text' | 'logo',
  watermarkLogoUrl?: string,
  outputResolution?: string
): Promise<string> {
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
  const ctx = canvas.getContext('2d');
  
  // 绘制缩放后的图片
  ctx.drawImage(img, 0, 0, outputWidth, outputHeight);
  
  // 添加水印
  if (watermarkType === 'logo' && watermarkLogoUrl) {
    await addLogoWatermark(ctx, watermarkLogoUrl, opacity, position, outputWidth, outputHeight);
  } else {
    addTextWatermark(ctx, watermarkText, opacity, position, outputWidth, outputHeight);
  }
  
  const outputBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
  const base64Output = outputBuffer.toString('base64');
  
  return `data:image/jpeg;base64,${base64Output}`;
}

function addTextWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  opacity: number,
  position: string,
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
  ctx: CanvasRenderingContext2D,
  logoUrl: string,
  opacity: number,
  position: string,
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
  
  // Logo尺寸（最大为图片宽度的20%）
  const maxLogoWidth = width * 0.2;
  const scale = Math.min(maxLogoWidth / logo.width, 1);
  const logoWidth = logo.width * scale;
  const logoHeight = logo.height * scale;
  
  const padding = 20;
  
  let x: number, y: number;
  
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
  
  ctx.globalAlpha = opacity;
  ctx.drawImage(logo, x, y, logoWidth, logoHeight);
  ctx.globalAlpha = 1.0;
}
