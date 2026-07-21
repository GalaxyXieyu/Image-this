"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { WatermarkFreePosition, WatermarkParams, WatermarkPreset } from "@/types/workbench";

export const WATERMARK_POSITION_OPTIONS: Array<{ id: WatermarkPreset; label: string }> = [
  { id: "bottom-right", label: "右下" },
  { id: "bottom-left", label: "左下" },
  { id: "top-right", label: "右上" },
  { id: "top-left", label: "左上" },
  { id: "center", label: "居中" },
];

export const WATERMARK_POSITION_LABELS: Record<WatermarkPreset, string> = WATERMARK_POSITION_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.label }),
  {} as Record<WatermarkPreset, string>
);

// 预设 → 编辑器显示位置比例（仅用于把 marker 摆到对应角落，拖动后转为自由坐标）
const PRESET_RATIO: Record<WatermarkPreset, { l: number; t: number }> = {
  "top-left": { l: 0.04, t: 0.04 },
  "top-right": { l: 0.72, t: 0.04 },
  "bottom-left": { l: 0.04, t: 0.78 },
  "bottom-right": { l: 0.72, t: 0.78 },
  center: { l: 0.38, t: 0.4 },
};

// 水印拖拽定位编辑器：源图上叠一个可拖拽的水印标记，输出 {x,y,width,editorWidth,editorHeight}
export function WatermarkDragEditor({
  imageUrl,
  logoUrl,
  text,
  opacity,
  position,
  onChange,
}: {
  imageUrl: string;
  logoUrl?: string;
  text: string;
  opacity: number;
  position: WatermarkParams["watermarkPosition"];
  onChange: (pos: WatermarkFreePosition) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const free = typeof position === "object" ? position : null;
  const preset = typeof position === "string" ? position : null;
  const widthRatio = free?.width && free?.editorWidth ? free.width / free.editorWidth : 0.25;
  const leftRatio = free && free.editorWidth
    ? free.x / free.editorWidth
    : preset
      ? PRESET_RATIO[preset].l
      : 0.5;
  const topRatio = free && free.editorHeight
    ? free.y / free.editorHeight
    : preset
      ? PRESET_RATIO[preset].t
      : 0.4;

  const emitAt = (clientX: number, clientY: number, wRatio = widthRatio) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const markerW = wRatio * rect.width;
    const markerH = markerW;
    let x = clientX - rect.left - markerW / 2;
    let y = clientY - rect.top - markerH / 2;
    x = Math.max(0, Math.min(rect.width - markerW, x));
    y = Math.max(0, Math.min(rect.height - markerH, y));
    onChange({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(markerW),
      editorWidth: Math.round(rect.width),
      editorHeight: Math.round(rect.height),
    });
  };

  const setWidthRatio = (wRatio: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const markerW = wRatio * rect.width;
    // 保持当前中心
    const cx = leftRatio * rect.width + (widthRatio * rect.width) / 2;
    const cy = topRatio * rect.height + (widthRatio * rect.width) / 2;
    let x = cx - markerW / 2;
    let y = cy - markerW / 2;
    x = Math.max(0, Math.min(rect.width - markerW, x));
    y = Math.max(0, Math.min(rect.height - markerW, y));
    onChange({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(markerW),
      editorWidth: Math.round(rect.width),
      editorHeight: Math.round(rect.height),
    });
  };

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative w-full touch-none select-none overflow-hidden rounded-lg border border-border bg-muted"
        style={{ aspectRatio: natural ? `${natural.w} / ${natural.h}` : "4 / 3" }}
        onPointerDown={(e) => {
          setDragging(true);
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          emitAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) emitAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="预览"
          className="pointer-events-none h-full w-full object-cover"
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth || 4, h: e.currentTarget.naturalHeight || 3 })}
        />
        <div
          className="pointer-events-none absolute flex items-center justify-center"
          style={{ left: `${leftRatio * 100}%`, top: `${topRatio * 100}%`, width: `${widthRatio * 100}%`, opacity }}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="水印" className="w-full object-contain" draggable={false} />
          ) : (
            <span className="whitespace-nowrap rounded bg-black/55 px-2 py-1 text-[12px] font-semibold text-white">
              {text || "水印"}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-caption text-muted-foreground">水印大小：{Math.round(widthRatio * 100)}%</Label>
        <Slider value={[Math.round(widthRatio * 100)]} min={8} max={60} step={2} onValueChange={([v]) => setWidthRatio(v / 100)} />
      </div>
      <p className="text-caption text-muted-foreground">在图上拖动水印到任意位置；也可点下方预设快速定位。</p>
    </div>
  );
}

/** 移动端 BottomSheetSelect 统一触发器，复用设计 token，桌面端不使用。 */
