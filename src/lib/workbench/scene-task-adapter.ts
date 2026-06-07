import type { BackgroundReplaceParams, InputAssetRef, SceneWorkflowDraft } from '@/types/workbench';
import { adaptToLegacyTaskRequest, type CreateWorkflowTaskRequest } from '@/lib/workbench/api-contract';
import { getModelEntry, getFallbackChain } from '@/lib/ai-models';

export interface SceneTaskDraftInput extends SceneWorkflowDraft {
  inputAsset?: InputAssetRef;
  referenceAsset?: InputAssetRef;
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
    '参考图只用于场景氛围、构图、光线和背景风格，不要替换或复制参考图中的商品主体。',
    sceneBrief,
    '画面需要适合商品详情页、主图或营销素材，专业摄影，高质量，干净可商用。',
  ].filter(Boolean).join('\n');
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
export function buildSceneLegacyTaskRequest(input: SceneTaskDraftInput, candidateIndex = 0): LegacySceneTaskRequest {
  const [fallbackInputAsset, fallbackReferenceAsset] = input.inputAssets;
  const inputAsset = input.inputAsset ?? fallbackInputAsset;
  const referenceAsset = input.referenceAsset ?? fallbackReferenceAsset;

  if (!inputAsset) {
    throw new Error('请先上传商品图');
  }

  if (!referenceAsset) {
    throw new Error('请先上传至少一张参考图');
  }

  const selectedModel = input.parameters.aiModel;
  const modelEntry = getModelEntry(selectedModel);
  const provider = modelEntry?.provider ?? (selectedModel.startsWith('gpt') ? 'gpt' : selectedModel.startsWith('gemini') ? 'gemini' : 'jimeng');
  const fallbackModels = getFallbackChain(provider, selectedModel);

  const parameters: BackgroundReplaceParams = {
    prompt: buildScenePrompt(input),
    referenceAsset,
    aiModel: selectedModel,
    outputResolution: input.parameters.outputResolution,
  };

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
      sceneDraft: buildSceneWorkflowDraft(input),
      selectedPresetId: input.selectedPresetId,
      styleTemplateIds: input.styleTemplateIds ?? [],
      stylePreference: input.stylePreference ?? input.productInfo.stylePreference,
      candidateCount: input.parameters.candidateCount,
      candidateIndex,
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
  return Array.from({ length: count }, (_, index) => buildSceneLegacyTaskRequest(input, index));
}

/**
 * Build a typed workflow task request (contract v2) for POST /api/workflow/tasks.
 */
export function buildSceneWorkflowTaskRequest(input: SceneTaskDraftInput): SceneWorkflowTaskRequest {
  const [fallbackInputAsset, fallbackReferenceAsset] = input.inputAssets;
  const inputAsset = input.inputAsset ?? fallbackInputAsset;
  const referenceAsset = input.referenceAsset ?? fallbackReferenceAsset;

  if (!inputAsset) {
    throw new Error('请先上传商品图');
  }

  if (!referenceAsset) {
    throw new Error('请先上传至少一张参考图');
  }

  const parameters: BackgroundReplaceParams = {
    prompt: buildScenePrompt(input),
    referenceAsset,
    aiModel: input.parameters.aiModel,
    outputResolution: input.parameters.outputResolution,
  };

  return {
    workflowType: 'scene_generation',
    parameters,
    inputAssets: [inputAsset, referenceAsset],
    priority: 2,
    selectedPresetId: input.selectedPresetId,
    batchMode: input.batchMode,
  };
}

export function buildSceneWorkflowTaskRequests(input: SceneTaskDraftInput): SceneWorkflowTaskRequest[] {
  const count = Math.max(1, input.parameters.candidateCount || 1);
  return Array.from({ length: count }, () => buildSceneWorkflowTaskRequest(input));
}

export function appendInputAsset(assets: InputAssetRef[], role: 'input' | 'reference', asset: InputAssetRef) {
  if (role === 'input') {
    return [asset, ...assets.slice(1)];
  }

  const inputAsset = assets[0];
  return inputAsset ? [inputAsset, asset] : [asset];
}