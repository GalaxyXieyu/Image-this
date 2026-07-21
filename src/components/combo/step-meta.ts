import {
  Droplets,
  Expand,
  Image as ImageIcon,
  Layers,
  Wand2,
  ZoomIn,
} from "lucide-react";
import type {
  BackgroundParams,
  ExecutableStepType,
  OutpaintParams,
  SceneParams,
  StepParams,
  StepType,
  UpscaleParams,
  WatermarkParams,
  WorkflowStep,
} from "@/components/combo/types";

export const STEP_META: Record<
  StepType,
  { icon: React.ElementType; name: string; description: string }
> = {
  scene: {
    icon: ImageIcon,
    name: "生成场景图",
    description: "流水线起点：先按场景模板生成底图，后续步骤在此基础上加工",
  },
  background: {
    icon: Wand2,
    name: "AI 换背景",
    description: "智能替换背景，融合光影",
  },
  upscale: {
    icon: ZoomIn,
    name: "高清放大",
    description: "AI 超分辨率放大，提升清晰度",
  },
  watermark: {
    icon: Droplets,
    name: "水印与尺寸",
    description: "添加品牌水印，调整输出尺寸",
  },
  outpaint: {
    icon: Expand,
    name: "智能扩图",
    description: "智能扩展画布，补充画面内容",
  },
  workflow: {
    icon: Layers,
    name: "嵌入工作流",
    description: "把一个已保存的工作流作为一步",
  },
};

export const DEFAULT_PARAMS: Record<ExecutableStepType, StepParams["params"]> = {
  scene: { sceneStyle: "natural", candidateCount: 4, customPrompt: "" } as SceneParams,
  background: { bgType: "studio", featherEdge: 8, keepShadow: true } as BackgroundParams,
  upscale: { factor: 2, denoise: 30 } as UpscaleParams,
  watermark: { content: "@品牌名", position: "bottom-right", opacity: 70 } as WatermarkParams,
  outpaint: { direction: "all", ratio: 25 } as OutpaintParams,
};

export const INITIAL_STEPS: WorkflowStep[] = [
  {
    id: "s1",
    order: 1,
    type: "scene",
    ...STEP_META.scene,
    params: { ...DEFAULT_PARAMS.scene },
  },
  {
    id: "s2",
    order: 2,
    type: "background",
    ...STEP_META.background,
    params: { ...DEFAULT_PARAMS.background },
  },
  {
    id: "s3",
    order: 3,
    type: "watermark",
    ...STEP_META.watermark,
    params: { ...DEFAULT_PARAMS.watermark },
  },
];
