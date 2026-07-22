import sharp from 'sharp';
import { uploadBase64ToSuperbed } from '@/lib/superbed-upload';

const MEDIAKIT_BASE_URL = process.env.MEDIAKIT_BASE_URL || 'https://mediakit.cn-beijing.volces.com/api/v1';

export type MediaKitEnhanceVersion = 'standard' | 'professional' | 'max';

type MediaKitImageResult = {
  image_url: string;
  image_size?: number;
  image_format?: string;
  image_width?: number;
  image_height?: number;
};

type MediaKitResponse<T> = {
  success?: boolean;
  result?: T;
  message?: string;
  request_id?: string;
  task_id?: string;
};

type ImageMetrics = {
  width: number;
  height: number;
  shortSide: number;
  longSide: number;
  bytes: number;
  format?: string;
};

function getMediaKitApiKey(): string {
  const apiKey = process.env.MEDIAKIT_API_KEY || process.env.VOLCENGINE_MEDIAKIT_API_KEY;
  if (!apiKey) {
    throw new Error('MEDIAKIT_NOT_CONFIGURED: 请在生产环境配置 MEDIAKIT_API_KEY');
  }
  return apiKey;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Official expand-image-canvas limit: each side max 40%. */
export function clampExpandRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, 0, 0.4);
}

/**
 * Official enhance-image multiple:
 * - supports 2 decimal places
 * - standard: [1, 8]
 * - professional/max: [1, 30]
 */
export function normalizeEnhanceMultiple(
  value: number,
  toolVersion: MediaKitEnhanceVersion = 'professional'
): number {
  const max = toolVersion === 'standard' ? 8 : 30;
  const raw = Number.isFinite(value) ? value : 1;
  const clamped = clamp(raw, 1, max);
  return Math.round(clamped * 100) / 100;
}

async function postMediaKit<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${MEDIAKIT_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getMediaKitApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  const raw = await response.text();
  let data: MediaKitResponse<T>;
  try {
    data = JSON.parse(raw) as MediaKitResponse<T>;
  } catch {
    throw new Error(`MEDIAKIT_INVALID_RESPONSE: HTTP ${response.status} body=${raw.slice(0, 300)}`);
  }

  if (!response.ok || data.success === false || !data.result) {
    const message = data.message || raw.slice(0, 500) || `HTTP ${response.status}`;
    const requestId = data.request_id ? ` request_id=${data.request_id}` : '';
    throw new Error(`MEDIAKIT_REQUEST_FAILED: ${message}${requestId}`);
  }

  return data.result;
}

async function loadImageBuffer(imageInput: string): Promise<Buffer> {
  if (imageInput.startsWith('data:')) {
    const base64 = imageInput.replace(/^data:[^;]+;base64,/, '');
    return Buffer.from(base64, 'base64');
  }

  if (/^https?:\/\//i.test(imageInput)) {
    const response = await fetch(imageInput, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      throw new Error(`MEDIAKIT_INPUT_FETCH_FAILED: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error('MEDIAKIT_PUBLIC_IMAGE_REQUIRED: 输入图片必须是公网 URL 或 data URL');
}

async function getImageMetrics(imageInput: string): Promise<ImageMetrics | null> {
  try {
    const buffer = await loadImageBuffer(imageInput);
    const meta = await sharp(buffer).metadata();
    if (!meta.width || !meta.height) return null;
    const shortSide = Math.min(meta.width, meta.height);
    const longSide = Math.max(meta.width, meta.height);
    return {
      width: meta.width,
      height: meta.height,
      shortSide,
      longSide,
      bytes: buffer.length,
      format: meta.format,
    };
  } catch (error) {
    console.warn(
      '[MediaKit] 读取输入图片尺寸失败，跳过本地预检:',
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

/**
 * Pick enhance tool_version by input size:
 * - professional prefers quality but only accepts short≥256 and long≤2048
 * - standard allows smaller inputs (short≥16, long≤2160) but multiple≤8
 * - max allows large inputs (long≤6240) and high multiples
 */
export function pickEnhanceToolVersion(
  metrics: Pick<ImageMetrics, 'shortSide' | 'longSide'> | null,
  multiple: number
): MediaKitEnhanceVersion {
  if (!metrics) {
    // Unknown size: prefer professional, fall back only on API error path if needed.
    return multiple > 8 ? 'max' : 'professional';
  }

  const { shortSide, longSide } = metrics;

  // Large input cannot use professional.
  if (longSide > 2048 || shortSide < 256) {
    if (longSide <= 2160 && shortSide >= 16 && multiple <= 8) return 'standard';
    return 'max';
  }

  // Within professional input bounds.
  if (multiple > 8) return 'max';
  return 'professional';
}

function assertEnhanceInput(metrics: ImageMetrics, toolVersion: MediaKitEnhanceVersion): void {
  if (metrics.bytes > 10 * 1024 * 1024) {
    throw new Error(
      `MEDIAKIT_INPUT_TOO_LARGE: 输入图 ${(metrics.bytes / 1024 / 1024).toFixed(1)}MB 超过 10MB 限制`
    );
  }

  if (toolVersion === 'professional') {
    if (metrics.shortSide < 256 || metrics.longSide > 2048) {
      throw new Error(
        `MEDIAKIT_INPUT_SIZE_INVALID: professional 要求短边≥256 且长边≤2048，当前 ${metrics.width}x${metrics.height}`
      );
    }
  } else if (toolVersion === 'standard') {
    if (metrics.shortSide < 16 || metrics.shortSide > 1440 || metrics.longSide > 2160) {
      throw new Error(
        `MEDIAKIT_INPUT_SIZE_INVALID: standard 要求 16≤短边≤1440 且长边≤2160，当前 ${metrics.width}x${metrics.height}`
      );
    }
  } else if (toolVersion === 'max') {
    if (metrics.shortSide < 64 || metrics.longSide > 6240) {
      throw new Error(
        `MEDIAKIT_INPUT_SIZE_INVALID: max 要求短边≥64 且长边≤6240，当前 ${metrics.width}x${metrics.height}`
      );
    }
    const aspect = metrics.longSide / metrics.shortSide;
    if (aspect > 32) {
      throw new Error(
        `MEDIAKIT_INPUT_ASPECT_INVALID: max 要求长边/短边 ≤ 32，当前 ${aspect.toFixed(2)}`
      );
    }
  }
}

function assertExpandInput(metrics: ImageMetrics): void {
  if (metrics.bytes > 10 * 1024 * 1024) {
    throw new Error(
      `MEDIAKIT_INPUT_TOO_LARGE: 输入图 ${(metrics.bytes / 1024 / 1024).toFixed(1)}MB 超过 10MB 限制`
    );
  }
  if (metrics.longSide > 4160) {
    throw new Error(
      `MEDIAKIT_INPUT_SIZE_INVALID: 智能扩图要求长边≤4160，当前 ${metrics.width}x${metrics.height}`
    );
  }
}

export async function toPublicImageUrl(
  imageInput: string,
  filename: string,
  superbedToken?: string
): Promise<string> {
  if (/^https?:\/\//i.test(imageInput)) return imageInput;
  if (imageInput.startsWith('data:')) {
    return uploadBase64ToSuperbed(imageInput, filename, superbedToken);
  }
  throw new Error('MEDIAKIT_PUBLIC_IMAGE_REQUIRED: 输入图片必须是公网 URL 或 data URL');
}

export async function downloadMediaKitImage(imageUrl: string): Promise<{
  dataUrl: string;
  imageSize: number;
  width?: number;
  height?: number;
}> {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) {
    throw new Error(`MEDIAKIT_DOWNLOAD_FAILED: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
  let width: number | undefined;
  let height: number | undefined;
  try {
    const meta = await sharp(buffer).metadata();
    width = meta.width;
    height = meta.height;
  } catch {
    // 尺寸探测失败不阻断下载
  }
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    imageSize: buffer.length,
    width,
    height,
  };
}

export async function enhanceImageWithMediaKit(
  imageUrl: string,
  multiple: number,
  toolVersion?: MediaKitEnhanceVersion
): Promise<MediaKitImageResult & { tool_version: MediaKitEnhanceVersion; multiple: number }> {
  const metrics = await getImageMetrics(imageUrl);
  const resolvedVersion = toolVersion || pickEnhanceToolVersion(metrics, multiple);
  const resolvedMultiple = normalizeEnhanceMultiple(multiple, resolvedVersion);

  if (metrics) {
    assertEnhanceInput(metrics, resolvedVersion);
  }

  console.log(
    `[MediaKit] enhance-image version=${resolvedVersion} multiple=${resolvedMultiple}` +
      (metrics ? ` input=${metrics.width}x${metrics.height}` : ' input=unknown')
  );

  const result = await postMediaKit<MediaKitImageResult>('/tools-sync/enhance-image', {
    image_url: imageUrl,
    tool_version: resolvedVersion,
    multiple: resolvedMultiple,
  });

  return {
    ...result,
    tool_version: resolvedVersion,
    multiple: resolvedMultiple,
  };
}

export async function expandImageCanvasWithMediaKit(
  imageUrl: string,
  expand: { top: number; bottom: number; left: number; right: number }
): Promise<MediaKitImageResult & {
  expand_left: number;
  expand_right: number;
  expand_top: number;
  expand_bottom: number;
}> {
  const metrics = await getImageMetrics(imageUrl);
  if (metrics) {
    assertExpandInput(metrics);
  }

  const payload = {
    image_url: imageUrl,
    expand_left: clampExpandRatio(expand.left),
    expand_right: clampExpandRatio(expand.right),
    expand_top: clampExpandRatio(expand.top),
    expand_bottom: clampExpandRatio(expand.bottom),
  };

  console.log(
    `[MediaKit] expand-image-canvas L${payload.expand_left} R${payload.expand_right} T${payload.expand_top} B${payload.expand_bottom}` +
      (metrics ? ` input=${metrics.width}x${metrics.height}` : ' input=unknown')
  );

  // All-zero expand is a no-op request; short-circuit to avoid useless API calls.
  if (
    payload.expand_left === 0 &&
    payload.expand_right === 0 &&
    payload.expand_top === 0 &&
    payload.expand_bottom === 0
  ) {
    throw new Error('MEDIAKIT_EXPAND_RATIO_INVALID: 扩图四边比例均为 0，请提高扩展比例');
  }

  const result = await postMediaKit<MediaKitImageResult>('/tools-sync/expand-image-canvas', payload);
  return {
    ...result,
    ...payload,
  };
}

export async function generateProductSceneWithMediaKit(
  imageUrl: string,
  prompt: string,
  referenceImageUrl?: string,
  batchCount = 1
): Promise<MediaKitImageResult[]> {
  const payload: Record<string, unknown> = {
    image_url: imageUrl,
    tool_version: 'professional',
    prompt,
    batch_count: Math.min(6, Math.max(1, Math.floor(batchCount))),
  };
  if (referenceImageUrl) {
    payload.professional_reference_image_url = referenceImageUrl;
    payload.professional_reference_image_adapt_scale = 0.8;
  }
  const result = await postMediaKit<{ images: MediaKitImageResult[] }>(
    '/tools-sync/generate-product-scene-image',
    payload
  );
  return result.images || [];
}
