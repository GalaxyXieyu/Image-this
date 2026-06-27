"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api-client";
import { BrandEmptyState, BrandImageFallback } from "@/components/brands/SpriteImage";
import {
  Search,
  Download,
  Trash2,
  Grid,
  List,
  Image as ImageIcon,
  CheckSquare,
  Loader2,
  Wand2,
} from "lucide-react";

function ImageThumbnail({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <BrandImageFallback title="图片预览" description="素材暂不可用" pose="sleep" className={cn("rounded-none", className)} />;
  }
  return <img src={src} alt={alt} className={cn("w-full h-full object-cover", className)} onError={() => setError(true)} />;
}

interface BackendImage {
  id: string;
  filename: string;
  thumbnailUrl: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  processType: string;
  status: string;
  fileSize: number | null;
  width: number | null;
  height: number | null;
  qualityScore: number | null;
  createdAt: string;
  project: { id: string; name: string } | null;
}

interface ResultImage {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  thumbnail?: string | null;
  processedUrl?: string | null;
}

function mapProcessType(type: string): string {
  const map: Record<string, string> = {
    BACKGROUND_REMOVAL: "scene",
    BACKGROUND_REPLACE: "scene",
    IMAGE_UPSCALING: "main",
    UPSCALE: "main",
    IMAGE_OUTPAINTING: "detail",
    IMAGE_EXPANSION: "detail",
    OUTPAINT: "detail",
    WATERMARK: "marketing",
    ONE_CLICK_WORKFLOW: "poster",
    ONE_CLICK: "poster",
    VIDEO_GENERATION: "other",
  };
  return map[type] || "other";
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "全部",
  scene: "场景图",
  main: "主图",
  detail: "详情图",
  marketing: "营销图",
  poster: "海报",
  "white-bg": "白底图",
};

export default function ResultsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ResultImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("limit", "50");
      params.append("status", "COMPLETED");
      params.append("includeFullSize", "true");
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const data = await apiGet<{ success: boolean; images: BackendImage[]; pagination: { total: number } }>(
        `/api/images?${params.toString()}`
      );
      const mapped = data.images.map((img) => ({
        id: img.id,
        name: img.filename,
        category: mapProcessType(img.processType),
        createdAt: formatDate(img.createdAt),
        thumbnail: img.thumbnailUrl,
        processedUrl: img.processedUrl,
      }));
      setResults(mapped);

      // Compute category counts
      const counts: Record<string, number> = { all: data.pagination.total };
      for (const item of mapped) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
      setCategoryCounts(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const filteredResults = results.filter((item) => {
    const matchCategory = activeCategory === "all" || item.category === activeCategory;
    return matchCategory;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredResults.length && filteredResults.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResults.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const isAllSelected = filteredResults.length > 0 && selectedIds.size === filteredResults.length;

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 张图片吗？`)) return;
    try {
      await apiPatch("/api/images", {
        imageIds: Array.from(selectedIds),
        action: "delete",
      });
      setSelectedIds(new Set());
      fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="hidden items-center justify-between border-b border-line px-4 py-4 shrink-0 sm:px-6 md:flex">
        <div>
          <h1 className="font-serif text-[28px] leading-tight text-ink tracking-tight sm:text-h2">图库</h1>
          <p className="mt-1 text-data text-ink-2">
            查看、筛选、批量下载已生成的商品图
          </p>
        </div>
      </div>

      {/* Two-column layout: 移动端 sidebar 折叠成顶部横滚 chips */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* 移动端：横滚分类 chips */}
        <div className="md:hidden flex items-center gap-1.5 overflow-x-auto border-b border-line px-4 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {Object.entries(CATEGORY_LABELS).map(([id, label]) => {
            const active = activeCategory === id;
            return (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={cn(
	                  "min-h-11 shrink-0 rounded-full px-3 text-data transition-colors",
                  active ? "bg-accent-gradient text-white" : "border border-line bg-surface text-ink-2"
                )}
              >
                {label} {categoryCounts[id] ?? 0}
              </button>
            );
          })}
        </div>
        {/* 桌面：左侧分类 sidebar */}
        <aside className="hidden md:flex w-[220px] shrink-0 flex-col glass-panel rounded-none border-r border-line">
          <div className="p-4">
            <h2 className="mb-3 text-caption font-semibold uppercase tracking-wider text-ink-3">
              场景分类
            </h2>
            <nav className="flex flex-col gap-0.5">
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => {
                const active = activeCategory === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveCategory(id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-data transition-colors",
                      active
                        ? "bg-brand-soft font-semibold text-brand-text"
                        : "text-ink-2 hover:bg-surface-muted hover:text-ink"
                    )}
                  >
                    <span>{label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        active
                          ? "bg-accent-gradient text-white"
                          : "bg-surface-muted text-ink-3"
                      )}
                    >
                      {categoryCounts[id] || 0}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Single-row toolbar: select all + search + view mode + bulk */}
          <div className="flex flex-col gap-2.5 border-b border-line glass-panel rounded-none px-4 py-2.5 shrink-0 sm:px-6 md:flex-row md:items-center md:justify-between md:py-2.5">
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <button
                onClick={toggleSelectAll}
	                className="flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-data text-ink-2 transition-colors hover:text-ink"
              >
                <CheckSquare className={cn("h-3.5 w-3.5", isAllSelected && "text-brand")} />
                全选
              </button>
              {selectedIds.size > 0 && (
                <span className="text-data text-brand-text">已选 {selectedIds.size} 项</span>
              )}
              <div className="relative min-w-[180px] flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <Input
                  placeholder="搜索图片…"
	                  className="h-11 w-full rounded-full pl-8 text-[13px] md:h-8 md:w-56"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
	                    "flex h-11 w-11 items-center justify-center rounded-full transition-colors md:h-auto md:w-auto md:p-1.5",
                    viewMode === "grid"
                      ? "bg-accent-gradient text-white"
                      : "text-ink-3 hover:text-ink"
                  )}
                  aria-label="网格视图"
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
	                    "flex h-11 w-11 items-center justify-center rounded-full transition-colors md:h-auto md:w-auto md:p-1.5",
                    viewMode === "list"
                      ? "bg-accent-gradient text-white"
                      : "text-ink-3 hover:text-ink"
                  )}
                  aria-label="列表视图"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
	                className="h-11 shrink-0 rounded-full border-line-strong bg-surface text-[13px] md:h-8"
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                批量下载
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
	                className="h-11 shrink-0 rounded-full border-line-strong bg-surface text-[13px] text-danger hover:text-danger md:h-8"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                批量删除
              </Button>
            </div>
          </div>

          {/* Results grid */}
          <div className="flex-1 overflow-auto p-4">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <p className="text-data text-destructive">{error}</p>
	                <Button variant="outline" size="sm" className="mt-3 min-h-11" onClick={fetchResults}>
                  重试
                </Button>
              </div>
            )}

            {!loading && !error && (
              <>
                {viewMode === "grid" ? (
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
                  >
                    {filteredResults.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "group glass-panel overflow-hidden rounded-[16px] transition-all duration-200 hover:-translate-y-0.5",
                          selectedIds.has(item.id) && "ring-2 ring-brand"
                        )}
                      >
                        <div className="relative aspect-square overflow-hidden bg-surface-muted">
                          <ImageThumbnail src={item.thumbnail || item.processedUrl} alt={item.name} className="h-full w-full" />
                          {/* Category corner badge */}
                          <span className="absolute left-2 top-2 rounded-full bg-surface/85 px-2 py-0.5 text-[10px] font-semibold text-brand-text backdrop-blur-sm">
                            {CATEGORY_LABELS[item.category] || "其他"}
                          </span>
                          {/* Checkbox overlay */}
	                          <div className={cn(
	                            "absolute right-2 top-2 transition-opacity",
	                            selectedIds.has(item.id) ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          )}>
                            <div className="rounded-md bg-surface/85 p-1 backdrop-blur-sm">
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelect(item.id)}
                              />
                            </div>
                          </div>
                          {/* Hover actions */}
	                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
	                            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-2 hover:text-ink" title="下载">
	                              <Download className="h-3.5 w-3.5" />
	                            </button>
	                            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-2 hover:text-danger" title="删除">
	                              <Trash2 className="h-3.5 w-3.5" />
	                            </button>
                          </div>
                        </div>
                        <div className="px-2.5 py-2">
                          <h3 className="truncate text-[12px] font-semibold text-ink">{item.name}</h3>
                          <p className="mt-0.5 hidden text-[11px] text-ink-3 sm:block">{item.createdAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {filteredResults.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "group flex items-center gap-3 rounded-[12px] border bg-surface p-2.5 transition-all hover:border-brand/40",
                          selectedIds.has(item.id)
                            ? "border-brand ring-1 ring-brand"
                            : "border-line"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface-muted">
                          <ImageThumbnail src={item.thumbnail || item.processedUrl} alt={item.name} className="h-full w-full" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[13px] font-semibold text-ink">{item.name}</h3>
                          <p className="hidden text-[11px] text-ink-3 sm:block">{item.createdAt}</p>
                        </div>
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-text">
                          {CATEGORY_LABELS[item.category] || "其他"}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
	                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-ink-2">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
	                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-ink-2 hover:text-danger">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredResults.length === 0 && (
                  <div className="glass-panel rounded-card shadow-soft py-12">
                  <BrandEmptyState
                    pose="star"
                    title="暂无结果"
                    description=""
                    action={
	                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
	                        <Button variant="brand" className="min-h-11" asChild>
                          <Link href="/workspace/scene">
                            <Wand2 className="w-4 h-4 mr-2" />
                            场景生成
                          </Link>
                        </Button>
	                        <Button variant="outline" className="min-h-11" asChild>
                          <Link href="/tools">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            工具箱
                          </Link>
                        </Button>
                      </div>
                    }
                  />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
