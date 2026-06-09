/**
 * TemplateSidebar
 *
 * Left sidebar for the template library page.
 * Matches Pencil design: 260px width, sections for categories, combos, function nav.
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  PRESET_CATEGORY_LABELS,
} from "@/lib/workbench/presets";
import { type PresetCategory } from "@/types/workbench";
import { COMBO_PRESETS } from "@/lib/workbench/presets";
import { LayoutGrid, Wand2, Image, Droplets, Expand, Zap, Video, FileImage } from "lucide-react";

interface TemplateSidebarProps {
  activeCategory: PresetCategory;
  activeComboId?: string;
  activeFunctionNav?: string;
  onCategoryChange: (category: PresetCategory) => void;
  onComboClick: (comboId: string) => void;
  onFunctionNavClick: (href: string) => void;
  className?: string;
}

const CATEGORY_ITEMS: { key: PresetCategory; icon: React.ElementType }[] = [
  { key: "all", icon: LayoutGrid },
  { key: "listing", icon: FileImage },
  { key: "whitebg", icon: Image },
  { key: "scene", icon: Wand2 },
  { key: "poster", icon: FileImage },
  { key: "video", icon: Video },
  { key: "image-process", icon: Zap },
];

const FUNCTION_NAV_ITEMS: { label: string; href: string; icon: React.ElementType }[] = [
  { label: "场景图生成", href: "/workspace/scene", icon: Wand2 },
  { label: "白底图", href: "/tools", icon: Image },
  { label: "上架图", href: "/templates?category=listing", icon: FileImage },
  { label: "海报设计", href: "/templates?category=poster", icon: FileImage },
];

export function TemplateSidebar({
  activeCategory,
  activeComboId,
  activeFunctionNav,
  onCategoryChange,
  onComboClick,
  onFunctionNavClick,
  className,
}: TemplateSidebarProps) {
  return (
    <aside
      className={cn(
        "w-[260px] h-full border-r border-border bg-muted flex flex-col overflow-y-auto shrink-0",
        className
      )}
    >
      <div className="p-6 space-y-6">
        {/* 模板分类 */}
        <section>
          <h3
            className="text-data font-semibold text-foreground mb-3"
           
          >
            模板分类
          </h3>
          <div className="space-y-2">
            {CATEGORY_ITEMS.map(({ key, icon: Icon }) => {
              const isActive = activeCategory === key && !activeComboId && !activeFunctionNav;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onCategoryChange(key);
                  }}
                  className={cn(
                    "w-full h-10 flex items-center gap-2.5 px-3 rounded-lg text-data transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                 
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{PRESET_CATEGORY_LABELS[key]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* 组合模板 */}
        <section>
          <h3
            className="text-data font-semibold text-foreground mb-3"
           
          >
            组合模板
          </h3>
          <div className="space-y-2">
            {COMBO_PRESETS.map((combo) => {
              const isActive = activeComboId === combo.id;
              return (
                <button
                  key={combo.id}
                  onClick={() => onComboClick(combo.id)}
                  className={cn(
                    "w-full h-10 flex items-center gap-2.5 px-3 rounded-lg text-data transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                 
                >
                  <LayoutGrid className="w-4 h-4 shrink-0" />
                  <span>{combo.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* 功能导航 */}
        <section>
          <h3
            className="text-data font-semibold text-foreground mb-3"
           
          >
            功能导航
          </h3>
          <div className="space-y-2">
            {FUNCTION_NAV_ITEMS.map((item) => {
              const isActive = activeFunctionNav === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => onFunctionNavClick(item.href)}
                  className={cn(
                    "w-full h-10 flex items-center gap-2.5 px-3 rounded-lg text-data transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                 
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </aside>
  );
}
