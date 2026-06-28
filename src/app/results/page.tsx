"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
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
  Paintbrush,
  X,
} from "lucide-react";
import { InpaintDialog, type InpaintSubmitPayload } from "@/components/workbench/InpaintDialog";

function ImageThumbnail({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return <BrandImageFallback title="图片预览" description="素材暂不可用" pose="sleep" className={cn("rounded-none", className)} />;
  }
  return <img src={src} alt={alt} className={cn("w-full h-full object-cover", className)} onError={() => setError(true)} />;
}

interface ActiveTask {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep?: string | null;
  originalImageUrl: string | null;
  category: string;
}

// 进行中任务占位：原图打底，水位随进度上涨，跑完即变成实景
function WaterFillCard({ task }: { task: ActiveTask }) {
  const pending = task.status === "PENDING";
  const level = Math.max(6, Math.min(100, Math.round(task.progress || 0)));
  return (
    <div className="relative aspect-square overflow-hidden bg-surface-muted">
      <ImageThumbnail src={task.originalImageUrl} alt="处理中" className="h-full w-full" />
      {/* 原图压暗，凸显水位 */}
      <div className="absolute inset-0 bg-black/35" />
      {/* 水体（随进度上涨，平滑过渡） */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
        style={{ height: pending ? "6%" : `${level}%` }}
      >
        {/* 两层水面波浪 */}
        <div className="water-wave absolute -top-3 inset-x-0 h-4" />
        <div className="water-wave-2 absolute -top-2 inset-x-0 h-3.5" />
        {/* 水体渐变 */}
        <div className="absolute inset-x-0 top-1 bottom-0 bg-gradient-to-t from-[#7c6cff]/75 to-[#a78bff]/30" />
      </div>
      {/* 进度文案 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-sm">
          <Loader2 className="h-3 w-3 animate-spin" />
          {pending ? "排队中" : `生成中 ${level}%`}
        </span>
      </div>
    </div>
  );
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

// 下载图片：拉成 blob 强制下载，失败则新标签打开
async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
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
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const [inpaintTarget, setInpaintTarget] = useState<{ id: string; url: string } | null>(null);
  const prevActiveCount = useRef(0);

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

  const fetchActive = useCallback(async () => {
    try {
      const data = await apiGet<{
        success: boolean;
        tasks: Array<{ id: string; type: string; status: string; progress: number; currentStep?: string | null; originalImageUrl: string | null }>;
      }>("/api/tasks/active");
      const mapped: ActiveTask[] = (data.tasks || []).map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        progress: t.progress,
        currentStep: t.currentStep,
        originalImageUrl: t.originalImageUrl,
        category: mapProcessType(t.type),
      }));
      setActiveTasks(mapped);
      // 有任务跑完（数量减少）时，刷新已完成列表把"实景"拉进来
      if (mapped.length < prevActiveCount.current) {
        fetchResults();
      }
      prevActiveCount.current = mapped.length;
    } catch {
      // 进行中占位为增强项，失败不打断图库
    }
  }, [fetchResults]);

  useEffect(() => {
    fetchActive();
    const timer = setInterval(fetchActive, 3500);
    return () => clearInterval(timer);
  }, [fetchActive]);

  const filteredActive = activeTasks.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
  );

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

  const handleDeleteOne = async (id: string) => {
    if (!confirm("确定删除这张图片吗？")) return;
    try {
      await apiPatch("/api/images", { imageIds: [id], action: "delete" });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleInpaintSubmit = async (payload: InpaintSubmitPayload) => {
    try {
      await apiPost("/api/inpaint", {
        imageDataUrl: payload.imageDataUrl,
        maskDataUrl: payload.maskDataUrl,
        sourceImageUrl: inpaintTarget?.url,
        prompt: payload.prompt,
        action: payload.action,
        strength: payload.strength,
      });
      setInpaintTarget(null);
      // 轮询拉取，等待 worker 产出结果
      setTimeout(() => fetchResults(), 2500);
      setTimeout(() => fetchResults(), 8000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "提交局部重绘失败");
    }
  };

  const handleBulkDownload = async () => {
    if (selectedIds.size === 0) return;
    const targets = filteredResults.filter((r) => selectedIds.has(r.id));
    for (const item of targets) {
      const url = item.processedUrl || item.thumbnail;
      if (url) await downloadFile(url, item.name);
    }
  };

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
	                  "min-h-9 shrink-0 rounded-full px-2.5 text-[12px] font-medium transition-colors",
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
          {/* 上下文工具栏：默认仅搜索+视图；选中后整行切换为批量操作 */}
          <div className="flex items-center gap-2 border-b border-line glass-panel rounded-none px-4 py-2 shrink-0 sm:px-6">
            {selectedIds.size > 0 ? (
              <>
                <button
                  onClick={toggleSelectAll}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] text-ink-2 transition-colors hover:text-ink"
                >
                  <CheckSquare className={cn("h-3.5 w-3.5", isAllSelected && "text-brand")} />
                  {isAllSelected ? "取消全选" : "全选"}
                </button>
                <span className="text-[13px] font-medium text-brand-text">已选 {selectedIds.size}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-full border-line-strong bg-surface px-3 text-[13px]"
                    onClick={handleBulkDownload}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" />
                    下载
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 rounded-full border-line-strong bg-surface px-3 text-[13px] text-danger hover:text-danger"
                    onClick={handleBulkDelete}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    删除
                  </Button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="flex h-9 shrink-0 items-center rounded-full px-2.5 text-[13px] text-ink-3 transition-colors hover:text-ink"
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                  <Input
                    placeholder="搜索图片…"
                    className="h-9 w-full rounded-full pl-8 text-[13px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchResults()}
                  />
                </div>
                <button
                  onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-3 transition-colors hover:text-ink"
                  aria-label={viewMode === "grid" ? "切换为列表视图" : "切换为网格视图"}
                  title={viewMode === "grid" ? "列表视图" : "网格视图"}
                >
                  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                </button>
              </>
            )}
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
                    {filteredActive.map((task) => (
                      <div key={`active-${task.id}`} className="glass-panel overflow-hidden rounded-[16px]">
                        <WaterFillCard task={task} />
                        <div className="px-2.5 py-2">
                          <h3 className="truncate text-[12px] font-semibold text-ink">处理中…</h3>
                          <p className="mt-0.5 hidden text-[11px] text-ink-3 sm:block">
                            {CATEGORY_LABELS[task.category] || "其他"}
                          </p>
                        </div>
                      </div>
                    ))}
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
                          <button
                            type="button"
                            aria-label="查看大图"
                            className="absolute inset-0 cursor-zoom-in"
                            onClick={() => {
                              const url = item.processedUrl || item.thumbnail;
                              if (url) setLightbox({ url, name: item.name });
                            }}
                          />
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
	                            <button type="button" onClick={(e) => { e.stopPropagation(); const u = item.processedUrl || item.thumbnail; if (u) setInpaintTarget({ id: item.id, url: u }); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-2 hover:text-brand" title="局部重绘">
	                              <Paintbrush className="h-3.5 w-3.5" />
	                            </button>
	                            <button type="button" onClick={(e) => { e.stopPropagation(); const u = item.processedUrl || item.thumbnail; if (u) downloadFile(u, item.name); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-2 hover:text-ink" title="下载">
	                              <Download className="h-3.5 w-3.5" />
	                            </button>
	                            <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteOne(item.id); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink-2 hover:text-danger" title="删除">
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
	                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-ink-2 hover:text-brand" title="局部重绘" onClick={() => { const u = item.processedUrl || item.thumbnail; if (u) setInpaintTarget({ id: item.id, url: u }); }}>
                            <Paintbrush className="h-3.5 w-3.5" />
                          </Button>
	                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-ink-2" onClick={() => { const u = item.processedUrl || item.thumbnail; if (u) downloadFile(u, item.name); }}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
	                          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 text-ink-2 hover:text-danger" onClick={() => handleDeleteOne(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredResults.length === 0 && filteredActive.length === 0 && (
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
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 大图灯箱 */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.url}
            alt={lightbox.name}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(lightbox.url, lightbox.name);
            }}
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-white"
          >
            <Download className="h-4 w-4" />
            下载图片
          </button>
        </div>
      )}

      {/* 局部重绘弹窗 */}
      <InpaintDialog
        open={!!inpaintTarget}
        imageUrl={inpaintTarget?.url || ""}
        imageId={inpaintTarget?.id || ""}
        onClose={() => setInpaintTarget(null)}
        onSubmit={handleInpaintSubmit}
      />
    </div>
  );
}
