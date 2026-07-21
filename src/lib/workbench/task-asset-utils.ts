import { uploadBase64Image } from "@/lib/storage";
import fs from "fs/promises";
import path from "path";

export type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type ParsedTaskInput = Record<string, any> & {
  inputAsset?: TaskAssetRef;
  referenceAsset?: TaskAssetRef;
  watermarkLogoAsset?: TaskAssetRef;
};

export type QueueTaskForProcessing = {
  id: string;
  type: string;
  inputData: string;
  totalSteps: number;
  userId: string;
  retryCount?: number;
  maxRetries?: number;
  contractVersion?: number;
  workflowType?: string | null;
  handlerName?: string | null;
  // 本次抢占的执行指纹（= claim 时写入的 startedAt）。
  // 终态回写/心跳都用它做 fence：任务若被 sweep 回收后重新抢占，
  // 旧执行的回写因 startedAt 不匹配而失效，防止僵尸执行覆盖状态或重新入队。
  claimedAt: Date;
};

export type PersistedTaskResult = {
  processedImageId?: string | null;
  processedImageUrl?: string | null;
  usedModel?: string | null;
  prompt?: string | null;
  videoUrl?: string;
  jimengTaskId?: string;
  frames?: unknown;
  aspectRatio?: string;
};

export async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset) return null;
  const mimeType = asset.mimeType || 'application/octet-stream';

  // 候选路径：先试存下来的绝对 filePath；但生产每次部署换 release 目录、filePath 里
  // 烧死了旧 release 路径，重新部署后失效。public/uploads 跨部署持久，用 clientUrl 相对
  // 当前进程重解析即可读到 → 让中断/续跑任务不因换版本而丢源图。
  const candidates: string[] = [];
  if (asset.filePath) candidates.push(asset.filePath);
  if (asset.clientUrl) {
    let rel = asset.clientUrl.replace(/^\/+/, '');
    if (rel.startsWith('api/files/')) rel = rel.slice('api/files/'.length);
    candidates.push(
      rel.startsWith('uploads/')
        ? path.join(process.cwd(), 'public', rel)
        : path.join(process.cwd(), 'public', 'uploads', rel)
    );
  }

  for (const p of candidates) {
    try {
      const buffer = await fs.readFile(p);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      // 尝试下一个候选路径
    }
  }
  return null;
}

export async function resolveTaskInputData(rawInputData: string): Promise<ParsedTaskInput> {
  return JSON.parse(rawInputData) as ParsedTaskInput;
}

export function getAssetClientUrl(asset?: TaskAssetRef): string {
  return asset?.clientUrl || '';
}

export async function persistRecordUrl(source: string | undefined, filename: string, userId: string): Promise<string> {
  if (!source) {
    return '';
  }

  if (source.startsWith('data:')) {
    return uploadBase64Image(source, filename, userId);
  }

  return source;
}

