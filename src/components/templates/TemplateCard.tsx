/**
 * TemplateCard
 *
 * Individual template card matching Pencil design exactly.
 * Height 280px, card bg, 12px radius, 1px border, image area 160px.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { type TemplatePreset } from "@/types/workbench";
import { TemplateReferencePreview } from "./TemplateReferencePreview";

interface TemplateCardProps {
  preset: TemplatePreset;
  isSelected?: boolean;
  onClick?: () => void;
  onUse?: () => void;
  onEdit?: () => void;
  className?: string;
}

export function TemplateCard({
  preset,
  isSelected = false,
  onClick,
  onUse,
  onEdit,
  className,
}: TemplateCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "h-[260px] bg-card rounded-xl border border-border flex flex-col overflow-hidden cursor-pointer transition-all duration-200 sm:h-[280px]",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-md"
          : "hover:border-primary/50 hover:shadow-sm",
        className
      )}
    >
      <div
        className="h-[140px] shrink-0 overflow-hidden sm:h-[160px]"
        style={{
          borderRadius: "12px 12px 0 0",
        }}
      >
        <TemplateReferencePreview preset={preset} />
      </div>

      {/* Info area: padding 16px, vertical gap 4px */}
      <div className="flex-1 p-3.5 sm:p-4 flex flex-col gap-1 min-w-0">
        {/* Title: Inter 15px weight 500 */}
        <h4
          className="text-[15px] font-medium text-foreground truncate"
         
        >
          {preset.name}
        </h4>

        {/* Description: Geist 13px muted */}
        <p
          className="text-[13px] text-muted-foreground truncate"
         
        >
          {preset.description || "暂无描述"}
        </p>

        {/* Footer row: usage count (11px slate-400) + version badge (11px primary) */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className="text-[11px] text-muted-foreground"
           
          >
            使用 {preset.usageCount} 次
          </span>
          <span
            className="text-[11px] font-medium text-primary"
           
          >
            v{preset.version}
          </span>
        </div>

        {/* Action row: "使用模板" (12px, primary) + "编辑" (12px, slate-500) */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse?.();
            }}
            className="inline-flex min-h-11 items-center rounded-full pr-3 text-[12px] font-medium text-primary hover:underline"
          >
            使用模板
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
