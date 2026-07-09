import sharp from 'sharp';

/**
 * 按倍数放大/缩小图片分辨率：输出尺寸 = 原图尺寸 × factor。
 * 用于「高清放大」真正按用户选的倍数（支持 1.1~4 等任意值）缩放，
 * 而不是像旧逻辑那样只把倍数存进 metadata 却不改输出。
 *
 * @param imageDataUrl data URL 或 base64
 * @param factor 缩放倍数（0.1~8 之间夹取；1 时原样返回）
 * @returns data:image/png;base64,... 的结果
 */
export async function scaleImageByFactor(imageDataUrl: string, factor: number): Promise<string> {
  const f = Math.max(0.1, Math.min(8, Number(factor) || 1));
  const base64 = imageDataUrl.startsWith('data:') ? imageDataUrl.split(',')[1] : imageDataUrl;
  const buffer = Buffer.from(base64, 'base64');

  if (Math.abs(f - 1) < 0.001) {
    // 无需缩放，仍统一转 PNG 输出，保证下游格式一致
    const out = await sharp(buffer).png().toBuffer();
    return `data:image/png;base64,${out.toString('base64')}`;
  }

  const meta = await sharp(buffer).metadata();
  const w = Math.max(1, Math.round((meta.width || 1024) * f));
  const h = Math.max(1, Math.round((meta.height || 1024) * f));

  const out = await sharp(buffer)
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .png()
    .toBuffer();

  return `data:image/png;base64,${out.toString('base64')}`;
}
