"use client";

import { Download, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ResultImage } from "@/components/results/results-helpers";
import { downloadFile } from "@/components/results/results-helpers";

export function ResultsLightbox({
  item,
  url,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  item: ResultImage;
  url: string;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
          {/* 灯箱需要原始分辨率，不走 Next Image 的预设尺寸。 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={item.name}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="关闭"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          {index > 0 && (
            <button
              type="button"
              aria-label="上一张"
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:left-6"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {index < total - 1 && (
            <button
              type="button"
              aria-label="下一张"
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:right-6"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur-sm">
            {index + 1} / {total}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              downloadFile(url, item.name);
            }}
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-white"
          >
            <Download className="h-4 w-4" />
            下载图片
          </button>
    </div>
  );
}
