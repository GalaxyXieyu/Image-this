/**
 * 局部重绘（圈画 / mask）核心服务
 *
 * 思路：InpaintDialog 导出的蒙版本身是橙色半透明 PNG（标注待修改区域）。
 * 这里用 sharp 把蒙版合成到原图上，得到一张「橙色高亮引导图」，
 * 再把 [原图, 引导图] 作为双参考图交给现有 Gemini/GPT/Jimeng provider，
 * 通过提示词约束模型「只改高亮区、区外保持像素一致」。
 *
 * 被 typed handler（handlers/inpaint.ts）和 worker 兼容分支（processInpaint）共用。
 */

import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';

export type InpaintAction = 'inpaint' | 'remove' | 'enhance';
export type InpaintStrength = 'low' | 'medium' | 'high';

export interface ExecuteInpaintParams {
  userId: string;
  /** 原图：data URL 或可访问 URL */
  sourceImage: string;
  /** 蒙版：橙色半透明 PNG 的 data URL */
  maskImage: string;
  /** 用户对圈选区域的修改要求（remove/enhance 可为空，走默认） */
  prompt?: string;
  action?: InpaintAction;
  strength?: InpaintStrength;
  /** 记录用的原图地址（落库 originalUrl） */
  originalUrlForRecord?: string;
  provider?: string;
  modelName?: string;
  onProgress?: (message: string, progress: number) => void | Promise<void>;
}

export interface InpaintResult {
  processedImageId: string;
  processedImageUrl: string;
  prompt: string;
  usedModel: string;
}

const STRENGTH_HINT: Record<InpaintStrength, string> = {
  low: '仅做轻微、克制的调整，尽量贴近原图。',
  medium: '做适度调整，使修改自然融入画面。',
  high: '做明显的调整，但仍需与画面整体协调。',
};

const ACTION_INSTRUCTION: Record<InpaintAction, string> = {
  inpaint: '在橙色高亮覆盖的区域内，按「修改要求」重绘内容。',
  remove: '移除橙色高亮区域内的元素（文字 / 水印 / 杂物等），并用周围自然内容无缝填补。',
  enhance: '提升橙色高亮区域的清晰度与细节，增强纹理与边缘，但不要改变其中的内容主体。',
};

function dataUrlToBuffer(input: string): Buffer {
  const comma = input.indexOf(',');
  const raw = input.startsWith('data:') && comma >= 0 ? input.slice(comma + 1) : input;
  return Buffer.from(raw, 'base64');
}

async function loadAsBuffer(input: string): Promise<Buffer> {
  if (input.startsWith('data:')) return dataUrlToBuffer(input);
  const res = await fetch(input);
  if (!res.ok) throw new Error(`无法读取图片来源: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * 把橙色半透明蒙版合成到原图上，得到高亮引导图（jpeg data URL）。
 */
async function buildGuidanceImage(sourceBuffer: Buffer, maskBuffer: Buffer): Promise<string> {
  const meta = await sharp(sourceBuffer).metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1024;

  // 蒙版可能与原图尺寸不同（画板按 naturalWidth 创建，理论上一致，这里仍做对齐兜底）
  const alignedMask = await sharp(maskBuffer)
    .resize(width, height, { fit: 'fill' })
    .png()
    .toBuffer();

  const guidance = await sharp(sourceBuffer)
    .composite([{ input: alignedMask, blend: 'over' }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return `data:image/jpeg;base64,${guidance.toString('base64')}`;
}

function buildInpaintPrompt(action: InpaintAction, strength: InpaintStrength, userPrompt: string): string {
  const lines = [
    '你将看到两张图：第一张是原图；第二张是同一张图，但用橙色半透明高亮标注了需要修改的区域。',
    '只允许在橙色高亮覆盖的区域内进行修改，其余区域必须与第一张原图保持像素级一致，不要改变构图、主体、光线与整体色调。',
    ACTION_INSTRUCTION[action],
    STRENGTH_HINT[strength],
  ];
  if (userPrompt.trim()) {
    lines.push(`修改要求：${userPrompt.trim()}`);
  }
  lines.push(
    '输出与原图相同的尺寸和比例，专业摄影质感，修改区域与周围自然无缝衔接，不得残留任何橙色标注、可见接缝或伪影。'
  );
  return lines.join('\n');
}

async function callProvider(
  provider: string,
  sourceImage: string,
  guidanceImage: string,
  prompt: string,
  userId: string,
  modelName?: string
): Promise<{ imageData: string; imageSize: number }> {
  const service = await import('@/lib/image-processor/service');

  if (provider === 'gpt') {
    const r = await service.processWithGPT(sourceImage, guidanceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  if (provider === 'jimeng' || provider === 'seedream') {
    const r = await service.processWithJimeng(sourceImage, guidanceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  // 默认 gemini（用户已验证可用的 toapis 通道）
  const imageData = await service.processWithGemini(sourceImage, guidanceImage, prompt, userId, modelName);
  return { imageData: imageData || '', imageSize: imageData?.length || 0 };
}

export async function executeInpaint(params: ExecuteInpaintParams): Promise<InpaintResult> {
  const action = params.action || 'inpaint';
  const strength = params.strength || 'medium';
  const provider = params.provider || 'gemini';
  const userId = params.userId;

  await params.onProgress?.('准备蒙版与原图…', 15);
  const [sourceBuffer, maskBuffer] = await Promise.all([
    loadAsBuffer(params.sourceImage),
    loadAsBuffer(params.maskImage),
  ]);

  const sourceDataUrl = params.sourceImage.startsWith('data:')
    ? params.sourceImage
    : `data:image/jpeg;base64,${sourceBuffer.toString('base64')}`;
  const guidanceDataUrl = await buildGuidanceImage(sourceBuffer, maskBuffer);

  const prompt = buildInpaintPrompt(action, strength, params.prompt || '');
  const usedModel = params.modelName || provider;

  await params.onProgress?.(`使用 ${usedModel} 局部重绘中…`, 45);
  const result = await callProvider(provider, sourceDataUrl, guidanceDataUrl, prompt, userId, params.modelName);

  if (!result.imageData) {
    throw new Error('局部重绘未返回图像数据');
  }

  await params.onProgress?.('保存结果…', 85);
  const filename = `inpaint-${action}-${Date.now()}.jpg`;
  const processedUrl = await uploadBase64Image(result.imageData, filename, userId);

  const processedImage = await prisma.processedImage.create({
    data: {
      filename,
      originalUrl: params.originalUrlForRecord || '',
      processedUrl,
      processType: 'BACKGROUND_REMOVAL',
      status: 'COMPLETED',
      fileSize: result.imageSize,
      metadata: JSON.stringify({
        operation: 'inpaint',
        action,
        strength,
        provider,
        prompt,
        processingCompletedAt: new Date().toISOString(),
      }),
      userId,
    },
  });

  await params.onProgress?.('完成', 100);
  return {
    processedImageId: processedImage.id,
    processedImageUrl: processedUrl,
    prompt,
    usedModel,
  };
}
