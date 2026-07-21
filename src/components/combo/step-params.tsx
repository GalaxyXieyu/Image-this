"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PromptTemplateSelector } from "@/components/workbench/PromptTemplateSelector";
import { useUpload } from "@/lib/use-upload";
import { cn } from "@/lib/utils";
import type { InputAssetRef } from "@/types/workbench";
import type {
  BackgroundParams,
  OutpaintParams,
  SceneParams,
  UpscaleParams,
  WatermarkCanvasPlan,
  WatermarkParams,
  WatermarkPresetPosition,
} from "@/components/combo/types";
import { FieldLabel, SliderRow, ChipGroup } from "@/components/combo/form-controls";
import { CanvasPlanPreview } from "@/components/combo/CanvasPlanPreview";
import { clamp } from "@/components/combo/canvas-plan";

export function buildBackgroundPrompt(params: BackgroundParams) {
  const bgTypeLabel: Record<string, string> = {
    studio: "纯色棚拍背景，专业柔光",
    scene: "参考图风格的电商场景背景",
    white: "干净白底背景",
    blur: "虚化景深背景",
  };

  return [
    "保持商品主体完全不变，只替换背景",
    bgTypeLabel[params.bgType] ?? "自然融合的电商背景",
    `边缘羽化 ${params.featherEdge}px`,
    params.keepShadow ? "保留自然接触阴影" : "弱化原始阴影",
  ].join("，");
}

export function SceneStepParams({
  params,
  onChange,
}: {
  params: SceneParams;
  onChange: (_patch: Partial<SceneParams>) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>场景风格</FieldLabel>
        <ChipGroup
          value={params.sceneStyle}
          onChange={(v) => onChange({ sceneStyle: v })}
          options={[
            { id: "natural", label: "自然光" },
            { id: "studio", label: "棚拍" },
            { id: "lifestyle", label: "生活场景" },
            { id: "minimal", label: "极简" },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>候选数量</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ candidateCount: n })}
              className={cn(
	                "h-11 w-11 rounded-[12px] border text-[12px] font-semibold transition-colors",
                params.candidateCount === n
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>场景提示词</FieldLabel>
        <PromptTemplateSelector
          category="ONE_CLICK"
          value={params.customPrompt ?? ""}
          onChange={(customPrompt) => onChange({ customPrompt })}
          placeholder="描述商品要生成的背景、光线、构图和营销氛围。"
        />
      </section>
    </>
  );
}


export function BackgroundStepParams({
  params,
  onChange,
}: {
  params: BackgroundParams;
  onChange: (_patch: Partial<BackgroundParams>) => void;
}) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useUpload();

  const handleReferenceUpload = async (file?: File) => {
    if (!file) return;
    try {
      const result = await upload({ reference: file });
      if (result.referenceAsset) {
        onChange({ referenceAsset: result.referenceAsset });
      }
    } catch {
      // useUpload exposes the message through error; keep this panel compact.
    }
  };

  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>参考背景</FieldLabel>
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleReferenceUpload(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {params.referenceAsset ? (
          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="relative h-32 bg-surface-muted">
              <Image
                src={params.referenceAsset.clientUrl}
                alt="参考背景预览"
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                unoptimized
                className="h-full w-full object-cover"
              />
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur"
                  aria-label="替换参考背景"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ referenceAsset: undefined })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-danger shadow-soft backdrop-blur"
                  aria-label="移除参考背景"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate text-[12px] font-semibold text-ink">
                {params.referenceAsset.originalFilename}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-brand-text">已添加</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => referenceInputRef.current?.click()}
            disabled={uploading}
            className="flex min-h-24 items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong bg-surface text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "上传中..." : "上传参考图"}
          </button>
        )}
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>背景类型</FieldLabel>
        <ChipGroup
          value={params.bgType}
          onChange={(v) => onChange({ bgType: v })}
          options={[
            { id: "studio", label: "纯色棚拍" },
            { id: "scene", label: "AI 场景" },
            { id: "white", label: "白底" },
            { id: "blur", label: "虚化" },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>换背景提示词（可选）</FieldLabel>
        <PromptTemplateSelector
          category="BACKGROUND_REPLACE"
          value={params.customPrompt ?? ""}
          onChange={(customPrompt) => onChange({ customPrompt })}
          placeholder={buildBackgroundPrompt(params)}
        />
        <p className="text-[11px] text-ink-3">留空则按上面的背景类型/羽化等自动生成提示词。</p>
      </section>
      <SliderRow
        label="边缘羽化"
        value={params.featherEdge}
        suffix=" px"
        min={0}
        max={24}
        onChange={(featherEdge) => onChange({ featherEdge })}
      />
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer text-data text-ink">保留主体阴影</Label>
        <Switch
          checked={params.keepShadow}
          onCheckedChange={(keepShadow) => onChange({ keepShadow })}
        />
      </div>
    </>
  );
}


export function UpscaleStepParams({
  params,
  onChange,
  productImage,
  canvasPlan,
}: {
  params: UpscaleParams;
  onChange: (_patch: Partial<UpscaleParams>) => void;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
}) {
  const [inputValue, setInputValue] = useState(String(params.factor));

  useEffect(() => {
    setInputValue(String(params.factor));
  }, [params.factor]);

  const handleInputBlur = () => {
    const raw = inputValue.trim();
    const num = Number(raw);
    const v = Number.isNaN(num) ? params.factor : Math.min(4, Math.max(1.1, num));
    const rounded = Math.round(v * 100) / 100;
    onChange({ factor: rounded });
    setInputValue(String(rounded));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <>
      <CanvasPlanPreview
        title="放大预览"
        emptyHint="先上传商品图，可实时查看放大后的预计画布尺寸"
        productImage={productImage}
        canvasPlan={canvasPlan}
        badge={`${Number(params.factor ?? 1).toFixed(2).replace(/\.00$/, "")}×`}
      />
      <SliderRow
        label="放大倍数"
        value={params.factor}
        suffix="×"
        min={1.1}
        max={4}
        step={0.1}
        onChange={(v) => {
          const rounded = Math.round(v * 100) / 100;
          onChange({ factor: rounded });
          setInputValue(String(rounded));
        }}
      />
      <div className="space-y-2">
        <Input
          type="number"
          step="0.01"
          min={1.1}
          max={4}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInputBlur();
            }
          }}
          placeholder="输入倍数"
          className="h-8 text-center text-[13px]"
        />
        <div className="flex gap-2">
          {[1.2, 1.5, 2, 3, 4].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => {
                onChange({ factor: f });
                setInputValue(String(f));
              }}
              className={cn(
                "min-h-8 flex-1 rounded-[9px] border text-[12px] font-semibold transition-colors",
                params.factor === f ? "border-brand bg-brand-soft text-brand-text" : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {f}×
            </button>
          ))}
        </div>
      </div>
      <SliderRow
        label="降噪强度"
        value={params.denoise}
        suffix="%"
        min={0}
        max={100}
        onChange={(denoise) => onChange({ denoise })}
      />
    </>
  );
}


export function WatermarkStepParams({
  params,
  aspectRatio,
  onChange,
  productImage,
  canvasPlan,
}: {
  params: WatermarkParams;
  aspectRatio: string;
  onChange: (_patch: Partial<WatermarkParams>) => void;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
}) {
  const { upload, uploading } = useUpload();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const wmType = params.type ?? "text";

  const handleLogoPick = async (file?: File) => {
    if (!file) return;
    try {
      const res = await upload({ watermarkLogo: file });
      if (res.watermarkLogoAsset) onChange({ logoAsset: res.watermarkLogoAsset });
    } catch {
      // useUpload 通过 error 暴露失败，这里保持编辑区紧凑
    }
  };

  return (
    <>
      <WatermarkPositionPreview
        params={params}
        aspectRatio={aspectRatio}
        onChange={onChange}
        productImage={productImage}
        canvasPlan={canvasPlan}
      />
      <section className="flex flex-col gap-2">
        <FieldLabel>水印类型</FieldLabel>
        <ChipGroup
          value={wmType}
          onChange={(v) => onChange({ type: v as "text" | "logo" })}
          options={[
            { id: "text", label: "文字" },
            { id: "logo", label: "图片 / Logo" },
          ]}
          cols={2}
        />
      </section>
      {wmType === "logo" ? (
        <section className="flex flex-col gap-2">
          <FieldLabel>水印 Logo（建议 PNG 透明底）</FieldLabel>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/*"
            className="hidden"
            onChange={(e) => handleLogoPick(e.target.files?.[0] ?? undefined)}
          />
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploading}
            className="flex min-h-10 items-center justify-center gap-2 rounded-[11px] border border-dashed border-line-strong bg-surface px-3 text-[13px] text-ink-2 transition-colors hover:border-brand disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {params.logoAsset ? "更换 Logo" : "上传 Logo"}
          </button>
          {params.logoAsset && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={params.logoAsset.clientUrl}
              alt="Logo 预览"
              className="h-14 w-14 rounded-[10px] border border-line bg-surface-muted object-contain p-1"
            />
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-2">
          <FieldLabel>水印内容</FieldLabel>
          <Input
            value={params.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="@品牌名"
            className="h-9 rounded-[11px]"
          />
        </section>
      )}
      <section className="flex flex-col gap-2">
        <FieldLabel>水印位置</FieldLabel>
        <ChipGroup
          value={params.position}
          onChange={(v) =>
            onChange({
              position: v as WatermarkParams["position"],
              customPosition: v === "custom" ? params.customPosition : undefined,
            })
          }
          options={[
            { id: "top-left", label: "左上" },
            { id: "top-right", label: "右上" },
            { id: "bottom-left", label: "左下" },
            { id: "bottom-right", label: "右下" },
            { id: "center", label: "居中" },
            { id: "custom", label: "自定义" },
          ]}
          cols={3}
        />
      </section>
      <SliderRow
        label="水印大小"
        value={Math.round((params.sizeRatio ?? 0.2) * 100)}
        suffix="%"
        min={5}
        max={60}
        onChange={(v) => onChange({ sizeRatio: v / 100 })}
      />
      <SliderRow
        label="不透明度"
        value={params.opacity}
        suffix="%"
        min={10}
        max={100}
        onChange={(opacity) => onChange({ opacity })}
      />
    </>
  );
}


export function WatermarkPositionPreview({
  params,
  aspectRatio,
  onChange,
  productImage,
  canvasPlan,
}: {
  params: WatermarkParams;
  aspectRatio: string;
  onChange: (_patch: Partial<WatermarkParams>) => void;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLSpanElement>(null);
  const previewText = params.content.trim() || "@品牌名";
  // 预览与后端合成同口径：水印宽度 = 图宽 × sizeRatio（见 lib/watermark.ts）
  const sizeRatio = params.sizeRatio && params.sizeRatio > 0 ? params.sizeRatio : 0.2;
  const [previewWidth, setPreviewWidth] = useState(0);
  const [resizeDragStart, setResizeDragStart] = useState({ x: 0, ratio: 0 });
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setPreviewWidth(el.clientWidth));
    observer.observe(el);
    setPreviewWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);
  const aspectStyle = useMemo(() => {
    const ratio = canvasPlan?.aspect || (() => {
      const [rawWidth, rawHeight] = aspectRatio.split(":").map(Number);
      return (Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1) /
             (Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1);
    })();
    return {
      aspectRatio: ratio.toString(),
      // 高度上限 52vh：竖比时按 52vh × (w/h) 收窄宽度，保证渲染比例不被高度截断
      maxWidth: ratio > 1 ? "100%" : `min(100%, ${52 * ratio}vh)`,
    };
  }, [aspectRatio, canvasPlan?.aspect]);

  const getPresetPosition = useCallback((
    position: WatermarkPresetPosition | "custom",
    editorWidth: number,
    editorHeight: number,
    markWidth: number,
    markHeight: number
  ) => {
    const padding = 12;
    switch (position) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: editorWidth - markWidth - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: editorHeight - markHeight - padding };
      case "center":
        return {
          x: (editorWidth - markWidth) / 2,
          y: (editorHeight - markHeight) / 2,
        };
      case "bottom-right":
      case "custom":
      default:
        return {
          x: editorWidth - markWidth - padding,
          y: editorHeight - markHeight - padding,
        };
    }
  }, []);

  const updateWatermarkElement = useCallback(() => {
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    if (!preview || !watermark) return;

    const editorWidth = preview.clientWidth;
    const editorHeight = preview.clientHeight;
    const markWidth = watermark.offsetWidth;
    const markHeight = watermark.offsetHeight;
    const raw =
      params.position === "custom" && params.customPosition
        ? {
            x: (params.customPosition.x / params.customPosition.editorWidth) * editorWidth,
            y: (params.customPosition.y / params.customPosition.editorHeight) * editorHeight,
          }
        : getPresetPosition(params.position, editorWidth, editorHeight, markWidth, markHeight);
    // 自定义坐标允许为负数或超过画布边界；预览容器与后端分别负责可视裁切和像素裁切。
    watermark.style.left = `${raw.x}px`;
    watermark.style.top = `${raw.y}px`;
  }, [getPresetPosition, params.customPosition, params.position]);

  useEffect(() => {
    updateWatermarkElement();
  }, [updateWatermarkElement, previewText, aspectRatio, canvasPlan?.aspect, sizeRatio, previewWidth]);

  const updateCustomPosition = (
    event: PointerEvent<HTMLSpanElement>,
    dragOffset: { x: number; y: number }
  ) => {
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    if (!preview || !watermark) return;

    const rect = preview.getBoundingClientRect();
    const editorWidth = preview.clientWidth;
    const editorHeight = preview.clientHeight;
    const x = event.clientX - rect.left - preview.clientLeft - dragOffset.x;
    const y = event.clientY - rect.top - preview.clientTop - dragOffset.y;

    watermark.style.left = `${x}px`;
    watermark.style.top = `${y}px`;
    onChange({
      position: "custom",
      customPosition: {
        x: Math.round(x),
        y: Math.round(y),
        editorWidth,
        editorHeight,
      },
    });
  };

  const handlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    const watermark = watermarkRef.current;
    if (!watermark) return;

    const watermarkRect = watermark.getBoundingClientRect();
    const dragOffset = {
      x: event.clientX - watermarkRect.left,
      y: event.clientY - watermarkRect.top,
    };
    dragOffsetRef.current = dragOffset;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateCustomPosition(event, dragOffset);
  };

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const dragOffset = dragOffsetRef.current;
    if (event.buttons !== 1 || !dragOffset) return;
    updateCustomPosition(event, dragOffset);
  };

  const handlePointerEnd = () => {
    dragOffsetRef.current = null;
  };

  const handleResizeHandlePointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation(); // 不触发父级拖拽定位
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizeDragStart({ x: event.clientX, ratio: sizeRatio });
  };

  const handleResizeHandlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.buttons !== 1 || resizeDragStart.ratio === 0) return;
    const preview = previewRef.current;
    if (!preview) return;
    const rect = preview.getBoundingClientRect();
    const delta = (event.clientX - resizeDragStart.x) / rect.width;
    const next = clamp(resizeDragStart.ratio + delta, 0.05, 0.6);
    onChange({ sizeRatio: next });
  };

  const handleResizeHandlePointerUp = () => {
    setResizeDragStart({ x: 0, ratio: 0 });
  };

  return (
    <section className="flex flex-col gap-2">
      <FieldLabel>
        <div className="flex items-center justify-between">
          <span>位置预览</span>
          {productImage && (
            <span className="text-[11px] font-normal text-ink-3">
              {canvasPlan
                ? `预计最终画布 ${Math.round(canvasPlan.canvasWidth)} × ${Math.round(canvasPlan.canvasHeight)}`
                : "预览为近似效果"}
            </span>
          )}
        </div>
      </FieldLabel>
      <div
        ref={previewRef}
        className="relative mx-auto max-h-[52vh] min-h-40 w-full touch-none overflow-hidden rounded-[14px] border border-line bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_48%,#dbeafe_100%)]"
        style={aspectStyle}
      >
        {productImage ? (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#eef2f7_0%,#dbe4ef_100%)]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImage.clientUrl}
              alt=""
              className="absolute object-contain"
              style={canvasPlan ? {
                left: `${canvasPlan.sourceRect.x * 100}%`,
                top: `${canvasPlan.sourceRect.y * 100}%`,
                width: `${canvasPlan.sourceRect.width * 100}%`,
                height: `${canvasPlan.sourceRect.height * 100}%`,
              } : { inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
              draggable={false}
            />
            {canvasPlan && (canvasPlan.sourceRect.width < 1 || canvasPlan.sourceRect.height < 1) && (
              <div
                className="pointer-events-none absolute border border-dashed border-brand/70"
                style={{
                  left: `${canvasPlan.sourceRect.x * 100}%`,
                  top: `${canvasPlan.sourceRect.y * 100}%`,
                  width: `${canvasPlan.sourceRect.width * 100}%`,
                  height: `${canvasPlan.sourceRect.height * 100}%`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-black/20" />
          </>
        ) : (
          <>
            <div className="absolute inset-x-8 bottom-8 h-[44%] rounded-t-[40%] bg-white/70 shadow-soft" />
            <div className="absolute left-1/2 top-[44%] h-16 w-16 -translate-x-1/2 rounded-[18px] bg-surface shadow-float ring-1 ring-line" />
            <div className="absolute left-1/2 top-[47%] h-8 w-20 -translate-x-1/2 rounded-full bg-brand-soft/80" />
          </>
        )}
        <span
          ref={watermarkRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={cn(
            "absolute max-w-[72%] cursor-grab select-none shadow-soft active:cursor-grabbing",
            params.type === "logo" && params.logoAsset
              ? ""
              : "whitespace-nowrap rounded-full bg-ink px-[0.6em] py-[0.25em] font-semibold text-white"
          )}
          style={{
            opacity: Math.max(0.1, params.opacity / 100),
            ...(params.type === "logo" && params.logoAsset
              ? { width: `${sizeRatio * 100}%` }
              : { fontSize: `${Math.max(8, previewWidth * sizeRatio * 0.5)}px` }),
          }}
        >
          {params.type === "logo" && params.logoAsset ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={params.logoAsset.clientUrl}
              alt=""
              className="h-auto w-full object-contain"
              draggable={false}
              onLoad={updateWatermarkElement}
            />
          ) : (
            previewText
          )}
          {/* 右下角缩放手柄 */}
          <span
            onPointerDown={handleResizeHandlePointerDown}
            onPointerMove={handleResizeHandlePointerMove}
            onPointerUp={handleResizeHandlePointerUp}
            onPointerCancel={handleResizeHandlePointerUp}
            className="absolute -bottom-1.5 -right-1.5 h-6 w-6 touch-none cursor-se-resize rounded-full bg-brand shadow-soft hover:bg-brand-soft active:bg-brand"
          />
        </span>
      </div>
    </section>
  );
}


export function OutpaintStepParams({
  params,
  onChange,
  productImage,
  canvasPlan,
}: {
  params: OutpaintParams;
  onChange: (_patch: Partial<OutpaintParams>) => void;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
}) {
  const directionLabel =
    params.direction === "horizontal" ? "左右" : params.direction === "vertical" ? "上下" : "四周";

  return (
    <>
      <CanvasPlanPreview
        title="扩图预览"
        emptyHint="先上传商品图，可实时查看扩展后的最终画布与原图位置"
        productImage={productImage}
        canvasPlan={canvasPlan}
        badge={`${directionLabel} · ${params.ratio ?? 25}%`}
      />
      <section className="flex flex-col gap-2">
        <FieldLabel>扩展方向</FieldLabel>
        <ChipGroup
          value={params.direction}
          onChange={(v) => onChange({ direction: v })}
          options={[
            { id: "all", label: "四周扩展" },
            { id: "horizontal", label: "左右" },
            { id: "vertical", label: "上下" },
          ]}
          cols={3}
        />
      </section>
      <SliderRow
        label="扩展比例"
        value={params.ratio}
        suffix="%"
        min={5}
        max={40}
        onChange={(ratio) => onChange({ ratio })}
      />
      <p className="text-[11px] text-ink-3">
        虚线框内是原图位置，外围区域为扩图补充；这是预估画布，不是真实 AI 扩图结果。
      </p>
    </>
  );
}

/* ─── Collapsed sidebar rail ─────────────────────────────────────── */

