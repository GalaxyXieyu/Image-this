"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { TemplateSidebar } from "@/components/templates/TemplateSidebar";
import { TemplateGrid } from "@/components/templates/TemplateGrid";
import { TemplateDetailPanel } from "@/components/templates/TemplateDetailPanel";
import {
  type TemplatePreset,
  type PresetCategory,
} from "@/types/workbench";
import {
  ALL_PRESETS,
  COMBO_PRESETS,
  getPresetsByCategory,
  searchPresets,
  getPresetById,
} from "@/lib/workbench/presets";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

type SortOption = "newest" | "popular";

function TemplatesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const urlCategory = (searchParams.get("category") as PresetCategory) || "all";
  const urlPresetId = searchParams.get("preset") || undefined;

  // Local state
  const [activeCategory, setActiveCategory] = useState<PresetCategory>(urlCategory);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedPreset, setSelectedPreset] = useState<TemplatePreset | undefined>(
    urlPresetId ? getPresetById(urlPresetId) : undefined
  );
  const [activeComboId, setActiveComboId] = useState<string | undefined>(
    searchParams.get("combo") || undefined
  );
  const [activeFunctionNav, setActiveFunctionNav] = useState<string | undefined>(
    undefined
  );

  // Filtered presets
  const filteredPresets = useMemo(() => {
    let presets: TemplatePreset[];

    if (activeComboId) {
      const combo = COMBO_PRESETS.find((c) => c.id === activeComboId);
      presets = combo
        ? ALL_PRESETS.filter((p) => combo.presetIds.includes(p.id))
        : [];
    } else if (searchQuery.trim()) {
      presets = searchPresets(searchQuery);
      if (activeCategory !== "all") {
        presets = presets.filter((p) => p.category === activeCategory);
      }
    } else {
      presets = getPresetsByCategory(activeCategory);
    }

    // Sort
    if (sortBy === "popular") {
      presets = [...presets].sort((a, b) => b.usageCount - a.usageCount);
    } else {
      presets = [...presets].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    return presets;
  }, [activeCategory, searchQuery, sortBy, activeComboId]);

  // Handlers
  const handleCategoryChange = useCallback(
    (category: PresetCategory) => {
      setActiveCategory(category);
      setActiveComboId(undefined);
      setActiveFunctionNav(undefined);
      setSelectedPreset(undefined);
      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      if (category === "all") {
        params.delete("category");
      } else {
        params.set("category", category);
      }
      params.delete("combo");
      router.replace(`/templates?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleComboClick = useCallback(
    (comboId: string) => {
      setActiveComboId(comboId);
      setActiveCategory("all");
      setActiveFunctionNav(undefined);
      setSelectedPreset(undefined);
      const params = new URLSearchParams(searchParams.toString());
      params.set("combo", comboId);
      params.delete("category");
      router.replace(`/templates?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleFunctionNavClick = useCallback(
    (href: string) => {
      if (href.startsWith("/templates")) {
        setActiveFunctionNav(href);
        const cat = new URLSearchParams(href.split("?")[1]).get("category") as PresetCategory;
        if (cat) {
          setActiveCategory(cat);
          setActiveComboId(undefined);
          setSelectedPreset(undefined);
        }
        router.replace(href, { scroll: false });
      } else {
        router.push(href);
      }
    },
    [router]
  );

  const handleSelectPreset = useCallback((preset: TemplatePreset) => {
    setSelectedPreset(preset);
  }, []);

  const handleUsePreset = useCallback(
    (preset: TemplatePreset) => {
      // Navigate based on preset type
      let targetUrl: string;
      switch (preset.type) {
        case "scene":
          targetUrl = `/workspace/scene?preset=${preset.id}`;
          break;
        case "tool":
          if (preset.toolType) {
            targetUrl = `/tools?preset=${preset.id}&tool=${preset.toolType}`;
          } else {
            targetUrl = `/workspace/scene?preset=${preset.id}`;
          }
          break;
        case "combo":
          targetUrl = `/combo?preset=${preset.id}`;
          break;
        default:
          targetUrl = `/workspace/scene?preset=${preset.id}`;
      }
      router.push(targetUrl);
    },
    [router]
  );

  return (
    <WorkbenchShell>
      <WorkbenchTopNav
        title="模板库"
        rightContent={
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              首页
            </Link>
            <Link
              href="/templates"
              className="text-sm text-foreground font-medium"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              模板库
            </Link>
            <Link
              href="/tasks"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              任务中心
            </Link>
            <Link
              href="/results"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              结果管理
            </Link>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          设置
        </Link>
          </nav>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <TemplateSidebar
          activeCategory={activeCategory}
          activeComboId={activeComboId}
          activeFunctionNav={activeFunctionNav}
          onCategoryChange={handleCategoryChange}
          onComboClick={handleComboClick}
          onFunctionNavClick={handleFunctionNavClick}
        />
        <main className="flex-1 overflow-auto bg-background flex flex-col">
          {/* Toolbar: search + sort */}
          <div className="h-10 flex items-center justify-between px-8 py-6 shrink-0">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索模板..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
                style={{ fontFamily: "Geist, sans-serif" }}
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-32 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">最新发布</SelectItem>
                <SelectItem value="popular">最受欢迎</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template grid */}
          <div className="flex-1 px-8 pb-8">
            <TemplateGrid
              presets={filteredPresets}
              selectedId={selectedPreset?.id}
              onSelect={handleSelectPreset}
              onUse={handleUsePreset}
            />
          </div>
        </main>
        <TemplateDetailPanel
          preset={selectedPreset}
          onUse={handleUsePreset}
        />
      </div>
    </WorkbenchShell>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={
      <WorkbenchShell>
        <WorkbenchTopNav title="模板库" />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-[260px] h-full border-r border-border bg-muted shrink-0" />
          <main className="flex-1 bg-background flex items-center justify-center">
            <p className="text-muted-foreground">加载中...</p>
          </main>
          <aside className="w-[320px] h-full border-l border-border bg-card shrink-0" />
        </div>
      </WorkbenchShell>
    }>
      <TemplatesPageInner />
    </Suspense>
  );
}
