/**
 * TemplateDetailPanel
 *
 * Right-side detail panel for template library.
 * Width 320px, card bg, left border 1px.
 * Preview area 180px, metadata, action buttons.
 */

"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { type TemplatePreset, type PresetCategory } from "@/types/workbench";
import { PRESET_CATEGORY_LABELS } from "@/lib/workbench/presets";
import { ShoppingBag, ChevronDown, ChevronUp, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateDetailPanelProps {
  preset?: TemplatePreset;
  onUse?: (preset: TemplatePreset) => void;
  className?: string;
}

export function TemplateDetailPanel({
  preset,
  onUse,
  className,
}: TemplateDetailPanelProps) {
  const [paramsOpen, setParamsOpen] = useState(false);

  if (!preset) {
    return (
      <aside
        className={cn(
          "w-[320px] h-full border-l border-border bg-card flex flex-col shrink-0",
          className
        )}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">选择一个模板查看详情</p>
        </div>
      </aside>
    );
  }

  const categoryLabel = PRESET_CATEGORY_LABELS[preset.category as PresetCategory] || preset.category;

  return (
    <aside
      className={cn(
        "w-[320px] h-full border-l border-border bg-card flex flex-col shrink-0 overflow-y-auto",
        className
      )}
    >
      {/* Preview area: 180px height, muted bg, 12px radius */}
      <div className="p-4">
        <div
          className="h-[180px] bg-muted rounded-xl flex flex-col items-center justify-center gap-2"
        >
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          <span
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            模板预览
          </span>
        </div>
      </div>

      {/* Metadata section */}
      <div className="px-4 pb-4 space-y-4">
        {/* Template name: Inter 16px weight 600 */}
        <h3
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {preset.name}
        </h3>

        {/* Description: Geist 14px */}
        <p
          className="text-sm text-muted-foreground leading-relaxed"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          {preset.description || "暂无描述"}
        </p>

        {/* Category badge */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {categoryLabel}
          </span>
          {preset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Metadata rows */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
              使用次数
            </span>
            <span className="text-foreground font-medium" style={{ fontFamily: "Geist, sans-serif" }}>
              {preset.usageCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
              版本
            </span>
            <span className="text-foreground font-medium" style={{ fontFamily: "Geist, sans-serif" }}>
              v{preset.version}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
              类型
            </span>
            <span className="text-foreground font-medium" style={{ fontFamily: "Geist, sans-serif" }}>
              {preset.type === "scene" ? "场景图" : preset.type === "tool" ? "工具" : "组合"}
            </span>
          </div>
          {preset.toolType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                工具
              </span>
              <span className="text-foreground font-medium" style={{ fontFamily: "Geist, sans-serif" }}>
                {preset.toolType === "background"
                  ? "换背景"
                  : preset.toolType === "watermark"
                  ? "加水印"
                  : preset.toolType === "upscale"
                  ? "高清化"
                  : preset.toolType === "outpaint"
                  ? "扩图"
                  : preset.toolType === "video"
                  ? "视频"
                  : preset.toolType}
              </span>
            </div>
          )}
        </div>

        {/* Parameters preview (collapsible) */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setParamsOpen(!paramsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            <span>参数预览</span>
            {paramsOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {paramsOpen && (
            <div className="px-3 pb-3 space-y-1.5 border-t border-border">
              {Object.entries(preset.params).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{key}</span>
                  <span className="text-foreground font-mono truncate max-w-[180px]">
                    {typeof value === "object"
                      ? JSON.stringify(value).slice(0, 40) + "..."
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-2">
          <Button
            className="w-full"
            onClick={() => onUse?.(preset)}
          >
            使用此模板
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="sm">
              <Heart className="w-4 h-4 mr-1.5" />
              收藏
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <Share2 className="w-4 h-4 mr-1.5" />
              分享
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
