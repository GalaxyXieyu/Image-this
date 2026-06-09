"use client";

import { type TemplatePreset } from "@/types/workbench";
import { cn } from "@/lib/utils";

type PreviewKind = "listing" | "whitebg" | "scene" | "poster" | "video" | "process";

const PREVIEW_SRC: Record<PreviewKind, string> = {
  listing: "/template-previews/listing.jpg",
  whitebg: "/template-previews/whitebg.jpg",
  scene: "/template-previews/scene.jpg",
  poster: "/template-previews/poster.jpg",
  video: "/template-previews/video.jpg",
  process: "/template-previews/process.jpg",
};

function getPreviewKind(preset: TemplatePreset): PreviewKind {
  if (preset.category === "whitebg") return "whitebg";
  if (preset.category === "scene") return "scene";
  if (preset.category === "poster") return "poster";
  if (preset.category === "video") return "video";
  if (preset.category === "image-process") return "process";
  return "listing";
}

export function TemplateReferencePreview({ preset, className }: { preset: TemplatePreset; className?: string }) {
  const kind = getPreviewKind(preset);
  const src = PREVIEW_SRC[kind];

  return (
    <div className={cn("h-full w-full overflow-hidden bg-[#F7FAFB]", className)} aria-label={`${preset.name}参考图`}>
      <img
        src={src}
        alt={`${preset.name}参考图`}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </div>
  );
}
