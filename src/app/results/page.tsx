"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api-client";
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
  Layers,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import type { InpaintSubmitPayload } from "@/components/workbench/InpaintDialog";
import {
  type ActiveTask,
  type BackendImage,
  type FailedTask,
  type ResultImage,
  CATEGORY_LABELS,
  CATEGORY_PROCESS_TYPES,
  RESULTS_PAGE_SIZE,
  ImageThumbnail,
  WaterFillCard,
  downloadFile,
  formatDate,
  mapProcessType,
  parseGroup,
  thumbUrl,
} from "@/components/results/results-helpers";
import { ResultsLightbox } from "@/components/results/ResultsLightbox";

const InpaintDialog = dynamic(
  () => import("@/components/workbench/InpaintDialog").then((mod) => mod.InpaintDialog),
  { ssr: false }
);

// 图库网格用小尺寸缩略图：/api/files 支持 ?w= 按需缩放为 webp，把 ~1MB 原图降到 ~20-30KB

export default function ResultsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [groupByTask, setGroupByTask] = useState(false);
  const [focusedGroupKey, setFocusedGroupKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ResultImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({ all: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [failedTasks, setFailedTasks] = useState<FailedTask[]>([]);
  const [dismissedFailures, setDismissedFailures] = useState<Set<string>>(new Set());
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inpaintTarget, setInpaintTarget] = useState<{ id: string; url: string } | null>(null);
  const prevActiveCount = useRef(0);
  const touchStartX = useRef<number | null>(null);

  // 从 URL 聚焦到某任务/套图：/results?set=<setId> 或 ?task=<taskId>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = params.get("set");
    const task = params.get("task");
    if (set) {
      setGroupByTask(true);
      setFocusedGroupKey(`set:${set}`);
    } else if (task) {
      setGroupByTask(true);
      setFocusedGroupKey(`task:${task}`);
    }
  }, []);

  const fetchResults = useCallback(async (offset = 0) => {
    const append = offset > 0;
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("view", "gallery");
      params.append("limit", String(RESULTS_PAGE_SIZE));
      params.append("offset", String(offset));
      params.append("status", "COMPLETED");
      params.append("includeStats", "true");
      if (activeCategory !== "all") {
        params.append("processTypes", CATEGORY_PROCESS_TYPES[activeCategory].join(","));
      }
      if (appliedSearch) {
        params.append("search", appliedSearch);
      }

      const data = await apiGet<{
        success: boolean;
        images: BackendImage[];
        pagination: { total: number; hasMore: boolean };
        stats?: { total: number; processTypes: Record<string, number> };
      }>(
        `/api/images?${params.toString()}`
      );
      const mapped = data.images
        .map((img) => {
          const group = parseGroup(img.metadata);
          const sortTime = new Date(img.updatedAt || img.createdAt).getTime();
          return {
            id: img.id,
            name: img.filename,
            category: mapProcessType(img.processType),
            createdAt: formatDate(img.updatedAt || img.createdAt),
            sortTime: Number.isFinite(sortTime) ? sortTime : 0,
            thumbnail: img.thumbnailUrl,
            processedUrl: img.processedUrl,
            groupKey: group.key,
            groupLabel: group.label,
          };
        })
        .sort((a, b) => b.sortTime - a.sortTime);
      setResults((current) => {
        const seen = new Set(current.map((item) => item.id));
        return append
          ? [...current, ...mapped.filter((item) => !seen.has(item.id))]
          : mapped;
      });
      setHasMore(data.pagination.hasMore);
      if (data.stats) {
        const nextCounts: Record<string, number> = { all: data.stats.total };
        for (const [processType, count] of Object.entries(data.stats.processTypes)) {
          const category = mapProcessType(processType);
          nextCounts[category] = (nextCounts[category] || 0) + count;
        }
        setCategoryCounts(nextCounts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [activeCategory, appliedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAppliedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const fetchActive = useCallback(async () => {
    try {
      const data = await apiGet<{
        success: boolean;
        tasks: Array<{ id: string; type: string; status: string; progress: number; completedSteps?: number; totalSteps?: number; currentStep?: string | null; originalImageUrl: string | null }>;
      }>("/api/tasks/active");
      const mapped: ActiveTask[] = (data.tasks || []).map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        progress: t.progress,
        completedSteps: t.completedSteps,
        totalSteps: t.totalSteps,
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

  const fetchFailed = useCallback(async () => {
    try {
      const data = await apiGet<{ success: boolean; failures: FailedTask[] }>("/api/listing-set/failures");
      setFailedTasks(data.failures || []);
    } catch {
      // 失败 feed 为增强项，出错不打断图库
    }
  }, []);

  useEffect(() => {
    fetchActive();
    fetchFailed();
  }, [fetchActive, fetchFailed]);

  useEffect(() => {
    if (activeTasks.length === 0) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        fetchActive();
      }
    };
    const timer = window.setInterval(refreshWhenVisible, 5000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [activeTasks.length, fetchActive]);

  const visibleFailures = failedTasks.filter((f) => !dismissedFailures.has(f.id));
  const handleRetryMissing = async (id: string) => {
    setRetryingId(id);
    try {
      await apiPost("/api/listing-set/retry", { taskId: id });
      // 隐藏该失败卡，补齐任务会以「处理中」占位出现，完成后并入同一套图分组
      setDismissedFailures((prev) => new Set(prev).add(id));
      fetchActive();
      fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : "重试失败");
    } finally {
      setRetryingId(null);
    }
  };

  const dismissFailure = (id: string) => {
    setDismissedFailures((prev) => new Set(prev).add(id));
  };

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

  const handleCancelTask = async (id: string) => {
    if (!confirm("取消并删除这个进行中的任务吗？")) return;
    try {
      await apiDelete(`/api/tasks/${id}`);
      setActiveTasks((prev) => prev.filter((t) => t.id !== id));
      fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : "取消失败");
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
      fetchActive();
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

  // 按任务把结果合并成分组（保持出现顺序）；无合并键的作为单张
  const taskGroups: Array<{ key: string; label: string; createdAt: string; sortTime: number; items: ResultImage[] }> = [];
  const ungrouped: ResultImage[] = [];
  if (groupByTask) {
    const map = new Map<string, { key: string; label: string; createdAt: string; sortTime: number; items: ResultImage[] }>();
    for (const item of filteredResults) {
      if (item.groupKey) {
        let g = map.get(item.groupKey);
        if (!g) {
          g = { key: item.groupKey, label: item.groupLabel || "生成任务", createdAt: item.createdAt, sortTime: item.sortTime, items: [] };
          map.set(item.groupKey, g);
          taskGroups.push(g);
        }
        g.items.push(item);
        if (item.sortTime > g.sortTime) {
          g.sortTime = item.sortTime;
          g.createdAt = item.createdAt;
        }
      } else {
        ungrouped.push(item);
      }
    }
    taskGroups.sort((a, b) => b.sortTime - a.sortTime);
    ungrouped.sort((a, b) => b.sortTime - a.sortTime);
  }

  // #2 灯箱：当前可见有序列表（镜像渲染顺序），供左右切换
  const focusedGroup = groupByTask && focusedGroupKey ? taskGroups.find((g) => g.key === focusedGroupKey) : null;
  const visibleImages: ResultImage[] = groupByTask
    ? focusedGroup
      ? focusedGroup.items
      : [...taskGroups.flatMap((g) => g.items), ...ungrouped]
    : filteredResults;
  const lightboxItem = lightboxIndex != null ? visibleImages[lightboxIndex] : null;
  const lightboxUrl = lightboxItem ? lightboxItem.processedUrl || lightboxItem.thumbnail || null : null;
  const openLightbox = (item: ResultImage) => {
    const idx = visibleImages.findIndex((i) => i.id === item.id);
    if (idx >= 0) setLightboxIndex(idx);
  };
  const moveLightbox = (delta: number) =>
    setLightboxIndex((i) => (i == null ? i : Math.max(0, Math.min(visibleImages.length - 1, i + delta))));

  // 键盘 ←/→/Esc 切换/关闭大图
  useEffect(() => {
    if (lightboxIndex == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") moveLightbox(-1);
      else if (e.key === "ArrowRight") moveLightbox(1);
      else if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxIndex, visibleImages.length]);

  const renderGridCard = (item: ResultImage) => (
    <div
      key={item.id}
      className={cn(
        "group glass-panel overflow-hidden rounded-[16px] transition-all duration-200 hover:-translate-y-0.5",
        selectedIds.has(item.id) && "ring-2 ring-brand"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        <ImageThumbnail src={item.thumbnail || item.processedUrl} alt={item.name} className="h-full w-full" thumbWidth={400} />
        <button
          type="button"
          aria-label="查看大图"
          className="absolute inset-0 cursor-zoom-in"
          onClick={() => openLightbox(item)}
        />
        <span className="absolute left-2 top-2 rounded-full bg-surface/85 px-2 py-0.5 text-[10px] font-semibold text-brand-text backdrop-blur-sm">
          {CATEGORY_LABELS[item.category] || "其他"}
        </span>
        <div
          className={cn(
            "absolute right-2 top-2 transition-opacity",
            selectedIds.has(item.id) ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
          )}
        >
          <div className="rounded-md bg-surface/85 p-1 backdrop-blur-sm">
            <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity">
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
  );

  const renderActiveCard = (task: ActiveTask) => (
    <div key={`active-${task.id}`} className="group glass-panel relative overflow-hidden rounded-[16px]">
      <WaterFillCard task={task} />
      <button
        type="button"
        onClick={() => handleCancelTask(task.id)}
        className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-danger shadow-soft transition-colors hover:bg-white"
        title="取消并删除任务"
        aria-label="取消并删除任务"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="px-2.5 py-2">
        <h3 className="truncate text-[12px] font-semibold text-ink">处理中…</h3>
        <p className="mt-0.5 hidden text-[11px] text-ink-3 sm:block">{CATEGORY_LABELS[task.category] || "其他"}</p>
      </div>
    </div>
  );

  const renderFailedCard = (f: FailedTask) => {
    const totalFail = f.status === "FAILED";
    return (
      <div key={`failed-${f.id}`} className="group glass-panel relative overflow-hidden rounded-[16px] ring-1 ring-amber-300/60">
        <div className="relative aspect-square overflow-hidden bg-surface-muted">
          <ImageThumbnail src={f.originalImageUrl} alt="生成失败" className="h-full w-full" thumbWidth={400} />
          <div className="absolute inset-0 bg-black/50" />
          <button
            type="button"
            onClick={() => dismissFailure(f.id)}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/85 text-ink-2 shadow-soft backdrop-blur-sm transition-colors hover:text-ink"
            title="忽略"
            aria-label="忽略"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center text-white">
            <AlertTriangle className="h-6 w-6 text-amber-300" />
            <span className="text-[12px] font-bold">
              {totalFail ? "整套生成失败" : `${f.failed ?? "部分"} 张生成失败`}
            </span>
            {f.total ? <span className="text-[11px] text-white/80">计划 {f.total} 张</span> : null}
            <button
              type="button"
              onClick={() => handleRetryMissing(f.id)}
              disabled={retryingId === f.id}
              className="mt-1 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
            >
              {retryingId === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {totalFail ? "重试整套" : "重试缺失"}
            </button>
          </div>
        </div>
        <div className="px-2.5 py-2">
          <h3 className="truncate text-[12px] font-semibold text-ink">商品套图</h3>
          <p className="mt-0.5 truncate text-[11px] text-ink-3">{f.reason || "点击重试补齐缺失的图"}</p>
        </div>
      </div>
    );
  };

  const gridColStyle = { gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" } as const;

  return (
    <div className="h-full flex flex-col bg-background">
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setAppliedSearch(searchQuery.trim());
                    }}
                  />
                </div>
                <button
                  onClick={() => { setGroupByTask((v) => !v); setFocusedGroupKey(null); }}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                    groupByTask
                      ? "border-transparent bg-accent-gradient text-white"
                      : "border-line bg-surface text-ink-2 hover:text-ink"
                  )}
                  aria-pressed={groupByTask}
                  title="按任务合并同一批生成的结果"
                >
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">按任务</span>
                </button>
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
	                <Button variant="outline" size="sm" className="mt-3 min-h-11" onClick={() => fetchResults()}>
                  重试
                </Button>
              </div>
            )}

            {!loading && !error && (
              <>
                {groupByTask ? (
                  (() => {
                    const focused = focusedGroupKey ? taskGroups.find((g) => g.key === focusedGroupKey) : null;
                    // 聚焦某个任务：只看这一套的图 + 返回全部
                    if (focused) {
                      return (
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => setFocusedGroupKey(null)}
                            className="flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            返回全部
                          </button>
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-brand" />
                            <h3 className="text-[14px] font-bold text-ink">{focused.label}</h3>
                            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-text">{focused.items.length} 张</span>
                            <span className="hidden text-[11px] text-ink-3 sm:inline">{focused.createdAt}</span>
                          </div>
                          <div className="grid gap-3" style={gridColStyle}>
                            {focused.items.map(renderGridCard)}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-5">
                        {(visibleFailures.length > 0 || filteredActive.length > 0) && (
                          <div className="grid gap-3" style={gridColStyle}>
                            {visibleFailures.map(renderFailedCard)}
                            {filteredActive.map(renderActiveCard)}
                          </div>
                        )}
                        {taskGroups.map((g) => (
                          <section key={g.key}>
                            <button
                              type="button"
                              onClick={() => setFocusedGroupKey(g.key)}
                              className="group/hdr mb-2.5 flex w-full items-center gap-2 text-left"
                              title="只看这个任务"
                            >
                              <Layers className="h-4 w-4 text-brand" />
                              <h3 className="text-[14px] font-bold text-ink">{g.label}</h3>
                              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand-text">{g.items.length} 张</span>
                              <span className="hidden text-[11px] text-ink-3 sm:inline">{g.createdAt}</span>
                              <span className="ml-auto flex items-center gap-0.5 text-[12px] font-semibold text-ink-3 transition-colors group-hover/hdr:text-brand">
                                只看这套
                                <ChevronRight className="h-3.5 w-3.5" />
                              </span>
                            </button>
                            <div className="grid gap-3" style={gridColStyle}>
                              {g.items.map(renderGridCard)}
                            </div>
                          </section>
                        ))}
                        {ungrouped.length > 0 && (
                          <section>
                            <div className="mb-2.5 flex items-center gap-2">
                              <h3 className="text-[14px] font-bold text-ink">单张结果</h3>
                              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-2">{ungrouped.length} 张</span>
                            </div>
                            <div className="grid gap-3" style={gridColStyle}>
                              {ungrouped.map(renderGridCard)}
                            </div>
                          </section>
                        )}
                      </div>
                    );
                  })()
                ) : viewMode === "grid" ? (
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}
                  >
                    {visibleFailures.map(renderFailedCard)}
                    {filteredActive.map((task) => (
                      <div key={`active-${task.id}`} className="group glass-panel relative overflow-hidden rounded-[16px]">
                        <WaterFillCard task={task} />
                        <button
                          type="button"
                          onClick={() => handleCancelTask(task.id)}
                          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-danger shadow-soft transition-colors hover:bg-white"
                          title="取消并删除任务"
                          aria-label="取消并删除任务"
                        >
                          <X className="h-4 w-4" />
                        </button>
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
                          <ImageThumbnail src={item.thumbnail || item.processedUrl} alt={item.name} className="h-full w-full" thumbWidth={400} />
                          <button
                            type="button"
                            aria-label="查看大图"
                            className="absolute inset-0 cursor-zoom-in"
                            onClick={() => openLightbox(item)}
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
                          {/* 操作栏：常驻可见（桌面不再仅 hover 显示） */}
	                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity">
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
                          <ImageThumbnail src={item.thumbnail || item.processedUrl} alt={item.name} className="h-full w-full" thumbWidth={400} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-[13px] font-semibold text-ink">{item.name}</h3>
                          <p className="hidden text-[11px] text-ink-3 sm:block">{item.createdAt}</p>
                        </div>
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-text">
                          {CATEGORY_LABELS[item.category] || "其他"}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-100 transition-opacity">
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

                {filteredResults.length === 0 && filteredActive.length === 0 && visibleFailures.length === 0 && (
                  <div className="flex min-h-[62vh] w-full items-center justify-center">
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

                {hasMore && results.length > 0 && (
                  <div className="flex justify-center py-6">
                    <Button
                      variant="outline"
                      className="min-h-11 rounded-full px-6"
                      disabled={loadingMore}
                      onClick={() => fetchResults(results.length)}
                    >
                      {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {loadingMore ? "加载中" : "加载更多"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 大图灯箱：左右箭头 / 键盘 ←→ / 触摸滑动 切换 */}
      {lightboxItem && lightboxUrl && lightboxIndex != null && (
        <ResultsLightbox
          item={lightboxItem}
          url={lightboxUrl}
          index={lightboxIndex}
          total={visibleImages.length}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => moveLightbox(-1)}
          onNext={() => moveLightbox(1)}
        />
      )}

      {/* 局部重绘弹窗 */}
      {inpaintTarget && (
        <InpaintDialog
          open
          imageUrl={inpaintTarget.url}
          imageId={inpaintTarget.id}
          onClose={() => setInpaintTarget(null)}
          onSubmit={handleInpaintSubmit}
        />
      )}
    </div>
  );
}
