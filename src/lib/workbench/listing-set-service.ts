/**
 * AI 商品套图：单张图生成核心服务。
 * 被 typed handler（handlers/listing-set.ts）与 worker 兼容分支（processListingSet）共用。
 */

import { prisma } from '@/lib/prisma';
import { uploadBase64Image } from '@/lib/storage';
import {
  buildListingPrompt,
  type ListingImageType,
  type ListingProductInfo,
} from '@/lib/workbench/listing-set';

export interface ExecuteListingImageParams {
  userId: string;
  /** 原始商品图：data URL 或可访问 URL */
  sourceImage: string;
  listingType: ListingImageType;
  product: ListingProductInfo;
  /** 一套套图的分组 id，便于结果分组 */
  setId: string;
  originalUrlForRecord?: string;
  provider?: string;
  modelName?: string;
  onProgress?: (message: string, progress: number) => void | Promise<void>;
}

export interface ListingImageResult {
  processedImageId: string;
  processedImageUrl: string;
  listingType: ListingImageType;
  setId: string;
  prompt: string;
  usedModel: string;
}

async function callProvider(
  provider: string,
  sourceImage: string,
  prompt: string,
  userId: string,
  modelName?: string
): Promise<{ imageData: string; imageSize: number }> {
  const service = await import('@/lib/image-processor/service');
  if (provider === 'gpt') {
    const r = await service.processWithGPT(sourceImage, sourceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  if (provider === 'jimeng' || provider === 'seedream') {
    const r = await service.processWithJimeng(sourceImage, sourceImage, prompt, userId, modelName);
    return { imageData: r.imageData, imageSize: r.imageSize };
  }
  const imageData = await service.processWithGemini(sourceImage, sourceImage, prompt, userId, modelName);
  return { imageData: imageData || '', imageSize: imageData?.length || 0 };
}

export async function executeListingImage(params: ExecuteListingImageParams): Promise<ListingImageResult> {
  const provider = params.provider || 'gemini';
  const userId = params.userId;
  const prompt = buildListingPrompt(params.listingType, params.product);
  const usedModel = params.modelName || provider;

  await params.onProgress?.(`生成「${params.listingType}」中…`, 40);
  const result = await callProvider(provider, params.sourceImage, prompt, userId, params.modelName);
  if (!result.imageData) {
    throw new Error('套图生成未返回图像数据');
  }

  await params.onProgress?.('保存结果…', 85);
  const filename = `listing-${params.listingType}-${Date.now()}.jpg`;
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
        operation: 'listing_set',
        listingType: params.listingType,
        setId: params.setId,
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
    listingType: params.listingType,
    setId: params.setId,
    prompt,
    usedModel,
  };
}
