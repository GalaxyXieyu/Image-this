/**
 * TemplateGrid
 *
 * Responsive grid of template cards with gap 20px.
 */

"use client";

import React from "react";
import { type TemplatePreset } from "@/types/workbench";
import { TemplateCard } from "./TemplateCard";

interface TemplateGridProps {
  presets: TemplatePreset[];
  selectedId?: string;
  onSelect: (preset: TemplatePreset) => void;
  onUse: (preset: TemplatePreset) => void;
  className?: string;
}

export function TemplateGrid({
  presets,
  selectedId,
  onSelect,
  onUse,
  className,
}: TemplateGridProps) {
  if (presets.length === 0) {
    return (
      <div className={`flex items-center justify-center py-20 ${className || ""}`}>
        <p className="text-muted-foreground text-data">没有找到匹配的模板</p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 ${className || ""}`}
    >
      {presets.map((preset) => (
        <TemplateCard
          key={preset.id}
          preset={preset}
          isSelected={selectedId === preset.id}
          onClick={() => onSelect(preset)}
          onUse={() => onUse(preset)}
        />
      ))}
    </div>
  );
}
