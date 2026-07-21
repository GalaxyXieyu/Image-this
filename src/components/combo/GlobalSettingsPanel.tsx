"use client";

import { ChevronRight, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { cn } from "@/lib/utils";
import {
  ASPECT_RATIOS,
  RESOLUTIONS,
  type ImageModelOption,
} from "@/components/combo/types";

export function GlobalSettingsPanel({
  onCollapse,
  selectedTemplateName,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  availableModels,
  selectedImageModel,
  setSelectedImageModel,
  compact = false,
}: {
  onCollapse: () => void;
  selectedTemplateName: string | null;
  aspectRatio: string;
  setAspectRatio: (_value: string) => void;
  resolution: string;
  setResolution: (_value: string) => void;
  availableModels: ImageModelOption[];
  selectedImageModel: ImageModelOption | null;
  setSelectedImageModel: (_value: ImageModelOption | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-brand" />
            <span className="text-data font-semibold text-ink">全局执行设置</span>
          </div>
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

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">方案信息</Label>
        <div className="rounded-[14px] border border-line bg-surface p-3">
          <p className="truncate text-[13px] font-semibold text-ink">
            {selectedTemplateName ?? "未选择模板"}
          </p>
          <p className="mt-0.5 hidden text-[12px] text-ink-3 md:block">
            {selectedTemplateName ? "已加载该模板的步骤和参数" : "从左侧选择一个工作流模板"}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">画面比例</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setAspectRatio(r.id)}
              className={cn(
                "rounded-[10px] border px-1 py-1.5 text-[11px] font-semibold transition-colors",
                aspectRatio === r.id
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-3">
          当前主要用于预览参考；流水线实际输出比例仍以扩图/原图结果为准。
        </p>
      </section>

      {!compact && (
        <>
          <section className="flex flex-col gap-2">
            <Label className="text-caption font-medium text-ink-3">输出清晰度</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {RESOLUTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setResolution(r.id)}
                  className={cn(
                    "rounded-[10px] border px-1 py-2 text-[11px] font-semibold transition-colors",
                    resolution === r.id
                      ? "border-brand bg-brand-soft text-brand-text"
                      : "border-line-strong text-ink-2 hover:text-ink"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Label className="text-caption font-medium text-ink-3">生图模型</Label>
            {availableModels.length === 0 ? (
              <div className="rounded-[10px] border border-line bg-surface-muted p-3 text-[12px] text-ink-3">
                未启用生图模型，请到 设置 → AI 模型配置 启用
              </div>
            ) : (
              <BottomSheetSelect
                options={availableModels.map((m) => ({
                  id: `${m.provider}::${m.modelName}`,
                  label: `${m.provider.toUpperCase()} · ${m.modelName}`,
                }))}
                value={
                  selectedImageModel
                    ? `${selectedImageModel.provider}::${selectedImageModel.modelName}`
                    : ""
                }
                onChange={(value) => {
                  if (typeof value === "string") {
                    const [provider, modelName] = value.split("::");
                    setSelectedImageModel({ provider, modelName });
                  }
                }}
                title="选择生图模型"
                trigger={
                  <button
                    type="button"
                    className="rounded-[10px] border border-line bg-surface px-3 py-2 text-[12px] font-medium text-ink transition-colors hover:bg-surface-muted"
                  >
                    {selectedImageModel
                      ? `${selectedImageModel.provider.toUpperCase()} · ${selectedImageModel.modelName}`
                      : "选择模型"}
                  </button>
                }
              />
            )}
            <p className="text-[11px] text-ink-3">
              该模型仅作用于「生成场景图 / AI 换背景」步骤；扩图、放大、水印不受影响。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
