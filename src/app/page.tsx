"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  ImageIcon,
  Focus,
  Zap,
} from "lucide-react";

/* ─── Hero ─────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative w-full max-w-[1160px] px-2 pt-10 pb-12 animate-fade-up">
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
          <h1 className="font-serif text-[46px] font-bold leading-[1.22] tracking-[-0.02em] text-ink">
            让每件商品
            <br />
            都有一套
            <span className="text-accent-gradient pt-[0.08em] inline-block">专业视觉</span>
          </h1>
          <p className="max-w-[480px] text-[17px] leading-[1.6] text-ink-2">
            上传商品图，AI 自动生成场景图、白底图、营销海报和全平台上架素材——从拍摄到上架，一套工具全搞定。
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="h-[50px] gap-2 rounded-full bg-accent-gradient px-7 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5"
            >
              <Link href="/workspace/scene">
                开始生成场景图
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-[50px] rounded-full border-line-strong bg-surface px-6 text-[15px] font-semibold text-ink hover:bg-surface-muted"
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
      <div className="flex items-end justify-between gap-4 border-b border-line pb-4">
        <h2 className="font-serif text-[34px] font-semibold tracking-[-0.01em] text-ink">
          三步完成视觉生产
        </h2>
        <p className="max-w-[260px] text-right text-data text-ink-3">
          从一张商品原图，到可直接上架的全套素材
        </p>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-[18px] md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="glass-panel flex flex-col gap-3.5 rounded-[24px] p-[30px_28px] transition-transform hover:-translate-y-1"
          >
            <span className="font-serif text-[46px] font-semibold leading-none text-brand">
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

/* ─── Page ─────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <main className="mx-auto flex w-full max-w-[1200px] flex-col items-center px-6 pb-16">
        <HeroSection />
        <WorkflowSection />
      </main>
    </div>
  );
}
