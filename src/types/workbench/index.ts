/**
 * Workbench Domain Types
 *
 * Typed entities for the new AI product visual workbench.
 * Separates client draft state from persisted task/result state.
 */

// ---------------------------------------------------------------------------
// Asset & Input References
// ---------------------------------------------------------------------------

/** Reference to an uploaded input asset (reuses existing input-asset pattern) */
export interface InputAssetRef {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

/** A generated or processed output asset */
export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Workflow Entities
// ---------------------------------------------------------------------------

/** Scene workflow: product info -> generate candidates -> adjust results */
export interface SceneWorkflow {
  id: string;
  name: string;
  status: SceneWorkflowStatus;
  steps: SceneWorkflowStep[];
  currentStepIndex: number;
  productInfo: ProductInfo;
  inputAssets: InputAssetRef[];
  generatedAssets: GeneratedAsset[];
  selectedAssetIds: string[];
  batchMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SceneWorkflowStatus =
  | 'draft'
  | 'ready'
  | 'generating'
  | 'reviewing'
  | 'completed'
  | 'failed';

export interface SceneWorkflowStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
}

/** Product information captured in scene workflow step 1 */
export interface ProductInfo {
  name: string;
  category?: string;
  description?: string;
  targetPlatform?: 'taobao' | 'tmall' | 'jd' | 'pdd' | 'douyin' | 'other';
  stylePreference?: string;
}

// ---------------------------------------------------------------------------
// Tool Run
// ---------------------------------------------------------------------------

/** A single tool execution (background, watermark, upscale, outpaint) */
export interface ToolRun {
  id: string;
  toolType: ToolType;
  status: ToolRunStatus;
  inputAssets: InputAssetRef[];
  parameters: ToolParameters;
  outputAssets: GeneratedAsset[];
  progress: number;
  currentStep: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export type ToolType =
  | 'background_replace'
  | 'watermark'
  | 'upscale'
  | 'outpaint'
  | 'one_click';

export type ToolRunStatus =
  | 'draft'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Union of all tool parameter shapes */
export type ToolParameters =
  | BackgroundReplaceParams
  | WatermarkParams
  | UpscaleParams
  | OutpaintParams
  | OneClickParams;

export interface BackgroundReplaceParams {
  prompt: string;
  referenceAsset?: InputAssetRef;
  aiModel: string;
  outputResolution: string;
}

export interface WatermarkParams {
  watermarkType: 'text' | 'logo';
  watermarkText: string;
  watermarkLogoAsset?: InputAssetRef;
  watermarkOpacity: number;
  watermarkPosition:
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  outputResolution: string;
}

export interface UpscaleParams {
  upscaleFactor: number;
  aiModel: string;
  outputResolution: string;
}

export interface OutpaintParams {
  xScale: number;
  yScale: number;
  prompt: string;
  aiModel: string;
  outputResolution: string;
}

export interface OneClickParams {
  enableBackgroundReplace: boolean;
  enableOutpaint: boolean;
  enableUpscale: boolean;
  enableWatermark: boolean;
  backgroundPrompt: string;
  outpaintPrompt: string;
  xScale: number;
  yScale: number;
  upscaleFactor: number;
  watermarkParams?: WatermarkParams;
  aiModel: string;
  outputResolution: string;
}

// ---------------------------------------------------------------------------
// Template / Preset
// ---------------------------------------------------------------------------

/** Template preset for scene or tool configurations */
export interface TemplatePreset {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  thumbnailUrl?: string;
  tags: string[];
  /** For scene templates: product info defaults */
  productInfo?: Partial<ProductInfo>;
  /** For tool templates: parameter defaults */
  toolParameters?: Partial<ToolParameters>;
  /** Prompt template if applicable */
  promptTemplate?: string;
  isSystem: boolean;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TemplateCategory =
  | 'scene'
  | 'background'
  | 'watermark'
  | 'upscale'
  | 'outpaint'
  | 'one_click'
  | 'prompt';

// ---------------------------------------------------------------------------
// Batch Group
// ---------------------------------------------------------------------------

/** Groups multiple tasks for batch processing and result management */
export interface BatchGroup {
  id: string;
  name: string;
  workflowType: 'scene' | 'tool';
  status: BatchGroupStatus;
  taskIds: string[];
  inputAssetCount: number;
  completedCount: number;
  failedCount: number;
  totalCount: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export type BatchGroupStatus =
  | 'pending'
  | 'processing'
  | 'partial'
  | 'completed'
  | 'failed';

// ---------------------------------------------------------------------------
// Workflow Task (typed bridge to TaskQueue)
// ---------------------------------------------------------------------------

/** Client-side workflow task that maps to TaskQueue */
export interface WorkflowTask {
  id: string;
  workflowType: WorkflowType;
  status: WorkflowTaskStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  inputAssets: InputAssetRef[];
  outputAssets: GeneratedAsset[];
  errorMessage?: string;
  batchGroupId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type WorkflowType =
  | 'scene_generation'
  | 'background_replace'
  | 'watermark'
  | 'upscale'
  | 'outpaint'
  | 'one_click'
  | 'video_generation';

export type WorkflowTaskStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Lightweight task summary returned by list/status endpoints */
export interface WorkflowTaskSummary {
  id: string;
  workflowType: WorkflowType;
  status: WorkflowTaskStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errorMessage?: string;
  originalImageUrl?: string | null;
  resultImageUrl?: string | null;
  videoUrl?: string | null;
  batchGroupId?: string;
  projectId?: string;
  processedImageId?: string;
  originalName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Draft State (client-only, not persisted)
// ---------------------------------------------------------------------------

/** Client draft state for a scene workflow before submission */
export interface SceneWorkflowDraft {
  productInfo: ProductInfo;
  inputAssets: InputAssetRef[];
  selectedPresetId?: string;
  batchMode: boolean;
  parameters: {
    aiModel: string;
    outputResolution: string;
    candidateCount: number;
  };
}

/** Client draft state for a tool run before submission */
export interface ToolRunDraft {
  toolType: ToolType;
  inputAssets: InputAssetRef[];
  parameters: ToolParameters;
  batchMode: boolean;
}

// ---------------------------------------------------------------------------
// Compatibility Adapter Types
// ---------------------------------------------------------------------------

/** Maps new workflow types to legacy TaskQueue.type values */
export const WORKFLOW_TO_LEGACY_TYPE: Record<WorkflowType, string> = {
  scene_generation: 'BACKGROUND_REMOVAL', // scene uses background removal as base
  background_replace: 'BACKGROUND_REMOVAL',
  watermark: 'WATERMARK',
  upscale: 'IMAGE_UPSCALING',
  outpaint: 'IMAGE_EXPANSION',
  one_click: 'ONE_CLICK_WORKFLOW',
  video_generation: 'VIDEO_GENERATION',
};

/** Reverse map from legacy type to workflow type */
export function legacyTypeToWorkflowType(legacyType: string): WorkflowType {
  const map: Record<string, WorkflowType> = {
    BACKGROUND_REMOVAL: 'background_replace',
    WATERMARK: 'watermark',
    IMAGE_UPSCALING: 'upscale',
    IMAGE_EXPANSION: 'outpaint',
    ONE_CLICK_WORKFLOW: 'one_click',
    VIDEO_GENERATION: 'video_generation',
  };
  return map[legacyType] || 'background_replace';
}

/** Builds legacy inputData JSON from typed tool parameters */
export function buildLegacyInputData(
  workflowType: WorkflowType,
  inputAssets: InputAssetRef[],
  parameters: ToolParameters
): string {
  const base: Record<string, unknown> = {
    inputAsset: inputAssets[0] ?? null,
  };

  switch (workflowType) {
    case 'background_replace':
    case 'scene_generation': {
      const p = parameters as BackgroundReplaceParams;
      return JSON.stringify({
        ...base,
        referenceAsset: p.referenceAsset ?? null,
        customPrompt: p.prompt,
        aiModel: p.aiModel,
        outputResolution: p.outputResolution,
      });
    }
    case 'watermark': {
      const p = parameters as WatermarkParams;
      return JSON.stringify({
        ...base,
        watermarkLogoAsset: p.watermarkLogoAsset ?? null,
        watermarkType: p.watermarkType,
        watermarkText: p.watermarkText,
        watermarkOpacity: p.watermarkOpacity,
        watermarkPosition: p.watermarkPosition,
        outputResolution: p.outputResolution,
      });
    }
    case 'upscale': {
      const p = parameters as UpscaleParams;
      return JSON.stringify({
        ...base,
        upscaleFactor: p.upscaleFactor,
        aiModel: p.aiModel,
        outputResolution: p.outputResolution,
      });
    }
    case 'outpaint': {
      const p = parameters as OutpaintParams;
      return JSON.stringify({
        ...base,
        xScale: p.xScale,
        yScale: p.yScale,
        prompt: p.prompt,
        aiModel: p.aiModel,
        outputResolution: p.outputResolution,
      });
    }
    case 'one_click': {
      const p = parameters as OneClickParams;
      return JSON.stringify({
        ...base,
        enableBackgroundReplace: p.enableBackgroundReplace,
        enableOutpaint: p.enableOutpaint,
        enableUpscale: p.enableUpscale,
        enableWatermark: p.enableWatermark,
        backgroundPrompt: p.backgroundPrompt,
        outpaintPrompt: p.outpaintPrompt,
        xScale: p.xScale,
        yScale: p.yScale,
        upscaleFactor: p.upscaleFactor,
        watermarkLogoAsset: p.watermarkParams?.watermarkLogoAsset ?? null,
        watermarkType: p.watermarkParams?.watermarkType ?? 'text',
        watermarkText: p.watermarkParams?.watermarkText ?? '',
        watermarkOpacity: p.watermarkParams?.watermarkOpacity ?? 0.3,
        watermarkPosition: p.watermarkParams?.watermarkPosition ?? 'bottom-right',
        aiModel: p.aiModel,
        outputResolution: p.outputResolution,
      });
    }
    case 'video_generation': {
      // Video uses its own parameter shape; kept minimal for compatibility
      return JSON.stringify({
        ...base,
        ...parameters,
      });
    }
    default:
      return JSON.stringify(base);
  }
}
