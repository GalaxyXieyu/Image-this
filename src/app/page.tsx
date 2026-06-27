"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  ImageIcon,
  Focus,
  Zap,
  MousePointerClick,
} from "lucide-react";

/* ─── Hero ─────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative w-full max-w-[1160px] px-1 pt-8 pb-10 sm:px-2 sm:pt-10 sm:pb-12 animate-fade-up">
      {/* ambient glow behind hero */}
      <div className="pointer-events-none absolute -left-16 -top-20 h-[300px] w-[300px] rounded-full bg-brand-soft blur-[80px]" />
      <div className="pointer-events-none absolute -right-10 top-40 h-[260px] w-[260px] rounded-full bg-brand-soft blur-[90px]" />

      <div className="relative z-10 grid items-center gap-11 lg:grid-cols-[1.08fr_0.92fr]">
        {/* Left copy */}
        <div className="flex flex-col items-start gap-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-glass px-3.5 py-1.5 text-data text-ink-2 backdrop-blur-[18px] backdrop-saturate-150">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            AI 驱动的电商视觉引擎
          </div>
          <h1 className="font-serif text-[38px] font-bold leading-[1.16] tracking-normal text-ink sm:text-[44px] md:text-[46px] md:leading-[1.22]">
            让每件商品
            <br />
            都有一套
            <span className="text-accent-gradient pt-[0.08em] inline-block">专业视觉</span>
          </h1>
          <p className="max-w-[480px] text-[15px] leading-[1.65] text-ink-2 sm:text-[17px]">
            上传商品图，AI 自动生成场景图、白底图、营销海报和全平台上架素材——从拍摄到上架，一套工具全搞定。
          </p>
          <div className="mt-1 flex w-full max-w-[320px] flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              asChild
              className="h-12 gap-2 rounded-full bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 sm:h-[50px] sm:px-7"
            >
              <Link href="/workspace/scene">
                开始生成场景图
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink hover:bg-surface-muted sm:h-[50px]"
            >
              <Link href="/tools">打开智能工具箱</Link>
            </Button>
          </div>
        </div>

        {/* Right: floating glass preview cards */}
        <div className="relative hidden h-[340px] lg:block">
          {/* Main card */}
          <div className="glass-panel absolute right-0 top-1.5 w-[300px] rounded-[24px] p-[18px] shadow-float">
            <div className="mb-3.5 flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D9544B]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#D98A3D]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#3DA76B]/70" />
            </div>
            <div className="flex h-36 items-center justify-center rounded-[16px] bg-surface-muted">
              <div className="flex flex-col items-center gap-2 text-ink-3">
                <ImageIcon className="h-7 w-7" />
                <span className="text-caption">拖入商品图</span>
              </div>
            </div>
            <div className="mt-4 h-2 w-[62%] rounded-md bg-surface-muted" />
            <div className="mt-2.5 h-2 w-[88%] rounded-md bg-brand-soft" />
            <div className="mt-4 flex gap-2">
              <span className="h-7 w-[70px] rounded-full bg-accent-gradient" />
              <span className="h-7 w-[70px] rounded-full border border-line-strong" />
            </div>
          </div>

          {/* Small card */}
          <div className="glass-panel absolute bottom-2 left-0 w-[206px] rounded-[20px] p-4 shadow-float">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-brand-soft">
                <Focus className="h-4 w-4 text-brand" />
              </span>
              <div>
                <div className="h-1.5 w-[60px] rounded-md bg-surface-muted" />
                <div className="mt-1.5 h-1.5 w-[38px] rounded-md bg-surface-muted/60" />
              </div>
            </div>
            <div
              className="flex h-16 items-center justify-center rounded-[14px]"
              style={{
                background:
                  "repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 9px, transparent 9px, transparent 18px)",
              }}
            >
              <ImageIcon className="h-6 w-6 text-ink-3" />
            </div>
          </div>

          {/* Floating badge */}
          <div className="absolute bottom-0 right-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-caption font-semibold text-ink shadow-soft">
            <Zap className="h-3.5 w-3.5 text-warn" />
            3 秒生成
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Workflow 01/02/03 ────────────────────────────────────────── */
function WorkflowSection() {
  const steps = [
    { num: "01", title: "上传商品", desc: "拖拽或选择商品原图，支持批量上传" },
    { num: "02", title: "AI 生成", desc: "选择场景或模板，AI 自动合成专业素材" },
    { num: "03", title: "直接上架", desc: "导出多尺寸素材，一键适配各平台" },
  ];

  return (
    <section className="w-full max-w-[1160px] px-2 py-7">
      <div className="flex flex-col items-start justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:gap-4">
        <h2 className="font-serif text-[28px] font-semibold tracking-normal text-ink sm:text-[34px]">
          三步完成视觉生产
        </h2>
        <p className="max-w-[260px] text-left text-data text-ink-3 sm:text-right">
          从一张商品原图，到可直接上架的全套素材
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="glass-panel flex flex-col gap-3.5 rounded-[20px] p-5 transition-transform hover:-translate-y-1 sm:rounded-[24px] sm:p-[30px_28px]"
          >
            <span className="font-serif text-[40px] font-semibold leading-none text-brand sm:text-[46px]">
              {s.num}
            </span>
            <div>
              <h3 className="text-[19px] font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-[1.55] text-ink-2">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Categories ───────────────────────────────────────────────── */
function CategoriesSection() {
  const categories = [
    { title: "美妆场景图", desc: "AI 合成真实使用场景", tint: "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)" },
    { title: "食品白底图", desc: "高精抠图商品化", tint: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)" },
    { title: "服饰海报", desc: "营销海报一键生成", tint: "linear-gradient(135deg, #f3e8ff 0%, #c084fc 100%)" },
    { title: "家居场景", desc: "室内场景合成", tint: "linear-gradient(135deg, #ecfeff 0%, #a5f3fc 100%)" },
    { title: "3C 产品图", desc: "科技感产品呈现", tint: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)" },
    { title: "母婴用品", desc: "温馨风格渲染", tint: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)" },
  ];

  return (
    <section className="w-full max-w-[1160px] px-2 py-10">
      <div className="flex flex-col items-start justify-between gap-2 border-b border-line pb-4 sm:flex-row sm:items-end sm:gap-4">
        <h2 className="font-serif text-[28px] font-semibold tracking-normal text-ink sm:text-[34px]">
          覆盖全品类场景
        </h2>
        <p className="max-w-[320px] text-left text-data text-ink-3 sm:text-right">
          美妆 · 食品 · 服饰 · 家居 · 3C · 母婴，一键生成专业素材
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div
            key={c.title}
            className="glass-panel overflow-hidden rounded-[20px] transition-transform hover:-translate-y-1"
          >
            <div
              className="flex h-32 items-center justify-center"
              style={{ background: c.tint }}
            >
              <ImageIcon className="h-9 w-9 text-ink-3/60" />
            </div>
            <div className="px-5 py-4">
              <h3 className="text-[16px] font-bold text-ink">{c.title}</h3>
              <p className="mt-1 text-[13px] leading-[1.5] text-ink-2">{c.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Final CTA ───────────────────────────────────────────────── */
function FinalCtaSection() {
  return (
    <section className="w-full max-w-[1160px] px-2 py-12">
      <div className="glass-panel rounded-[22px] px-5 py-10 text-center shadow-soft sm:rounded-[28px] sm:px-10 sm:py-14">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-data text-brand-text">
          <MousePointerClick className="h-3.5 w-3.5" />
          立即体验 AI 视觉生产
        </div>
        <h2 className="mx-auto mt-5 max-w-[720px] font-serif text-[28px] font-semibold leading-[1.28] tracking-normal text-ink sm:text-[34px] sm:leading-[1.3]">
          今天就开始，让 AI 为你的商品打造专业视觉
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-[1.6] text-ink-2">
          无需设计经验，上传商品图即可生成可直接上架的全套素材
        </p>
        <div className="mx-auto mt-7 flex w-full max-w-[320px] flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            asChild
            className="h-12 gap-2 rounded-full bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 sm:h-[50px] sm:px-7"
          >
            <Link href="/workspace/scene">
              免费开始生成
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-12 rounded-full border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink hover:bg-surface-muted sm:h-[50px]"
          >
            <Link href="/tools">浏览工具箱</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 pb-16 sm:px-6">
        <HeroSection />
        <WorkflowSection />
        <CategoriesSection />
        <FinalCtaSection />
      </main>
    </div>
  );
}
