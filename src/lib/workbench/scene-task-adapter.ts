import type { BackgroundReplaceParams, InputAssetRef, SceneWorkflowDraft } from '@/types/workbench';
import { adaptToLegacyTaskRequest, type CreateWorkflowTaskRequest } from '@/lib/workbench/api-contract';
import { getModelEntry, getFallbackChain } from '@/lib/ai-models';

export interface SceneTaskDraftInput extends SceneWorkflowDraft {
  inputAsset?: InputAssetRef;
  referenceAsset?: InputAssetRef;
  productAssets?: InputAssetRef[];
  styleTemplateIds?: string[];
  stylePreference?: string;
  sellingPoints?: string;
}

export interface LegacySceneTaskRequest {
  type: string;
  inputData: string;
  priority: number;
  projectId?: string;
  totalSteps: number;
}

/** Typed workflow task request for POST /api/workflow/tasks (contract v2) */
export interface SceneWorkflowTaskRequest {
  workflowType: 'scene_generation';
  parameters: BackgroundReplaceParams;
  inputAssets: InputAssetRef[];
  priority: number;
  projectId?: string;
  selectedPresetId?: string;
  batchMode?: boolean;
}

function joinText(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join('，');
}

function buildScenePrompt(draft: SceneTaskDraftInput) {
  const productInfo = draft.productInfo;
  const parameters = draft.parameters;
  const hasReferenceAsset = Boolean(resolveReferenceAsset(draft));
  const sceneBrief = joinText([
    productInfo.name ? `商品：${productInfo.name}` : undefined,
    productInfo.category ? `品类：${productInfo.category}` : undefined,
    productInfo.description,
    productInfo.targetPlatform ? `目标平台：${productInfo.targetPlatform}` : undefined,
    draft.stylePreference || productInfo.stylePreference ? `视觉风格：${draft.stylePreference || productInfo.stylePreference}` : undefined,
    draft.sellingPoints ? `核心卖点：${draft.sellingPoints}` : undefined,
    `输出尺寸：${parameters.outputResolution}`,
  ]);

  return [
    '生成电商商品场景图，保持第一张商品主体的外观、比例、材质、品牌特征和数量稳定。',
    hasReferenceAsset
      ? '参考图只用于场景氛围、构图、光线和背景风格，不要替换或复制参考图中的商品主体。'
      : '没有额外参考图时，请根据商品信息自动生成干净、协调、可商用的场景背景。',
    sceneBrief,
    '画面需要适合商品详情页、主图或营销素材，专业摄影，高质量，干净可商用。',
  ].filter(Boolean).join('\n');
}

function uniqueAssets(assets: InputAssetRef[]) {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.assetId)) return false;
    seen.add(asset.assetId);
    return true;
  });
}

function resolveReferenceAsset(input: SceneTaskDraftInput) {
  if (input.referenceAsset) return input.referenceAsset;
  const [, fallbackReferenceAsset] = input.inputAssets;
  return fallbackReferenceAsset;
}

function resolveProductAssets(input: SceneTaskDraftInput) {
  if (input.productAssets?.length) {
    return uniqueAssets(input.productAssets);
  }

  if (input.inputAsset) {
    return [input.inputAsset];
  }

  const [fallbackInputAsset] = input.inputAssets;
  return fallbackInputAsset ? [fallbackInputAsset] : [];
}

export function buildSceneWorkflowDraft(input: SceneTaskDraftInput): SceneWorkflowDraft {
  return {
    productInfo: input.productInfo,
    inputAssets: input.inputAssets,
    selectedPresetId: input.selectedPresetId,
    batchMode: input.batchMode,
    parameters: input.parameters,
  };
}

/**
 * Build a legacy task request (contract v1) for POST /api/tasks.
 * Kept for backward compatibility.
 */
export function buildSceneLegacyTaskRequest(
  input: SceneTaskDraftInput,
  candidateIndex = 0,
  productAssetIndex = 0
): LegacySceneTaskRequest {
  const [fallbackInputAsset] = input.inputAssets;
  const inputAsset = input.inputAsset ?? fallbackInputAsset;
  const referenceAsset = resolveReferenceAsset(input);

  if (!inputAsset) {
    throw new Error('请先上传商品图');
  }

  const selectedModel = input.parameters.aiModel;
  const modelEntry = getModelEntry(selectedModel);
  const provider = modelEntry?.provider ?? (selectedModel.startsWith('gpt') ? 'gpt' : selectedModel.startsWith('gemini') ? 'gemini' : 'jimeng');
  const fallbackModels = getFallbackChain(provider, selectedModel);

  const parameters: BackgroundReplaceParams = {
    prompt: buildScenePrompt(input),
    aiModel: selectedModel,
    outputResolution: input.parameters.outputResolution,
  };
  if (referenceAsset) {
    parameters.referenceAsset = referenceAsset;
  }

  const workflowRequest: CreateWorkflowTaskRequest = {
    workflowType: 'scene_generation',
    inputAssets: [inputAsset],
    parameters,
    priority: 2,
  };

  const legacy = adaptToLegacyTaskRequest(workflowRequest);
  const parsedInput = JSON.parse(legacy.inputData) as Record<string, unknown>;

  return {
    ...legacy,
    inputData: JSON.stringify({
      ...parsedInput,
      workflowType: 'scene_generation',
      sceneDraft: buildSceneWorkflowDraft({
        ...input,
        inputAssets: [inputAsset, referenceAsset].filter((asset): asset is InputAssetRef => Boolean(asset)),
      }),
      selectedPresetId: input.selectedPresetId,
      styleTemplateIds: input.styleTemplateIds ?? [],
      stylePreference: input.stylePreference ?? input.productInfo.stylePreference,
      candidateCount: input.parameters.candidateCount,
      candidateIndex,
      productAssetIndex,
      productAssetId: inputAsset.assetId,
      productAssetName: inputAsset.originalFilename,
      batchMode: input.batchMode,
      provider,
      modelName: selectedModel,
      fallbackModels,
    }),
    totalSteps: 1,
  };
}

export function buildSceneLegacyTaskRequests(input: SceneTaskDraftInput): LegacySceneTaskRequest[] {
  const count = Math.max(1, input.parameters.candidateCount || 1);
  const productAssets = resolveProductAssets(input);
  if (productAssets.length === 0) {
    return [buildSceneLegacyTaskRequest(input, 0)];
  }

  return productAssets.flatMap((asset, productIndex) =>
    Array.from({ length: count }, (_, candidateIndex) =>
      buildSceneLegacyTaskRequest(
        {
          ...input,
          inputAsset: asset,
        },
        candidateIndex,
        productIndex
      )
    )
  );
}

/**
 * Build a typed workflow task request (contract v2) for POST /api/workflow/tasks.
 */
export function buildSceneWorkflowTaskRequest(input: SceneTaskDraftInput): SceneWorkflowTaskRequest {
  const [fallbackInputAsset] = input.inputAssets;
  const inputAsset = input.inputAsset ?? fallbackInputAsset;
  const referenceAsset = resolveReferenceAsset(input);

  if (!inputAsset) {
    throw new Error('请先上传商品图');
  }

  const parameters: BackgroundReplaceParams = {
    prompt: buildScenePrompt(input),
    aiModel: input.parameters.aiModel,
    outputResolution: input.parameters.outputResolution,
  };
  if (referenceAsset) {
    parameters.referenceAsset = referenceAsset;
  }

  return {
    workflowType: 'scene_generation',
    parameters,
    inputAssets: [inputAsset, referenceAsset].filter((asset): asset is InputAssetRef => Boolean(asset)),
    priority: 2,
    selectedPresetId: input.selectedPresetId,
    batchMode: input.batchMode,
  };
}

export function buildSceneWorkflowTaskRequests(input: SceneTaskDraftInput): SceneWorkflowTaskRequest[] {
  const count = Math.max(1, input.parameters.candidateCount || 1);
  const productAssets = resolveProductAssets(input);
  if (productAssets.length === 0) {
    return [buildSceneWorkflowTaskRequest(input)];
  }

  return productAssets.flatMap((asset) =>
    Array.from({ length: count }, () =>
      buildSceneWorkflowTaskRequest({
        ...input,
        inputAsset: asset,
      })
    )
  );
}

export function appendInputAsset(assets: InputAssetRef[], role: 'input' | 'reference', asset: InputAssetRef) {
  if (role === 'input') {
    return [asset, ...assets.slice(1)];
  }

  const inputAsset = assets[0];
  return inputAsset ? [inputAsset, asset] : [asset];
}
