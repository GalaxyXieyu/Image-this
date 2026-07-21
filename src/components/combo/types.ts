import type { InputAssetRef } from "@/types/workbench";

export type StepType = "scene" | "background" | "upscale" | "watermark" | "outpaint" | "workflow";
export type ExecutableStepType = Exclude<StepType, "workflow">;

export interface SceneParams {
  sceneStyle: string;
  candidateCount: number;
  customPrompt?: string;
}

export interface BackgroundParams {
  bgType: string;
  featherEdge: number;
  keepShadow: boolean;
  referenceAsset?: InputAssetRef;
  customPrompt?: string;
}

export interface UpscaleParams {
  factor: number;
  denoise: number;
}

export type WatermarkPresetPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export interface WatermarkCustomPosition {
  x: number;
  y: number;
  editorWidth: number;
  editorHeight: number;
}

export interface WatermarkParams {
  type?: "text" | "logo";
  content: string;
  logoAsset?: InputAssetRef;
  /** 水印大小：占图宽比例（0.05~0.6），缺省 0.2 */
  sizeRatio?: number;
  position: WatermarkPresetPosition | "custom";
  opacity: number;
  customPosition?: WatermarkCustomPosition;
}

export interface OutpaintParams {
  direction: string;
  ratio: number;
}

export interface WorkflowParams {}

export type StepParams =
  | { type: "scene"; params: SceneParams }
  | { type: "background"; params: BackgroundParams }
  | { type: "upscale"; params: UpscaleParams }
  | { type: "watermark"; params: WatermarkParams }
  | { type: "outpaint"; params: OutpaintParams }
  | { type: "workflow"; params: WorkflowParams };

export interface WorkflowStep {
  id: string;
  order: number;
  type: StepType;
  name: string;
  description: string;
  params: StepParams["params"];
  /**
   * 工作流嵌套：引用被嵌入的 WorkflowTemplate.id。
   * 执行时递归展开为扁平步骤（需环检测/深度限制）。
   */
  refTemplateId?: string;
}

export interface WatermarkCanvasPlan {
  canvasWidth: number;
  canvasHeight: number;
  aspect: number;
  sourceRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1" },
  { id: "3:4", label: "3:4" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
] as const;

export const RESOLUTIONS = [
  { id: "1k", label: "1K · 标准" },
  { id: "2k", label: "2K · 推荐" },
  { id: "4k", label: "4K · 超清" },
] as const;

export type ImageModelOption = { provider: string; modelName: string };
