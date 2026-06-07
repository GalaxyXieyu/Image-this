import type {
  BackgroundReplaceParams,
  InputAssetRef,
  OutpaintParams,
  ToolParameters,
  ToolType,
  UpscaleParams,
  WatermarkParams,
} from '@/types/workbench';
import { adaptToLegacyTaskRequest, type CreateWorkflowTaskRequest } from '@/lib/workbench/api-contract';

export interface ToolTaskDraftInput {
  toolType: ToolType;
  inputAsset: InputAssetRef;
  referenceAsset?: InputAssetRef;
  watermarkLogoAsset?: InputAssetRef;
  parameters: ToolParameters;
  selectedPresetId?: string;
  batchMode?: boolean;
}

export interface LegacyToolTaskRequest {
  type: string;
  inputData: string;
  priority: number;
  projectId?: string;
  totalSteps: number;
}

/** Typed workflow task request for POST /api/workflow/tasks (contract v2) */
export interface ToolWorkflowTaskRequest {
  workflowType: ToolType;
  parameters: ToolParameters;
  inputAssets: InputAssetRef[];
  priority: number;
  projectId?: string;
  selectedPresetId?: string;
  batchMode?: boolean;
}

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  background_replace: 'AI换背景',
  watermark: '加水印',
  upscale: '高清放大',
  outpaint: '智能扩图',
  one_click: '一键处理',
  video_generation: '视频生成',
};

export const TOOL_PROCESS_TYPE_MAP: Partial<Record<ToolType, string>> = {
  background_replace: 'BACKGROUND_REMOVAL',
  watermark: 'WATERMARK',
  upscale: 'IMAGE_UPSCALING',
  outpaint: 'IMAGE_EXPANSION',
};

export function buildDefaultToolParameters(toolType: ToolType): ToolParameters {
  switch (toolType) {
    case 'watermark':
      return {
        watermarkType: 'text',
        watermarkText: '品牌名称',
        watermarkOpacity: 0.3,
        watermarkPosition: 'bottom-right',
        outputResolution: '1024x1024',
      } satisfies WatermarkParams;
    case 'upscale':
      return {
        upscaleFactor: 2,
        aiModel: 'volcengine',
        outputResolution: '2x',
      } satisfies UpscaleParams;
    case 'outpaint':
      return {
        xScale: 1.5,
        yScale: 1.5,
        prompt: '自然延展画面边缘，保持商品主体稳定，适合电商详情图',
        aiModel: 'volcengine',
        outputResolution: '1024x1024',
      } satisfies OutpaintParams;
    case 'background_replace':
    default:
      return {
        prompt: 'clean ecommerce product scene background, studio lighting, professional photography',
        aiModel: 'gemini-3.1-flash-image-preview',
        outputResolution: '1024x1024',
      } satisfies BackgroundReplaceParams;
  }
}

/**
 * Build a legacy task request (contract v1) for POST /api/tasks.
 * Kept for backward compatibility.
 */
export function buildToolLegacyTaskRequest(input: ToolTaskDraftInput): LegacyToolTaskRequest {
  const parameters = mergeAssetParameters(input);
  const workflowRequest: CreateWorkflowTaskRequest = {
    workflowType: input.toolType,
    inputAssets: [input.inputAsset],
    parameters,
    priority: 2,
  };
  const legacy = adaptToLegacyTaskRequest(workflowRequest);
  const parsedInput = JSON.parse(legacy.inputData) as Record<string, unknown>;

  return {
    ...legacy,
    inputData: JSON.stringify({
      ...parsedInput,
      workflowType: input.toolType,
      selectedPresetId: input.selectedPresetId,
      batchMode: input.batchMode ?? false,
      toolDraft: {
        toolType: input.toolType,
        inputAssets: [input.inputAsset],
        parameters,
        batchMode: input.batchMode ?? false,
      },
    }),
    totalSteps: 1,
  };
}

/**
 * Build a typed workflow task request (contract v2) for POST /api/workflow/tasks.
 */
export function buildToolWorkflowTaskRequest(input: ToolTaskDraftInput): ToolWorkflowTaskRequest {
  const parameters = mergeAssetParameters(input);
  return {
    workflowType: input.toolType,
    parameters,
    inputAssets: [input.inputAsset],
    priority: 2,
    selectedPresetId: input.selectedPresetId,
    batchMode: input.batchMode ?? false,
  };
}

function mergeAssetParameters(input: ToolTaskDraftInput): ToolParameters {
  if (input.toolType === 'background_replace') {
    return {
      ...(input.parameters as BackgroundReplaceParams),
      referenceAsset: input.referenceAsset ?? (input.parameters as BackgroundReplaceParams).referenceAsset,
    };
  }

  if (input.toolType === 'watermark') {
    return {
      ...(input.parameters as WatermarkParams),
      watermarkLogoAsset: input.watermarkLogoAsset ?? (input.parameters as WatermarkParams).watermarkLogoAsset,
    };
  }

  return input.parameters;
}

export function normalizePresetToolType(toolType?: string | null): ToolType {
  if (toolType === 'background') return 'background_replace';
  if (toolType === 'watermark') return 'watermark';
  if (toolType === 'upscale') return 'upscale';
  if (toolType === 'outpaint') return 'outpaint';
  if (toolType === 'video') return 'video_generation';
  if (
    toolType === 'background_replace' ||
    toolType === 'one_click' ||
    toolType === 'video_generation'
  ) {
    return toolType;
  }
  return 'background_replace';
}