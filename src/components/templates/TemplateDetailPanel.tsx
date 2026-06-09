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
import { ChevronDown, ChevronUp, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplateReferencePreview } from "./TemplateReferencePreview";

interface TemplateDetailPanelProps {
  preset?: TemplatePreset;
  onUse?: React.Dispatch<TemplatePreset>;
  className?: string;
}

export function TemplateDetailPanel({
  preset,
  onUse,
  className,
}: TemplateDetailPanelProps) {
  const [paramsOpen, setParamsOpen] = useState(false);

  if (!preset) {
    return null;
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
        <div className="h-[180px] overflow-hidden rounded-xl">
          <TemplateReferencePreview preset={preset} />
        </div>
      </div>

      {/* Metadata section */}
      <div className="px-4 pb-4 space-y-4">
        {/* Template name: Inter 16px weight 600 */}
        <h3
          className="text-body font-semibold text-foreground"
         
        >
          {preset.name}
        </h3>

        {/* Description: Geist 14px */}
        <p
          className="text-data text-muted-foreground leading-relaxed"
         
        >
          {preset.description || "暂无描述"}
        </p>

        {/* Category badge */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary">
            {categoryLabel}
          </span>
          {preset.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-caption font-medium bg-muted text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Metadata rows */}
        <div className="space-y-2 text-data">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              使用次数
            </span>
            <span className="text-foreground font-medium">
              {preset.usageCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              版本
            </span>
            <span className="text-foreground font-medium">
              v{preset.version}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              类型
            </span>
            <span className="text-foreground font-medium">
              {preset.type === "scene" ? "场景图" : preset.type === "tool" ? "工具" : "组合"}
            </span>
          </div>
          {preset.toolType && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                工具
              </span>
              <span className="text-foreground font-medium">
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
            className="w-full flex items-center justify-between px-3 py-2.5 text-data font-medium text-foreground hover:bg-muted/50 transition-colors"
           
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
                <div key={key} className="flex justify-between text-caption">
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
