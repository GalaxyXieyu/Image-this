"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Layers, Sparkles, Droplets, ZoomIn, Expand, ChevronRight, Wand2 } from "lucide-react";
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

// 右列快捷入口：把首屏右侧填满，同时是核心工作台入口
const QUICK_ENTRIES: { href: string; icon: LucideIcon; title: string; desc: string }[] = [
  { href: "/workspace/scene", icon: Wand2, title: "场景生图", desc: "商品图 → 场景大片" },
  { href: "/combo", icon: Layers, title: "工作流", desc: "多步骤批量流水线" },
];

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

function QuickEntry({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="glass-panel card-interactive flex flex-col justify-between rounded-[18px] p-4 shadow-soft lg:h-full"
    >
      <span className="card-ico flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-ink transition-colors">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3 block">
        <span className="flex items-center gap-1 font-serif-brand text-[16px] font-semibold text-ink">
          {title}
          <ChevronRight className="h-4 w-4 text-ink-3" />
        </span>
        <span className="mt-0.5 block text-[12px] text-ink-3">{desc}</span>
      </span>
    </Link>
  );
}

export default function WorkbenchHubPage() {
  const [sceneImage, setSceneImage] = useState<string | null>(null);
  const [recentImages, setRecentImages] = useState<Array<{ id: string; url: string }>>([]);

  useEffect(() => {
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

  const sceneCover = sceneImage || "/scene-presets/scene-lifestyle.webp";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8 lg:max-w-[1200px]">
        {/* 顶部 Bento：旗舰场景（左 2/3）+ 快捷入口（右 1/3），铺满首屏 */}
        <section className="mb-6">
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">开始创作</h2>
          <div className="grid gap-3 md:gap-4 lg:h-[300px] lg:grid-cols-3">
            {/* 旗舰：AI 商品套图 */}
            {SCENES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="glass-panel card-interactive relative overflow-hidden rounded-[20px] shadow-soft lg:col-span-2 lg:h-full"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-surface-muted sm:aspect-[16/7] lg:aspect-auto lg:h-full">
                  <SceneThumb src={sceneCover} alt={s.label} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent lg:bg-gradient-to-r lg:from-black/75 lg:via-black/30 lg:to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:inset-y-0 lg:right-auto lg:flex lg:max-w-[62%] lg:flex-col lg:justify-center lg:p-7">
                    <span className="mb-1.5 inline-flex w-fit rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      一键成套
                    </span>
                    <p className="font-serif-brand text-[22px] font-semibold text-white lg:text-[28px]">{s.label}</p>
                    <p className="mt-1 max-w-[92%] text-[12px] text-white/85 lg:text-[13px]">{s.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
            {/* 右列：快捷入口，桌面竖排铺满，移动端并排 */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-1 lg:grid-rows-2">
              {QUICK_ENTRIES.map((e) => (
                <QuickEntry key={e.href} {...e} />
              ))}
            </div>
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
                    "glass-panel card-interactive flex w-32 shrink-0 flex-col gap-2 rounded-[18px] p-3.5 shadow-soft md:w-auto"
                  )}
                >
                  <span className="card-ico flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-ink transition-colors">
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

        {/* 最近生成：有图铺墙，无图给克制的空状态，保证首页不空 */}
        <section className="mt-6">
          <SectionHeader title="最近生成" moreHref="/results" />
          {recentImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {recentImages.map((img) => (
                <Link
                  key={img.id}
                  href="/results"
                  className="glass-panel card-interactive overflow-hidden rounded-[14px] shadow-soft"
                >
                  <div className="relative aspect-square overflow-hidden bg-surface-muted">
                    <SceneThumb src={img.url} alt="最近生成" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass-panel flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-12 text-center shadow-soft">
              <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-ink-3">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold text-ink-2">还没有作品</p>
              <p className="text-[12px] text-ink-3">从上面选个场景或工具，生成你的第一张图</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
