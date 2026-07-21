"use client";

import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { cn } from "@/lib/utils";
import { ASPECT_RATIOS, RESOLUTIONS, type ImageModelOption } from "@/components/combo/types";
import { FieldLabel, ChipGroup } from "@/components/combo/form-controls";

/* ─── Right: global settings extracted to components/combo ─── */

export function MobileGlobalSettings({
  selectedTemplateName,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  availableModels,
  selectedImageModel,
  setSelectedImageModel,
}: {
  selectedTemplateName: string | null;
  aspectRatio: string;
  setAspectRatio: (_value: string) => void;
  resolution: string;
  setResolution: (_value: string) => void;
  availableModels: { provider: string; modelName: string }[];
  selectedImageModel: { provider: string; modelName: string } | null;
  setSelectedImageModel: (_value: { provider: string; modelName: string } | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-brand" />
          <span className="text-[15px] font-bold text-ink">全局执行设置</span>
        </div>
        <span className="min-w-0 truncate text-[12px] text-ink-3">
          {selectedTemplateName ?? "未选择模板"}
        </span>
      </div>

      <section className="flex flex-col gap-2">
        <FieldLabel>输出清晰度</FieldLabel>
        <ChipGroup
          value={resolution}
          onChange={setResolution}
          options={[...RESOLUTIONS]}
          cols={3}
        />
      </section>

      <section className="flex flex-col gap-2">
        <FieldLabel>画面比例</FieldLabel>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              type="button"
              onClick={() => setAspectRatio(ratio.id)}
              className={cn(
                "h-9 min-w-14 shrink-0 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                aspectRatio === ratio.id
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2"
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <FieldLabel>生图模型</FieldLabel>
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
            value={selectedImageModel ? `${selectedImageModel.provider}::${selectedImageModel.modelName}` : ""}
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

    </div>
  );
}



export function CollapsedRail({
  side,
  label,
  onExpand,
}: {
  side: "left" | "right";
  label: string;
  onExpand: () => void;
}) {
  const Chevron = side === "left" ? ChevronRight : ChevronLeft;
  return (
    <aside
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-3 bg-surface-glass py-4 backdrop-blur-[20px] backdrop-saturate-150",
        side === "left" ? "border-r border-line" : "border-l border-line"
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className="rounded-md p-1.5 text-ink-2 hover:bg-surface-muted hover:text-ink"
        aria-label="展开"
      >
        <Chevron className="h-4 w-4" />
      </button>
      <div
        className="select-none text-[12px] font-semibold tracking-widest text-ink-3"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </div>
    </aside>
  );
}
