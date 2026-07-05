"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers, Sparkles, Droplets, ZoomIn, Expand, ChevronRight } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const TOOLS = [
  { label: "AI 换背景", desc: "场景 / 白底背景模板", href: "/workspace/scene", icon: Sparkles },
  { label: "加水印", desc: "文字 / Logo 水印", href: "/tools?tool=watermark", icon: Droplets },
  { label: "高清放大", desc: "提升清晰度", href: "/tools?tool=upscale", icon: ZoomIn },
  { label: "智能扩图", desc: "扩展画布", href: "/tools?tool=outpaint", icon: Expand },
];

// 场景 = 具体产出（要什么给什么）。首发：AI 商品套图
const SCENES = [
  {
    label: "AI 商品套图",
    desc: "一张商品图 → 主图 / 场景 / 模特 / 细节 / 卖点 全套",
    href: "/workspace/listing-set",
  },
];

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
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [recentImages, setRecentImages] = useState<Array<{ id: string; url: string }>>([]);

  useEffect(() => {
    apiGet<{ templates: WorkflowTemplate[] }>("/api/workflow-templates")
      .then((res) => setTemplates(res.templates || []))
      .catch(() => setTemplates([]));
    // 最近生成图：套图/场景来源的图作为场景封面；「最近生成」网格用全部
    apiGet<{ images: Array<{ id: string; processedUrl?: string | null; thumbnailUrl?: string | null; metadata?: string | null }> }>(
      "/api/images?limit=12&status=COMPLETED&includeFullSize=true"
    )
      .then((res) => {
        const imgs = res.images || [];
        const url = (i: { processedUrl?: string | null; thumbnailUrl?: string | null }) => i.thumbnailUrl || i.processedUrl || "";
        // 场景封面只取「归属场景/套图来源」的图，避免拿到工具类产物
        const isScene = (m?: string | null) => {
          if (!m) return false;
          try {
            const o = JSON.parse(m) as { operation?: string; workflowType?: string };
            return o.operation === "listing_set" || o.workflowType === "scene_generation" || o.workflowType === "listing_set";
          } catch {
            return false;
          }
        };
        const scene = imgs.find((i) => isScene(i.metadata)) || imgs[0];
        setSceneImage(scene ? url(scene) : null);
        setRecentImages(imgs.map((i) => ({ id: i.id, url: url(i) })).filter((i) => i.url));
      })
      .catch(() => {
        setSceneImage(null);
        setRecentImages([]);
      });
  }, []);

  // 工作流封面用模板预览图（不复用用户最近产物），与场景封面区分开
  const workflowCover = WORKFLOW_PLACEHOLDER;
  const sceneCover = sceneImage || "/scene-presets/scene-lifestyle.webp";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8 lg:max-w-[1200px]">
        {/* 场景：具体产出（要什么给什么），首发 AI 商品套图 */}
        <section className="mb-6">
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">场景</h2>
          {/* 移动 / 中屏：满宽 16:9 hero 卡 */}
          <div className="flex flex-col gap-3 lg:hidden">
            {SCENES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="glass-panel block overflow-hidden rounded-[18px] shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted">
                  <SceneThumb src={sceneCover} alt={s.label} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    <p className="text-[16px] font-bold text-white">{s.label}</p>
                    <p className="mt-0.5 text-[12px] text-white/85">{s.desc}</p>
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                    一键成套
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {/* 桌面：全宽 banner，铺满整行 */}
          <div className="hidden flex-col gap-4 lg:flex">
            {SCENES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="glass-panel group block overflow-hidden rounded-[22px] shadow-soft transition-transform hover:-translate-y-0.5"
              >
                <div className="relative aspect-[24/7] overflow-hidden bg-surface-muted">
                  <SceneThumb src={sceneCover} alt={s.label} />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
                  <div className="absolute inset-y-0 left-0 flex max-w-[60%] flex-col justify-center p-7">
                    <span className="mb-2 inline-flex w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      一键成套
                    </span>
                    <p className="text-[22px] font-bold text-white">{s.label}</p>
                    <p className="mt-1 text-[13px] text-white/85">{s.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 工作流：铺工作流模板卡片，点击进参数步 */}
        <section className="mb-6">
          <SectionHeader title="工作流" moreHref="/combo" />
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible xl:grid-cols-4">
            {(templates.length > 0
              ? templates.slice(0, WORKFLOW_PREVIEW_COUNT)
              : [{ id: "__empty", name: "组合工作流", description: "多步骤链式流水线，一键批量处理", steps: [] }]
            ).map((t) => (
              <Link
                key={t.id}
                href={t.id === "__empty" ? "/combo" : `/combo?template=${t.id}&stage=params`}
                className="glass-panel w-40 shrink-0 overflow-hidden rounded-[16px] shadow-soft transition-transform hover:-translate-y-0.5 lg:w-auto"
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

        {/* 工具：原子操作 */}
        <section>
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">工具</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.label}
                  href={t.href}
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

        {/* 最近生成：填充仪表盘 + 快速回到图库 */}
        {recentImages.length > 0 && (
          <section className="mt-6">
            <SectionHeader title="最近生成" moreHref="/results" />
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {recentImages.map((img) => (
                <Link
                  key={img.id}
                  href="/results"
                  className="glass-panel group overflow-hidden rounded-[14px] shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-muted">
                    <SceneThumb src={img.url} alt="最近生成" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
