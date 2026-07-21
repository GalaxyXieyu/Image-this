import type {
  BackgroundParams,
  OutpaintParams,
  SceneParams,
  StepParams,
  UpscaleParams,
  WatermarkParams,
  WorkflowStep,
} from "@/components/combo/types";
import { buildBackgroundPrompt } from "@/components/combo/step-params";

export function normalizeStepTaskInput(
  step: WorkflowStep,
  global: {
    aspectRatio: string;
    resolution: string;
    watermarkEnabled: boolean;
    autoRetry: boolean;
    aiModel?: string;   // provider（全局注入）
    model?: string;     // 具体模型 id（全局注入）
  }
) {
  const params = step.params as Record<string, unknown>;
  const baseInput = {
    stepType: step.type,
    stepName: step.name,
    stepParams: step.params,
    global,
  };

  if (step.type === "background") {
    const backgroundParams = step.params as BackgroundParams;
    return {
      ...baseInput,
      referenceAsset: backgroundParams.referenceAsset,
      // 用户在该步填了自定义提示词就用它，否则按背景类型等参数自动构建
      customPrompt: backgroundParams.customPrompt?.trim() || buildBackgroundPrompt(backgroundParams),
      aiModel: global.aiModel ?? "mediakit",   // 用全局 provider，不再写死
      model: global.model,                   // 具体模型 id，未选时为 undefined → executeOrderedPipeline 回退 globalModel
      outputResolution: global.resolution,
    };
  }

  if (step.type === "scene") {
    const sceneParams = step.params as SceneParams;
    return {
      ...baseInput,
      customPrompt: sceneParams.customPrompt?.trim() || undefined,
      batchCount: sceneParams.candidateCount,
      aiModel: global.aiModel ?? "mediakit",
      model: global.model,
      outputResolution: global.resolution,
    };
  }

  if (step.type === "watermark") {
    const watermarkParams = step.params as WatermarkParams;
    const isLogo = watermarkParams.type === "logo" && Boolean(watermarkParams.logoAsset);
    return {
      ...baseInput,
      watermarkType: isLogo ? "logo" : "text",
      watermarkText: watermarkParams.content,
      watermarkLogoAsset: isLogo ? watermarkParams.logoAsset : undefined,
      watermarkPosition:
        watermarkParams.position === "custom"
          ? watermarkParams.customPosition ?? "bottom-right"
          : watermarkParams.position,
      watermarkOpacity: watermarkParams.opacity / 100,
      watermarkScale: watermarkParams.sizeRatio,
      outputResolution: toOutputResolution(global.resolution),
    };
  }

  if (step.type === "upscale") {
    const upscaleParams = step.params as UpscaleParams;
    return {
      ...baseInput,
      upscaleFactor: upscaleParams.factor,
      outputResolution: toOutputResolution(global.resolution),
    };
  }

  if (step.type === "outpaint") {
    const outpaintParams = step.params as OutpaintParams;
    return {
      ...baseInput,
      direction: outpaintParams.direction,
      ratio: outpaintParams.ratio,
      outputResolution: toOutputResolution(global.resolution),
    };
  }

  return {
    ...baseInput,
    ...params,
  };
}


export function toOutputResolution(resolution: string) {
  const resolutionMap: Record<string, string> = {
    "1k": "1024x1024",
    "2k": "2048x2048",
    "4k": "4096x4096",
  };

  return resolutionMap[resolution] ?? "original";
}

