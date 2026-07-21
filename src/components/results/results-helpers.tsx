"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandImageFallback } from "@/components/brands/SpriteImage";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";

export function thumbUrl(url?: string | null, w = 400): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/api/files/") || url.startsWith("/uploads/")) {
    return `${url}${url.includes("?") ? "&" : "?"}w=${w}`;
  }
  return url;
}

export function ImageThumbnail({ src, alt, className, thumbWidth }: { src?: string | null; alt: string; className?: string; thumbWidth?: number }) {
  const [error, setError] = useState(false);
  const resolved = thumbWidth ? thumbUrl(src, thumbWidth) : src;
  if (!resolved || error) {
    return <BrandImageFallback title="图片预览" description="素材暂不可用" pose="sleep" className={cn("rounded-none", className)} />;
  }
  return (
    // 缩略图已由 /api/files?w= 生成 WebP，保留原生 img 以支持任意本地文件 URL。
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("w-full h-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}

export interface ActiveTask {
  id: string;
  type: string;
  status: string;
  progress: number;
  completedSteps?: number;
  totalSteps?: number;
  currentStep?: string | null;
  originalImageUrl: string | null;
  category: string;
}

export interface FailedTask {
  id: string;
  setId: string | null;
  status: string;
  total: number | null;
  failed: number | null;
  reason: string | null;
  originalImageUrl: string | null;
  createdAt: string;
}

// 进行中任务占位：原图打底，水位随进度上涨，跑完即变成实景
export function WaterFillCard({ task }: { task: ActiveTask }) {
  const pending = task.status === "PENDING";
  const total = task.totalSteps ?? 0;
  const done = task.completedSteps ?? 0;
  // 有多张任务时按「已完成/总数」显示水位，更贴合套图逐张出图
  const level = total > 1
    ? Math.max(6, Math.min(100, Math.round((done / total) * 100)))
    : Math.max(6, Math.min(100, Math.round(task.progress || 0)));
  const countLabel = total > 1 ? `${done}/${total} 张` : null;
  return (
    <div className="relative aspect-square overflow-hidden bg-surface-muted">
      <ImageThumbnail src={task.originalImageUrl} alt="处理中" className="h-full w-full" thumbWidth={400} />
      {/* 原图压暗，凸显水位 */}
      <div className="absolute inset-0 bg-black/35" />
      {/* 水体（随进度上涨，平滑过渡） */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
        style={{ height: pending && total <= 1 ? "6%" : `${level}%` }}
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
          {countLabel ? `生成中 ${countLabel}` : pending ? "排队中" : `生成中 ${level}%`}
        </span>
      </div>
    </div>
  );
}

export interface BackendImage {
  id: string;
  filename: string;
  thumbnailUrl: string | null;
  processedUrl: string | null;
  processType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: string | null;
}

export interface ResultImage {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  sortTime: number;
  thumbnail?: string | null;
  processedUrl?: string | null;
  /** 同一大任务的合并键（套图 setId / 场景 taskId），无则为单张 */
  groupKey?: string;
  groupLabel?: string;
}

export const WORKFLOW_LABELS: Record<string, string> = {
  listing_set: "商品套图",
  scene_generation: "场景图",
  background_replace: "背景替换",
  video_generation: "视频生成",
};

// 从 ProcessedImage.metadata 解析「所属大任务」的合并键与标题
export function parseGroup(metaStr?: string | null): { key?: string; label?: string } {
  if (!metaStr) return {};
  try {
    const m = JSON.parse(metaStr) as Record<string, unknown>;
    const op = typeof m.operation === "string" ? m.operation : undefined;
    const wf = typeof m.workflowType === "string" ? m.workflowType : undefined;
    const name = (typeof m.productName === "string" && m.productName) ||
      (typeof m.presetName === "string" && m.presetName) || "";
    if (typeof m.setId === "string" && m.setId) {
      return { key: `set:${m.setId}`, label: name || WORKFLOW_LABELS[op ?? ""] || "商品套图" };
    }
    if (typeof m.taskId === "string" && m.taskId) {
      return { key: `task:${m.taskId}`, label: name || WORKFLOW_LABELS[wf ?? ""] || "生成任务" };
    }
    return {};
  } catch {
    return {};
  }
}

export function mapProcessType(type: string): string {
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
    WHITE_BACKGROUND: "white-bg",
    VIDEO_GENERATION: "other",
  };
  return map[type] || "other";
}

export function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 下载图片：拉成 blob 强制下载，失败则新标签打开
export async function downloadFile(url: string, name: string) {
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

export const CATEGORY_LABELS: Record<string, string> = {
  all: "全部",
  scene: "场景图",
  main: "主图",
  detail: "详情图",
  marketing: "营销图",
  poster: "海报",
  "white-bg": "白底图",
};

export const CATEGORY_PROCESS_TYPES: Record<string, string[]> = {
  scene: ["BACKGROUND_REMOVAL", "BACKGROUND_REPLACE"],
  main: ["IMAGE_UPSCALING", "UPSCALE"],
  detail: ["IMAGE_OUTPAINTING", "IMAGE_EXPANSION", "OUTPAINT"],
  marketing: ["WATERMARK"],
  poster: ["ONE_CLICK_WORKFLOW", "ONE_CLICK"],
  "white-bg": ["WHITE_BACKGROUND"],
};

export const RESULTS_PAGE_SIZE = 24;

