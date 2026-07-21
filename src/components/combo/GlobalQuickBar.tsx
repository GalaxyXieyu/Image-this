"use client";

import { ChevronRight, Settings2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { cn } from "@/lib/utils";
import { RESOLUTIONS, type ImageModelOption } from "@/components/combo/types";

export function GlobalQuickBar({
  onCollapse,
  selectedTemplateName,
  resolution,
  setResolution,
  availableModels,
  selectedImageModel,
  setSelectedImageModel,
  showFullSettings,
  onShowFullSettings,
}: {
  onCollapse: () => void;
  selectedTemplateName: string | null;
  resolution: string;
  setResolution: (_value: string) => void;
  availableModels: ImageModelOption[];
  selectedImageModel: ImageModelOption | null;
  setSelectedImageModel: (_value: ImageModelOption | null) => void;
  showFullSettings: boolean;
  onShowFullSettings: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Settings2 className="h-4 w-4 shrink-0 text-brand" />
            <span className="text-data font-semibold text-ink">全局配置</span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">
            {selectedTemplateName ?? "未选择模板"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!showFullSettings && (
            <button
              type="button"
              onClick={onShowFullSettings}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-ink-2 hover:bg-surface-muted hover:text-ink"
            >
              更多
            </button>
          )}
          <button
            type="button"
            onClick={onCollapse}
            className="rounded-md p-1 text-ink-3 hover:bg-surface-muted hover:text-ink"
            aria-label="折叠"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-1.5">
        <Label className="text-caption font-medium text-ink-3">生图模型</Label>
        {availableModels.length === 0 ? (
          <div className="rounded-[10px] border border-line bg-surface-muted p-2.5 text-[11px] text-ink-3">
            未启用生图模型，请到设置启用
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
                className="w-full rounded-[10px] border border-line bg-surface px-3 py-2 text-left text-[12px] font-medium text-ink transition-colors hover:bg-surface-muted"
              >
                {selectedImageModel
                  ? `${selectedImageModel.provider.toUpperCase()} · ${selectedImageModel.modelName}`
                  : "选择模型"}
              </button>
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-1.5">
        <Label className="text-caption font-medium text-ink-3">输出清晰度</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setResolution(r.id)}
              className={cn(
                "rounded-[10px] border px-1 py-1.5 text-[11px] font-semibold transition-colors",
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
    </div>
  );
}
