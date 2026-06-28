"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Sparkles, Droplets, ZoomIn, Expand, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { sceneStyleTemplates } from "@/lib/scene-presets";
import { cn } from "@/lib/utils";

const TOOLS = [
  { label: "AI 换背景", desc: "电商场景 / 白底", tool: "background_replace", icon: Sparkles },
  { label: "加水印", desc: "文字 / Logo 水印", tool: "watermark", icon: Droplets },
  { label: "高清放大", desc: "提升清晰度", tool: "upscale", icon: ZoomIn },
  { label: "智能扩图", desc: "扩展画布", tool: "outpaint", icon: Expand },
];

const SCENE_PREVIEW_COUNT = 9;
const WORKFLOW_PREVIEW_COUNT = 6;

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  steps: { id: string }[];
  isSystem?: boolean;
}

function SceneThumb({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return <div className="h-full w-full bg-surface-muted" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setError(true)} />;
}

function SectionHeader({ title, moreHref }: { title: string; moreHref: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-3">{title}</h2>
      <Link href={moreHref} className="flex items-center gap-0.5 text-[12px] font-semibold text-brand-text">
        查看更多
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

const WORKFLOW_PLACEHOLDER = "/scene-presets/scene-minimal.webp";

export default function WorkbenchHubPage() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [latestImage, setLatestImage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ templates: WorkflowTemplate[] }>("/api/workflow-templates")
      .then((res) => setTemplates(res.templates || []))
      .catch(() => setTemplates([]));
    // 最新生成图：作为工作流卡片默认封面
    apiGet<{ images: Array<{ processedUrl?: string | null; thumbnailUrl?: string | null }> }>(
      "/api/images?limit=1&status=COMPLETED&includeFullSize=true"
    )
      .then((res) => {
        const first = res.images?.[0];
        setLatestImage(first?.processedUrl || first?.thumbnailUrl || null);
      })
      .catch(() => setLatestImage(null));
  }, []);

  const workflowCover = latestImage || WORKFLOW_PLACEHOLDER;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
        {/* 场景功能：直接铺场景风格卡片，点击进第二步 */}
        <section className="mb-6">
          <SectionHeader title="场景生成" moreHref="/workspace/scene" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
            {sceneStyleTemplates.slice(0, SCENE_PREVIEW_COUNT).map((s) => (
              <Link
                key={s.id}
                href={`/workspace/scene?sceneStyle=${s.id}`}
                className="glass-panel w-40 shrink-0 overflow-hidden rounded-[16px] shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                  <SceneThumb src={s.image} alt={s.name} />
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{s.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-3">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 工作流：铺工作流模板卡片，点击进参数步 */}
        <section className="mb-6">
          <SectionHeader title="工作流" moreHref="/combo" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
            {(templates.length > 0
              ? templates.slice(0, WORKFLOW_PREVIEW_COUNT)
              : [{ id: "__empty", name: "组合工作流", description: "多步骤链式流水线，一键批量处理", steps: [] }]
            ).map((t) => (
              <Link
                key={t.id}
                href={t.id === "__empty" ? "/combo" : `/combo?template=${t.id}&stage=params`}
                className="glass-panel w-40 shrink-0 overflow-hidden rounded-[16px] shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <div className="relative aspect-square overflow-hidden bg-surface-muted">
                  <SceneThumb src={workflowCover} alt={t.name} />
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    <Layers className="h-3 w-3" />
                    {t.steps.length > 0 ? `${t.steps.length} 步` : "工作流"}
                  </span>
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-[13px] font-semibold text-ink">{t.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-3">
                    {t.description || "多步骤链式流水线"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 小工具（横向滑动） */}
        <section>
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">小工具</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.tool}
                  href={`/tools?tool=${t.tool}`}
                  className={cn(
                    "glass-panel flex w-32 shrink-0 flex-col gap-2 rounded-[18px] p-3.5 shadow-soft transition-transform hover:-translate-y-0.5 md:w-auto"
                  )}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{t.label}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">{t.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
