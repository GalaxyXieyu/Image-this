/**
 * AI 商品套图 Handler：一个任务串行生成整套图。
 */

import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import type { ToolParameters } from '@/types/workbench';
import {
  executeListingSet,
  type ListingSetResult,
} from '@/lib/workbench/listing-set-service';
import type { ListingImageType, ListingProductInfo } from '@/lib/workbench/listing-set';
import fs from 'fs/promises';

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  mimeType?: string;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset?.filePath) return null;
  try {
    const buffer = await fs.readFile(asset.filePath);
    return `data:${asset.mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const listingSetHandler = {
  name: 'listing_set',
  workflowType: 'listing_set' as const,

  validateInput(raw: unknown): ToolParameters {
    return (raw ?? {}) as ToolParameters;
  },

  async execute(
    ctx: WorkerContext,
    _input: ToolParameters,
    rawInput: Record<string, unknown>
  ): Promise<ListingSetResult> {
    const { task } = ctx;
    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const sourceImage =
      (await readAssetAsDataUrl(inputAsset)) ||
      (rawInput.imageUrl as string) ||
      inputAsset?.clientUrl ||
      '';
    if (!sourceImage) throw new Error('缺少商品图');

    return executeListingSet({
      userId: task.userId,
      taskId: task.id,
      sourceImage,
      product: (rawInput.product as ListingProductInfo) || {},
      setId: (rawInput.setId as string) || task.id,
      types: rawInput.types as ListingImageType[] | undefined,
      counts: rawInput.counts as Partial<Record<ListingImageType, number>> | undefined,
      prompts: rawInput.prompts as Partial<Record<ListingImageType, string | string[]>> | undefined,
      originalUrlForRecord: inputAsset?.clientUrl || (rawInput.imageUrl as string) || '',
      provider: rawInput.provider as string | undefined,
      modelName: rawInput.modelName as string | undefined,
    });
  },

  normalizeResult(result: ListingSetResult): Record<string, unknown> {
    return {
      setId: result.setId ?? null,
      results: result.results ?? [],
      processedImageId: result.processedImageId ?? null,
      processedImageUrl: result.processedImageUrl ?? null,
    };
  },
};

registerHandler(listingSetHandler);
