"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brands/SpriteImage";
import {
  ShoppingBag,
  Scan,
  Image as ImageIcon,
  Palette,
  Wrench,
  Zap,
  Layers,
  ArrowRight,
  Sparkles,
  Box,
  ImagePlus,
  Download,
  Aperture,
  MousePointerClick,
} from "lucide-react";

/* ─── Nav ─── */
function TopNav() {
  const links = [
    { label: "首页", href: "/", active: true },
    { label: "模板库", href: "/templates" },
    { label: "任务中心", href: "/tasks" },
    { label: "结果管理", href: "/results" },
    { label: "设置", href: "/settings" },
  ];

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border/60 bg-white/80 px-6 backdrop-blur-md flex items-center justify-between shrink-0">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <BrandLogo iconClassName="h-7 w-7 rounded-lg" textClassName="tracking-tight" />
      </Link>
      <nav className="flex items-center gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-lg px-3 py-1.5 text-data font-medium transition-colors ${
              l.active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/* ─── Hero preview cards (pure CSS, no images) ─── */
function PreviewCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`absolute rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_8px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1 ${className}`}
    >
      {children}
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative mx-4 mt-6 w-full max-w-[1160px] overflow-hidden rounded-[32px] border border-[#E8EEF3] bg-brand-gradient-light px-8 py-16 lg:px-14 lg:py-20 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
      {/* ambient glows */}
      <div className="absolute -left-10 -top-10 h-56 w-56 rounded-full bg-white/90 blur-[80px]" />
      <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-[#BFDBFE]/30 blur-[90px]" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#DBEAFE]/20 blur-[60px]" />

      <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left copy */}
        <div className="flex flex-col items-start gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/70 px-4 py-1.5 text-data text-muted-foreground shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-ai" />
            AI 驱动的电商视觉引擎
          </div>
          <h1 className="max-w-[640px] text-h1 font-semibold text-foreground tracking-tight">
            让每件商品
            <br />
            都有一套专业视觉
          </h1>
          <p className="max-w-[520px] text-body text-muted-foreground leading-relaxed">
            上传商品图，AI 自动生成场景图、白底图、营销海报和全平台上架素材——从拍摄到上架，一套工具全搞定。
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <Button
              asChild
              className="h-12 rounded-full bg-primary px-7 text-data font-medium text-white shadow-sm hover:bg-primary-hover transition-colors"
            >
              <Link href="/workspace/scene">开始生成场景图</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-[#DDE4EB] bg-white/70 px-7 text-data font-medium text-foreground backdrop-blur-sm hover:bg-white transition-colors"
            >
              <Link href="/tools">打开智能工具箱</Link>
            </Button>
          </div>
        </div>

        {/* Right visual composition */}
        <div className="relative hidden min-h-[320px] lg:block">
          {/* Main card */}
          <PreviewCard className="right-2 top-0 h-64 w-80">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
            </div>
            <div className="h-32 rounded-2xl bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] flex items-center justify-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="h-14 w-20 rounded-xl bg-white shadow-sm flex items-center justify-center">
                  <Box className="h-7 w-7 text-primary" />
                </div>
                <span className="text-caption text-muted-foreground">商品场景图</span>
              </div>
            </div>
            <div className="mt-4 h-2.5 w-28 rounded-full bg-[#E2E8F0]" />
            <div className="mt-2.5 h-2.5 w-44 rounded-full bg-[#DBEAFE]" />
            <div className="mt-5 flex gap-2">
              <div className="h-7 w-16 rounded-full bg-primary" />
              <div className="h-7 w-16 rounded-full border border-[#DBEAFE] bg-white" />
            </div>
          </PreviewCard>

          {/* Small card */}
          <PreviewCard className="bottom-6 left-0 h-40 w-52">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-ai-soft flex items-center justify-center">
                <Aperture className="h-4 w-4 text-ai" />
              </div>
              <div>
                <div className="h-2 w-16 rounded-full bg-[#E2E8F0]" />
                <div className="mt-1.5 h-1.5 w-10 rounded-full bg-[#F1F5F9]" />
              </div>
            </div>
            <div className="h-16 rounded-xl bg-gradient-to-br from-[#EDE9FE] to-[#DDD6FE] flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-ai" />
            </div>
          </PreviewCard>

          {/* Floating badge */}
          <div className="absolute bottom-2 right-6 inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-sm backdrop-blur-sm">
            <Zap className="h-3 w-3 text-warning" />
            3 秒生成
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Quick actions (5 items, icon chips) ─── */
function QuickActions() {
  const actions = [
    { icon: ShoppingBag, title: "上架图", desc: "多平台适配", href: "/templates?category=listing" },
    { icon: Scan, title: "白底图", desc: "智能抠图", href: "/tools" },
    { icon: ImageIcon, title: "场景图", desc: "AI 合成", href: "/workspace/scene" },
    { icon: Palette, title: "海报", desc: "营销设计", href: "/templates" },
    { icon: Wrench, title: "工具箱", desc: "换背景/扩图", href: "/tools" },
  ];

  return (
    <section className="w-full max-w-[1160px] px-4">
      <div className="flex items-start justify-between gap-4 rounded-[24px] border border-border/60 bg-card p-6 shadow-sm">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.title}
              href={a.href}
              className="group flex flex-1 flex-col items-center gap-3 rounded-2xl py-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-transform duration-300 group-hover:scale-105 group-hover:bg-muted/80">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-data font-medium text-foreground">{a.title}</p>
                <p className="text-caption text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ─── How it works ─── */
function WorkflowSection() {
  const steps = [
    { icon: ImagePlus, title: "上传商品", desc: "拖拽或选择商品原图，支持批量上传" },
    { icon: Sparkles, title: "AI 生成", desc: "选择场景或模板，AI 自动合成专业素材" },
    { icon: Download, title: "直接上架", desc: "导出多尺寸素材，一键适配各平台" },
  ];

  return (
    <section className="w-full max-w-[1160px] px-4 flex flex-col items-center gap-8 py-6">
      <div className="text-center">
        <h2 className="text-h2 font-semibold text-foreground tracking-tight">三步完成视觉生产</h2>
        <p className="mt-2 text-body text-muted-foreground">从商品图到上架素材，全程自动化</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              className="group relative flex flex-col items-center gap-4 rounded-[24px] border border-border/60 bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-h3 font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1.5 text-body text-muted-foreground">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 lg:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Use-case cards (no external images) ─── */
function UseCases() {
  const cases = [
    { title: "美妆场景图", desc: "AI 合成真实使用场景", gradient: "from-[#FDF2F8] to-[#FCE7F3]", icon: Aperture, iconColor: "text-[#DB2777]" },
    { title: "食品白底图", desc: "高精抠图商品化", gradient: "from-[#F0FDF4] to-[#DCFCE7]", icon: Scan, iconColor: "text-[#16A34A]" },
    { title: "服饰海报", desc: "营销海报一键生成", gradient: "from-[#EFF6FF] to-[#DBEAFE]", icon: Palette, iconColor: "text-[#2563EB]" },
    { title: "家居场景", desc: "室内场景合成", gradient: "from-[#FFFBEB] to-[#FEF3C7]", icon: Layers, iconColor: "text-[#D97706]" },
    { title: "3C 产品图", desc: "科技感产品呈现", gradient: "from-[#F5F3FF] to-[#EDE9FE]", icon: Zap, iconColor: "text-[#7C3AED]" },
    { title: "母婴用品", desc: "温馨风格渲染", gradient: "from-[#FDF2F8] to-[#FCE7F3]", icon: Box, iconColor: "text-[#DB2777]" },
  ];

  return (
    <section className="w-full max-w-[1160px] px-4 flex flex-col items-center gap-8 py-6">
      <div className="text-center">
        <h2 className="text-h2 font-semibold text-foreground tracking-tight">覆盖全品类场景</h2>
        <p className="mt-2 text-body text-muted-foreground">不同品类、不同场景，一键生成专业级商品素材</p>
      </div>
      <div className="grid w-full grid-cols-3 gap-5">
        {cases.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="group overflow-hidden rounded-[24px] border border-border/60 bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className={`h-40 bg-gradient-to-br ${c.gradient} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                <Icon className={`h-10 w-10 ${c.iconColor} opacity-80`} />
              </div>
              <div className="p-6">
                <h3 className="text-h3 font-semibold text-foreground">{c.title}</h3>
                <p className="mt-1.5 text-body text-muted-foreground">{c.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Final CTA ─── */
function FinalCTA() {
  return (
    <section className="w-full max-w-[1160px] px-4 pb-10">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] px-8 py-16 text-center shadow-xl">
        <div className="absolute left-10 top-0 h-40 w-40 rounded-full bg-primary/10 blur-[60px]" />
        <div className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-ai/10 blur-[70px]" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-data text-white/70 backdrop-blur-sm">
            <MousePointerClick className="h-3.5 w-3.5 text-primary" />
            立即体验 AI 视觉生产
          </div>
          <h2 className="max-w-[560px] text-h2 font-semibold text-white tracking-tight">
            今天就开始，让 AI 为你的商品打造专业视觉
          </h2>
          <p className="max-w-[480px] text-body text-white/60">
            无需设计经验，上传商品图即可生成可直接上架的全套素材
          </p>
          <div className="flex items-center gap-3 mt-1">
            <Button
              asChild
              className="h-12 rounded-full bg-white px-7 text-data font-semibold text-[#0F172A] shadow-sm hover:bg-white/90 transition-colors"
            >
              <Link href="/workspace/scene">免费开始生成</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-transparent px-7 text-data font-medium text-white hover:bg-white/10 transition-colors"
            >
              <Link href="/tools">浏览工具箱</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 flex flex-col items-center gap-10 pb-6">
        <HeroSection />
        <QuickActions />
        <WorkflowSection />
        <UseCases />
        <FinalCTA />
      </main>
    </div>
  );
}