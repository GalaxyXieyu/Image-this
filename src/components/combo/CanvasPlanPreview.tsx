"use client";

import { useMemo } from "react";
import type { InputAssetRef } from "@/types/workbench";
import type { WatermarkCanvasPlan } from "@/components/combo/types";
import { FieldLabel } from "@/components/combo/form-controls";

export function CanvasPlanPreview({
  title,
  emptyHint,
  productImage,
  canvasPlan,
  badge,
}: {
  title: string;
  emptyHint: string;
  productImage?: InputAssetRef;
  canvasPlan?: WatermarkCanvasPlan;
  badge?: string;
}) {
  const aspectStyle = useMemo(() => {
    const ratio = canvasPlan?.aspect || 1;
    return {
      aspectRatio: ratio.toString(),
      maxWidth: ratio > 1 ? "100%" : `min(100%, ${52 * ratio}vh)`,
    };
  }, [canvasPlan?.aspect]);

  return (
    <section className="flex flex-col gap-2">
      <FieldLabel>
        <div className="flex items-center justify-between gap-2">
          <span>{title}</span>
          {productImage && canvasPlan ? (
            <span className="text-[11px] font-normal text-ink-3">
              预计 {Math.round(canvasPlan.canvasWidth)} × {Math.round(canvasPlan.canvasHeight)}
            </span>
          ) : null}
        </div>
      </FieldLabel>
      <div
        className="relative mx-auto max-h-[52vh] min-h-40 w-full overflow-hidden rounded-[14px] border border-line bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_48%,#dbeafe_100%)]"
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
            {canvasPlan && (canvasPlan.sourceRect.width < 0.999 || canvasPlan.sourceRect.height < 0.999) && (
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
            {badge ? (
              <div className="absolute bottom-2 left-2 rounded-full bg-ink/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                {badge}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center px-4 text-center text-[12px] text-ink-3">
            {emptyHint}
          </div>
        )}
      </div>
      {productImage && !canvasPlan ? (
        <p className="text-[11px] text-ink-3">正在读取商品图尺寸，预览即将出现…</p>
      ) : null}
    </section>
  );
}

