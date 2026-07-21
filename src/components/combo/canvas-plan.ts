import type {
  OutpaintParams,
  UpscaleParams,
  WatermarkCanvasPlan,
  WorkflowStep,
} from "@/components/combo/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function applyOutpaintToCanvasPlan(
  canvasWidth: number,
  canvasHeight: number,
  sourceRect: WatermarkCanvasPlan["sourceRect"],
  params: OutpaintParams
) {
  const each = clamp((params.ratio ?? 25) / 100, 0.05, 0.4);
  const direction = params.direction || "all";
  const horizontal = direction === "all" || direction === "horizontal";
  const vertical = direction === "all" || direction === "vertical";
  const nextWidth = canvasWidth * (horizontal ? 1 + 2 * each : 1);
  const nextHeight = canvasHeight * (vertical ? 1 + 2 * each : 1);

  return {
    canvasWidth: nextWidth,
    canvasHeight: nextHeight,
    sourceRect: {
      x: (sourceRect.x * canvasWidth + (nextWidth - canvasWidth) / 2) / nextWidth,
      y: (sourceRect.y * canvasHeight + (nextHeight - canvasHeight) / 2) / nextHeight,
      width: (sourceRect.width * canvasWidth) / nextWidth,
      height: (sourceRect.height * canvasHeight) / nextHeight,
    },
  };
}

function applyUpscaleToCanvasPlan(
  canvasWidth: number,
  canvasHeight: number,
  sourceRect: WatermarkCanvasPlan["sourceRect"],
  params: UpscaleParams
) {
  const factor = clamp(params.factor ?? 1, 1.1, 4);
  return {
    canvasWidth: canvasWidth * factor,
    canvasHeight: canvasHeight * factor,
    sourceRect,
  };
}

/**
 * 推导某一步对应的画布计划。
 * - watermark：只累计前置 outpaint/upscale（水印落在最终画布上）
 * - outpaint/upscale 预览：includeCurrentStep=true，把当前步效果也算进去
 */
export function computeWatermarkCanvasPlan(
  steps: WorkflowStep[],
  currentStepId: string,
  baseW: number,
  baseH: number,
  options?: { includeCurrentStep?: boolean }
): WatermarkCanvasPlan | undefined {
  if (!baseW || !baseH || baseW <= 0 || baseH <= 0) return undefined;

  let canvasWidth = baseW;
  let canvasHeight = baseH;
  let sourceRect = { x: 0, y: 0, width: 1, height: 1 };
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);
  if (currentIndex < 0) return undefined;

  const endIndex = options?.includeCurrentStep ? currentIndex + 1 : currentIndex;
  const relevantSteps = steps.slice(0, endIndex);

  for (const step of relevantSteps) {
    if (step.type === "outpaint") {
      const next = applyOutpaintToCanvasPlan(
        canvasWidth,
        canvasHeight,
        sourceRect,
        step.params as OutpaintParams
      );
      canvasWidth = next.canvasWidth;
      canvasHeight = next.canvasHeight;
      sourceRect = next.sourceRect;
    } else if (step.type === "upscale") {
      const next = applyUpscaleToCanvasPlan(
        canvasWidth,
        canvasHeight,
        sourceRect,
        step.params as UpscaleParams
      );
      canvasWidth = next.canvasWidth;
      canvasHeight = next.canvasHeight;
      sourceRect = next.sourceRect;
    }
  }

  return {
    canvasWidth,
    canvasHeight,
    aspect: canvasWidth / canvasHeight,
    sourceRect,
  };
}

export { clamp };
