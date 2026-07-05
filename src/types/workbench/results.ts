/**
 * Typed workflow result contracts.
 *
 * Each handler produces a structured result that gets normalized
 * before storage in TaskQueue.outputData.
 */

export interface WorkflowResult {
  processedImageId?: string;
  processedImageUrl?: string;
  usedModel?: string;
  prompt?: string;
}

export interface BackgroundReplaceResult extends WorkflowResult {
  // No additional fields beyond base
}

export interface UpscaleResult extends WorkflowResult {
  upscaleFactor?: number;
}

export interface OutpaintResult extends WorkflowResult {
  expandRatio?: string;
}

export interface WatermarkResult extends WorkflowResult {
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkPosition?: string | { x: number; y: number; width?: number; height?: number; editorWidth?: number; editorHeight?: number };
  watermarkType?: string;
  outputResolution?: string;
}

export interface OneClickResult extends WorkflowResult {
  processSteps?: string[];
  settings?: Record<string, unknown>;
}

export interface VideoGenerationResult {
  videoUrl: string;
  jimengTaskId?: string;
  prompt?: string;
  frames?: number;
  aspectRatio?: string;
}

export type AnyWorkflowResult =
  | WorkflowResult
  | BackgroundReplaceResult
  | UpscaleResult
  | OutpaintResult
  | WatermarkResult
  | OneClickResult
  | VideoGenerationResult;
