"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import type { InputAssetRef } from "@/types/workbench";
import type {
  BackgroundParams,
  OutpaintParams,
  SceneParams,
  StepParams,
  UpscaleParams,
  WatermarkCanvasPlan,
  WatermarkParams,
  WorkflowStep,
} from "@/components/combo/types";
import { STEP_META } from "@/components/combo/step-meta";
import {
  BackgroundStepParams,
  OutpaintStepParams,
  SceneStepParams,
  UpscaleStepParams,
  WatermarkStepParams,
} from "@/components/combo/step-params";

export function MobileStepSettings({
  step,
  onClose,
  onChange,
  aspectRatio,
  productImage,
  canvasPlan,
}: {
  step: WorkflowStep;
  onClose: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
  aspectRatio: string;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
}) {
  const Icon = STEP_META[step.type].icon;
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">{step.name}</p>
            <p className="hidden text-[12px] text-ink-3 md:block">步骤 {step.order} 参数</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-surface-muted"
        >
          收起
        </button>
      </div>

      {step.type === "scene" && (
        <SceneStepParams params={step.params as SceneParams} onChange={onChange} />
      )}
      {step.type === "background" && (
        <BackgroundStepParams params={step.params as BackgroundParams} onChange={onChange} />
      )}
      {step.type === "upscale" && (
        <UpscaleStepParams
          params={step.params as UpscaleParams}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
      {step.type === "watermark" && (
        <WatermarkStepParams
          params={step.params as WatermarkParams}
          aspectRatio={aspectRatio}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
      {step.type === "outpaint" && (
        <OutpaintStepParams
          params={step.params as OutpaintParams}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
    </div>
  );
}

/* ─── Right: per-step parameters ─────────────────────────────────── */


export function StepParamPanel({
  step,
  onClose,
  onCollapse,
  onChange,
  aspectRatio,
  productImage,
  canvasPlan,
  hideChrome = false,
}: {
  step: WorkflowStep;
  onClose: () => void;
  onCollapse: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
  aspectRatio: string;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
  hideChrome?: boolean;
}) {
  // 仅用于非 workflow 步，类型保证由调用处进行
  if (step.type === "workflow") {
    return null;
  }

  const Icon = STEP_META[step.type].icon;
  return (
    <div className="flex flex-col gap-5 p-5">
      {!hideChrome && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-ink-2 hover:bg-surface-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-data font-semibold">{step.name}</span>
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-1 text-ink-3 hover:bg-surface-muted hover:text-ink"
            aria-label="折叠"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 rounded-[14px] bg-brand-soft p-3 text-brand-text">
        <div className="flex min-w-0 items-center gap-2.5">
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate text-[12px] font-semibold">步骤 {step.order} · {step.name}</span>
        </div>
        {hideChrome && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-text/80 hover:bg-white/40"
          >
            关闭
          </button>
        )}
      </div>

      {step.type === "scene" && (
        <SceneStepParams params={step.params as SceneParams} onChange={onChange} />
      )}
      {step.type === "background" && (
        <BackgroundStepParams params={step.params as BackgroundParams} onChange={onChange} />
      )}
      {step.type === "upscale" && (
        <UpscaleStepParams
          params={step.params as UpscaleParams}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
      {step.type === "watermark" && (
        <WatermarkStepParams
          params={step.params as WatermarkParams}
          aspectRatio={aspectRatio}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
      {step.type === "outpaint" && (
        <OutpaintStepParams
          params={step.params as OutpaintParams}
          onChange={onChange}
          productImage={productImage}
          canvasPlan={canvasPlan}
        />
      )}
    </div>
  );
}

