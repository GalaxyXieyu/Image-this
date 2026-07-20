import { uploadBase64ToSuperbed } from '@/lib/superbed-upload';

const MEDIAKIT_BASE_URL = process.env.MEDIAKIT_BASE_URL || 'https://mediakit.cn-beijing.volces.com/api/v1';

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
};

function getMediaKitApiKey(): string {
  const apiKey = process.env.MEDIAKIT_API_KEY || process.env.VOLCENGINE_MEDIAKIT_API_KEY;
  if (!apiKey) {
    throw new Error('MEDIAKIT_NOT_CONFIGURED: 请在生产环境配置 MEDIAKIT_API_KEY');
  }
  return apiKey;
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
    throw new Error(`MEDIAKIT_INVALID_RESPONSE: HTTP ${response.status}`);
  }

  if (!response.ok || data.success === false || !data.result) {
    const message = data.message || raw.slice(0, 500) || `HTTP ${response.status}`;
    throw new Error(`MEDIAKIT_REQUEST_FAILED: ${message}`);
  }

  return data.result;
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

export async function downloadMediaKitImage(imageUrl: string): Promise<{ dataUrl: string; imageSize: number }> {
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(180_000) });
  if (!response.ok) {
    throw new Error(`MEDIAKIT_DOWNLOAD_FAILED: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
  return {
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    imageSize: buffer.length,
  };
}

export async function enhanceImageWithMediaKit(
  imageUrl: string,
  multiple: number,
  toolVersion: 'standard' | 'professional' | 'max' = 'professional'
): Promise<MediaKitImageResult> {
  return postMediaKit<MediaKitImageResult>('/tools-sync/enhance-image', {
    image_url: imageUrl,
    tool_version: toolVersion,
    multiple,
  });
}

export async function expandImageCanvasWithMediaKit(
  imageUrl: string,
  expand: { top: number; bottom: number; left: number; right: number }
): Promise<MediaKitImageResult> {
  return postMediaKit<MediaKitImageResult>('/tools-sync/expand-image-canvas', {
    image_url: imageUrl,
    expand_left: Math.min(0.4, Math.max(0, expand.left)),
    expand_right: Math.min(0.4, Math.max(0, expand.right)),
    expand_top: Math.min(0.4, Math.max(0, expand.top)),
    expand_bottom: Math.min(0.4, Math.max(0, expand.bottom)),
  });
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
