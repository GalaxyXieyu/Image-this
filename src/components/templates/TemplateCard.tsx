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
import { ShoppingBag } from "lucide-react";

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
        "h-[280px] bg-card rounded-xl border border-border flex flex-col overflow-hidden cursor-pointer transition-all duration-200",
        isSelected
          ? "ring-2 ring-primary border-primary shadow-md"
          : "hover:border-primary/50 hover:shadow-sm",
        className
      )}
    >
      {/* Image area: 160px height, muted bg, icon + label */}
      <div
        className="h-[160px] bg-muted flex flex-col items-center justify-center gap-2 shrink-0"
        style={{
          borderRadius: "12px 12px 0 0",
        }}
      >
        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
        <span
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          模板预览
        </span>
      </div>

      {/* Info area: padding 16px, vertical gap 4px */}
      <div className="flex-1 p-4 flex flex-col gap-1 min-w-0">
        {/* Title: Inter 15px weight 500 */}
        <h4
          className="text-[15px] font-medium text-foreground truncate"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {preset.name}
        </h4>

        {/* Description: Geist 13px muted */}
        <p
          className="text-[13px] text-muted-foreground truncate"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          {preset.description || "暂无描述"}
        </p>

        {/* Footer row: usage count (11px #999) + version badge (11px #0066FF) */}
        <div className="flex items-center justify-between mt-auto">
          <span
            className="text-[11px] text-[#999999]"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            使用 {preset.usageCount} 次
          </span>
          <span
            className="text-[11px] font-medium text-[#0066FF]"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            v{preset.version}
          </span>
        </div>

        {/* Action row: "使用模板" (12px, #0066FF) + "编辑" (12px, #666) */}
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUse?.();
            }}
            className="text-[12px] font-medium text-[#0066FF] hover:underline"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            使用模板
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="text-[12px] text-[#666666] hover:text-foreground transition-colors"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  );
}
