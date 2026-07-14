"use client";

import { type TemplatePreset } from "@/types/workbench";
import { cn } from "@/lib/utils";

type PreviewKind = "listing" | "whitebg" | "scene" | "poster" | "video" | "process";

const PREVIEW_SRC: Record<PreviewKind, string> = {
  listing: "/template-previews/thumbs/listing.webp",
  whitebg: "/template-previews/thumbs/whitebg.webp",
  scene: "/template-previews/thumbs/scene.webp",
  poster: "/template-previews/thumbs/poster.webp",
  video: "/template-previews/thumbs/video.webp",
  process: "/template-previews/thumbs/process.webp",
};

const PREVIEW_WIDTH = 960;
const PREVIEW_HEIGHT = 1280;

function getPreviewKind(preset: TemplatePreset): PreviewKind {
  if (preset.category === "whitebg") return "whitebg";
  if (preset.category === "scene") return "scene";
  if (preset.category === "poster") return "poster";
  if (preset.category === "video") return "video";
  if (preset.category === "image-process") return "process";
  return "listing";
}

export function TemplateReferencePreview({
  preset,
  className,
  loading = "lazy",
}: {
  preset: TemplatePreset;
  className?: string;
  loading?: "eager" | "lazy";
}) {
  const kind = getPreviewKind(preset);
  const src = PREVIEW_SRC[kind];

  return (
    <div className={cn("h-full w-full overflow-hidden bg-[#F7FAFB]", className)} aria-label={`${preset.name}参考图`}>
      {/* 资源已预生成 960px WebP，直接使用原生 lazy loading，避免运行时重复转码。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${preset.name}参考图`}
        width={PREVIEW_WIDTH}
        height={PREVIEW_HEIGHT}
        loading={loading}
        decoding="async"
        fetchPriority={loading === "eager" ? "high" : "low"}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}
