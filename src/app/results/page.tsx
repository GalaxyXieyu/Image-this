"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch } from "@/lib/api-client";
import {
  Search,
  Download,
  Trash2,
  MoreHorizontal,
  Grid,
  List,
  Image as ImageIcon,
  CheckSquare,
  Loader2,
} from "lucide-react";

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
    UPSCALE: "main",
    OUTPAINT: "detail",
    WATERMARK: "marketing",
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
  all: "全部场景",
  main: "主图",
  detail: "详情图",
  marketing: "营销图",
  "white-bg": "白底图",
  scene: "场景图",
  poster: "海报",
  other: "其他",
};

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0066FF]" />
        <span
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          AI 商品视觉工作台
        </span>
      </div>
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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          className="text-sm text-foreground font-medium"
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
    </header>
  );
}

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
    <div className="h-screen flex flex-col bg-background">
      <TopNav />

      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            结果管理
          </h1>
          <p
            className="text-sm text-muted-foreground mt-0.5"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            查看和下载已生成的图片结果
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索图片..."
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchResults()}
              style={{ fontFamily: "Geist, sans-serif" }}
            />
            <Button variant="outline" size="sm" onClick={fetchResults} disabled={loading}>
              <Loader2 className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3 py-2 text-sm transition-colors",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-[200px] border-r border-border flex flex-col shrink-0">
          <div className="p-4">
            <h2
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              场景分类
            </h2>
            <nav className="space-y-0.5">
              {Object.entries(CATEGORY_LABELS).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveCategory(id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    activeCategory === id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  style={{ fontFamily: "Geist, sans-serif" }}
                >
                  <span>{label}</span>
                  <Badge
                    variant={activeCategory === id ? "default" : "secondary"}
                    className="text-xs h-5 px-1.5"
                  >
                    {categoryCounts[id] || 0}
                  </Badge>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Bulk actions bar */}
          <div className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontFamily: "Geist, sans-serif" }}
              >
                <CheckSquare className={cn("w-4 h-4", isAllSelected && "text-primary")} />
                全选
              </button>
              {selectedIds.size > 0 && (
                <span
                  className="text-sm text-muted-foreground"
                  style={{ fontFamily: "Geist, sans-serif" }}
                >
                  已选择 {selectedIds.size} 项
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
              >
                <Download className="w-4 h-4 mr-1.5" />
                批量下载
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                className="text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                批量删除
              </Button>
            </div>
          </div>

          {/* Results grid */}
          <div className="flex-1 overflow-auto p-6">
            {loading && (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={fetchResults}>
                  重试
                </Button>
              </div>
            )}

            {!loading && !error && (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-3 gap-4">
                    {filteredResults.map((item) => (
                      <div
                        key={item.id}
                        className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-sm transition-shadow"
                      >
                        {/* Image placeholder */}
                        <div className="relative aspect-[4/3] bg-muted flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                          {/* Checkbox overlay */}
                          <div className="absolute top-3 left-3">
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                            />
                          </div>
                          {/* Hover actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button size="sm" variant="secondary">
                              <Download className="w-4 h-4 mr-1.5" />
                              下载
                            </Button>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4 mr-1.5" />
                              删除
                            </Button>
                          </div>
                        </div>
                        {/* Card info */}
                        <div className="p-3">
                          <h3
                            className="text-sm font-medium text-foreground truncate"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {item.name}
                          </h3>
                          <div className="flex items-center justify-between mt-1">
                            <p
                              className="text-xs text-muted-foreground"
                              style={{ fontFamily: "Geist, sans-serif" }}
                            >
                              {item.createdAt}
                            </p>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
                      >
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-sm font-medium text-foreground truncate"
                            style={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {item.name}
                          </h3>
                          <p
                            className="text-xs text-muted-foreground"
                            style={{ fontFamily: "Geist, sans-serif" }}
                          >
                            {item.createdAt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
                    <p
                      className="text-sm"
                      style={{ fontFamily: "Geist, sans-serif" }}
                    >
                      暂无结果
                    </p>
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
