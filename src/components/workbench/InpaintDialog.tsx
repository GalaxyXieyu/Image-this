"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Lasso, Paintbrush, Sparkles, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "brush" | "lasso" | "eraser";
export type InpaintAction = "inpaint" | "remove" | "enhance";
export type InpaintStrength = "low" | "medium" | "high";

export interface InpaintSubmitPayload {
  imageId: string;
  prompt: string;
  maskDataUrl: string;
  imageDataUrl: string;
  action: InpaintAction;
  strength: InpaintStrength;
}

interface InpaintDialogProps {
  open: boolean;
  imageUrl: string;
  imageId: string;
  onClose: () => void;
  onSubmit: (data: InpaintSubmitPayload) => void | Promise<void>;
}

const CHIPS = [
  { label: "水珠质感", text: "增加水珠质感" },
  { label: "浅米色背景", text: "背景换成浅米色" },
  { label: "去掉文字", text: "去掉文字标注" },
  { label: "柔和光线", text: "光线更柔和自然" },
  { label: "更锐利", text: "产品轮廓更清晰锐利" },
];

const ACTION_PROMPT_HINT: Record<InpaintAction, string> = {
  inpaint: "例如：把这里换成更饱满鲜艳的、增加水珠质感、背景换成浅米色…",
  remove: "例如：去掉这个区域的文字、水印、杂物（可留空使用默认擦除）",
  enhance: "例如：提升这块区域清晰度，增强边缘细节和纹理（可留空使用默认增强）",
};

const ACTION_AUTO_PROMPT: Record<InpaintAction, string> = {
  inpaint: "",
  remove: "移除圈选区域中的元素，并保持背景自然衔接",
  enhance: "增强圈选区域清晰度与细节，避免明显伪影",
};

export function InpaintDialog({ open, imageUrl, imageId, onClose, onSubmit }: InpaintDialogProps) {
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const draggingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const lassoRef = useRef<{ x: number; y: number }[]>([]);

  const [tool, setTool] = useState<Tool>("brush");
  const [action, setAction] = useState<InpaintAction>("inpaint");
  const [strength, setStrength] = useState<InpaintStrength>("medium");
  const [brushSize, setBrushSize] = useState(28);
  const [prompt, setPrompt] = useState("");
  const [hasMask, setHasMask] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const syncSize = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const w = img.naturalWidth || rect.width;
    const h = img.naturalHeight || rect.height;
    for (const c of [maskRef.current, previewRef.current]) {
      if (!c) continue;
      c.width = w;
      c.height = h;
      c.style.width = rect.width + "px";
      c.style.height = rect.height + "px";
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(syncSize, 120);
    window.addEventListener("resize", syncSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", syncSize);
    };
  }, [open, syncSize, imageUrl]);

  useEffect(() => {
    if (open) {
      setPrompt("");
      setHasMask(false);
      setSubmitting(false);
      setTool("brush");
      setAction("inpaint");
      setStrength("medium");
      lassoRef.current = [];
      draggingRef.current = false;
      lastPtRef.current = null;
    }
  }, [open, imageId]);

  // 选区高亮色（画布上以满不透明度绘制，画布整体用 CSS opacity 呈半透明 → 均匀、不叠深、对比清晰）
  const MASK_FILL = "rgba(255,70,0,1)";

  function getPos(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const mc = maskRef.current;
    if (!mc) return { x: 0, y: 0 };
    const rect = mc.getBoundingClientRect();
    const sx = mc.width / rect.width;
    const sy = mc.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  // 画笔/橡皮：从上一点到当前点连成粗圆头线段，涂抹连续无断点
  function paintStroke(from: { x: number; y: number } | null, to: { x: number; y: number }) {
    const mc = maskRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.strokeStyle = MASK_FILL;
      ctx.fillStyle = MASK_FILL;
    }
    if (from) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    checkMask();
  }

  // 套索：拖动时在预览层实时画虚线轮廓；松手闭合并填到蒙版层
  function drawLassoPreview() {
    const pc = previewRef.current;
    if (!pc) return;
    const ctx = pc.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, pc.width, pc.height);
    const pts = lassoRef.current;
    if (pts.length < 1) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.fillStyle = "rgba(255,70,0,0.18)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,70,0,0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.restore();
  }

  function commitLasso(points: { x: number; y: number }[]) {
    const pc = previewRef.current;
    pc?.getContext("2d")?.clearRect(0, 0, pc.width, pc.height);
    const mc = maskRef.current;
    if (!mc || points.length < 3) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = MASK_FILL;
    ctx.fill();
    ctx.restore();
    checkMask();
  }

  function checkMask() {
    const mc = maskRef.current;
    if (!mc) return;
    const ctx = mc.getContext("2d");
    if (!ctx) return;
    const d = ctx.getImageData(0, 0, mc.width, mc.height).data;
    let has = false;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 10) { has = true; break; }
    }
    setHasMask(has);
  }

  function clearMask() {
    const mc = maskRef.current;
    const pc = previewRef.current;
    mc?.getContext("2d")?.clearRect(0, 0, mc.width, mc.height);
    pc?.getContext("2d")?.clearRect(0, 0, pc.width, pc.height);
    lassoRef.current = [];
    setHasMask(false);
  }

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    try {
      maskRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      // 某些浏览器/事件下 setPointerCapture 可能抛错，忽略不影响绘制
    }
    draggingRef.current = true;
    const p = getPos(e);
    if (tool === "lasso") {
      lassoRef.current = [p];
      drawLassoPreview();
    } else {
      lastPtRef.current = null;
      paintStroke(null, p);
      lastPtRef.current = p;
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    e.preventDefault();
    const p = getPos(e);
    if (tool === "lasso") {
      lassoRef.current.push(p);
      drawLassoPreview();
    } else {
      paintStroke(lastPtRef.current, p);
      lastPtRef.current = p;
    }
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (tool === "lasso") {
      commitLasso(lassoRef.current);
      lassoRef.current = [];
    }
    lastPtRef.current = null;
  }

  function appendChip(text: string) {
    setPrompt((prev) => (prev ? prev + "，" + text : text));
  }

  /** 把原图按自然尺寸导出为 data URL，与蒙版对齐 */
  function exportSourceDataUrl(): string {
    const img = imgRef.current;
    if (!img) return "";
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, c.width, c.height);
    try {
      return c.toDataURL("image/jpeg", 0.92);
    } catch {
      return "";
    }
  }

  async function handleSubmit() {
    const mc = maskRef.current;
    if (!mc) return;
    setSubmitting(true);
    try {
      const maskDataUrl = mc.toDataURL("image/png");
      const imageDataUrl = exportSourceDataUrl();
      if (!imageDataUrl) {
        throw new Error("无法读取原图像素");
      }
      const effectivePrompt = prompt.trim() || ACTION_AUTO_PROMPT[action];
      await onSubmit({ imageId, prompt: effectivePrompt, maskDataUrl, imageDataUrl, action, strength });
      onClose();
    } catch {
      // 交由父级处理错误提示
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const canSubmit = hasMask && (action !== "inpaint" || !!prompt.trim());

  const modeButtons: { key: InpaintAction; label: string; icon: React.ReactNode }[] = [
    { key: "inpaint", label: "区域重绘", icon: <Paintbrush className="h-3.5 w-3.5" /> },
    { key: "remove", label: "擦除", icon: <Eraser className="h-3.5 w-3.5" /> },
    { key: "enhance", label: "变清晰", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  const toolButtons: { t: Tool; icon: React.ReactNode; title: string }[] = [
    { t: "brush", icon: <Paintbrush className="h-4 w-4" />, title: "画笔涂抹" },
    { t: "lasso", icon: <Lasso className="h-4 w-4" />, title: "套索多边形" },
    { t: "eraser", icon: <Eraser className="h-4 w-4" />, title: "橡皮擦" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[24px] border border-line bg-surface shadow-float sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Paintbrush className="h-4 w-4 text-brand" />
            AI 局部重绘
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* 模式 + 强度 */}
          <div className="px-5 pt-4">
            <div className="mb-3 rounded-[12px] border border-line bg-surface-muted/50 p-2.5">
              <div className="mb-1.5 text-[11px] text-ink-3">编辑模式</div>
              <div className="flex flex-wrap gap-1.5">
                {modeButtons.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAction(item.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
                      action === item.key
                        ? "border-brand bg-brand-soft text-brand-text"
                        : "border-line text-ink-3 hover:text-ink"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-ink-3">
                强度
                {([
                  { key: "low" as const, label: "轻微" },
                  { key: "medium" as const, label: "中等" },
                  { key: "high" as const, label: "大幅" },
                ]).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStrength(item.key)}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 transition-colors",
                      strength === item.key
                        ? "bg-brand-soft text-brand-text"
                        : "bg-surface text-ink-3 hover:text-ink"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 工具栏 */}
            <div className="flex items-center gap-2.5 rounded-t-[12px] border border-b-0 border-line bg-surface-muted/50 px-3 py-2">
              <div className="flex gap-1">
                {toolButtons.map(({ t, icon, title }) => (
                  <button
                    key={t}
                    title={title}
                    onClick={() => {
                      setTool(t);
                      lassoRef.current = [];
                      previewRef.current?.getContext("2d")?.clearRect(0, 0, previewRef.current.width, previewRef.current.height);
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                      tool === t
                        ? "border-brand bg-brand-soft text-brand-text"
                        : "border-transparent text-ink-3 hover:bg-surface hover:text-ink"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="mx-1 h-5 w-px bg-line" />
              <span className="text-[11px] text-ink-3">笔刷</span>
              <input
                type="range"
                min={8}
                max={60}
                value={brushSize}
                onChange={(e) => setBrushSize(+e.target.value)}
                className="h-[3px] w-20 cursor-pointer appearance-none rounded bg-line [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand"
              />
              <span className="min-w-[22px] text-[11px] tabular-nums text-brand-text">{brushSize}</span>
              <button
                onClick={clearMask}
                className="ml-auto flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-[11px] text-ink-3 transition-colors hover:border-danger/40 hover:text-danger"
              >
                <Trash2 className="h-3 w-3" />
                清除
              </button>
            </div>

            {/* 画布 */}
            <div className="relative overflow-hidden rounded-b-[12px] border border-line bg-[#111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="预览"
                className="block w-full"
                style={{ maxHeight: 300, objectFit: "contain" }}
                onLoad={syncSize}
                crossOrigin="anonymous"
              />
              {/* 蒙版层：满不透明度绘制，CSS opacity 呈半透明 → 选区均匀清晰、触控可画 */}
              <canvas
                ref={maskRef}
                className="absolute left-0 top-0 cursor-crosshair touch-none select-none"
                style={{ width: "100%", height: "100%", opacity: 0.5 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerUp}
              />
              {/* 预览层：套索拖动时的实时虚线轮廓，压在蒙版之上 */}
              <canvas
                ref={previewRef}
                className="pointer-events-none absolute left-0 top-0"
                style={{ width: "100%", height: "100%" }}
              />
              {!hasMask && (
                <div className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white backdrop-blur">
                  {tool === "lasso" ? "按住拖动圈出区域，松手闭合" : "按住涂抹想修改的区域"}
                </div>
              )}
              {hasMask && (
                <div className="pointer-events-none absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white shadow-soft">
                  ✦ 已选区域
                </div>
              )}
              {tool === "lasso" && (
                <div className="pointer-events-none absolute right-2.5 top-2.5 rounded-full bg-brand/90 px-2.5 py-1 text-[11px] text-white">
                  按住拖动圈选
                </div>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div className="px-5 pb-4 pt-3">
            <div className="mb-2 flex items-center gap-2 text-[12px] text-ink-3">
              {action === "inpaint" ? "描述修改内容" : action === "remove" ? "可选补充说明" : "可选增强说明"}
              <span className="rounded border border-brand/30 bg-brand-soft px-1.5 py-px text-[10px] text-brand-text">
                针对圈选区域
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={ACTION_PROMPT_HINT[action]}
              className="w-full resize-none rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand/50"
              rows={3}
            />
            {action === "inpaint" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button
                    key={c.text}
                    onClick={() => appendChip(c.text)}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-3 transition-colors hover:border-brand hover:text-ink"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-glass px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-3">
          <button
            onClick={onClose}
            className="rounded-[12px] border border-line bg-surface px-4 py-2 text-[13px] text-ink-2 transition-colors hover:text-ink"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-1.5 rounded-[12px] bg-accent-gradient px-4 py-2 text-[13px] font-semibold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting
              ? "提交中…"
              : action === "remove"
                ? "开始擦除"
                : action === "enhance"
                  ? "开始变清晰"
                  : "开始重绘"}
          </button>
        </div>
      </div>
    </div>
  );
}
