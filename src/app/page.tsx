"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Scan,
  Image,
  Palette,
  Wrench,
  Users,
  Zap,
  Store,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0066FF]" />
        <span className="text-base font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
          AI 商品视觉工作台
        </span>
      </div>
      <nav className="flex items-center gap-6">
        <Link href="/" className="text-sm text-foreground font-medium" style={{ fontFamily: "Geist, sans-serif" }}>
          首页
        </Link>
        <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "Geist, sans-serif" }}>
          模板库
        </Link>
        <Link href="/tasks" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "Geist, sans-serif" }}>
          任务中心
        </Link>
        <Link href="/results" className="text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ fontFamily: "Geist, sans-serif" }}>
          结果管理
        </Link>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          设置
        </Link>
      </nav>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-6 pt-16 pb-8">
      <Badge
        variant="secondary"
        className="px-4 py-1.5 rounded-full text-sm font-normal bg-muted text-foreground"
        style={{ fontFamily: "Geist, sans-serif" }}
      >
        AI 驱动的电商视觉引擎
      </Badge>
      <h1
        className="text-5xl md:text-6xl font-semibold text-foreground text-center max-w-[800px]"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        让每件商品都有一套专业视觉
      </h1>
      <p
        className="text-lg text-muted-foreground text-center max-w-[640px] leading-relaxed"
        style={{ fontFamily: "Geist, sans-serif" }}
      >
        为电商卖家和运营设计的 AI 视觉生产工作台——上传商品，批量产出可上架、可投放的全套素材
      </p>
      <div className="flex items-center gap-4 mt-2">
        <Button
          asChild
          className="h-12 px-6 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <Link href="/workspace/scene">
            开始生成场景图
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 px-6 rounded-full border-border bg-background hover:bg-muted"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          <Link href="/tools">
            打开智能工具箱
          </Link>
        </Button>
      </div>
    </section>
  );
}

function TrustBar() {
  const items = [
    { icon: Users, value: "10万+", label: "电商卖家信赖" },
    { icon: Zap, value: "5000万+", label: "素材已生成" },
    { icon: Store, value: "6 大平台", label: "全平台适配" },
    { icon: CheckCircle, value: "99.5%", label: "生成成功率" },
  ];

  return (
    <section className="flex items-center justify-center gap-12 py-8">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <item.icon className="w-6 h-6 text-[#0066FF]" />
          <div className="flex flex-col">
            <span className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
              {item.value}
            </span>
            <span className="text-sm text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
              {item.label}
            </span>
          </div>
          {i < items.length - 1 && (
            <div className="w-px h-8 bg-border ml-9" />
          )}
        </div>
      ))}
    </section>
  );
}

function QuickActions() {
  const actions = [
    { icon: ShoppingBag, title: "上架图生成", desc: "多平台适配" },
    { icon: Scan, title: "白底图", desc: "智能抠图" },
    { icon: Image, title: "场景图", desc: "AI 合成场景" },
    { icon: Palette, title: "海报设计", desc: "营销海报" },
    { icon: Wrench, title: "智能工具箱", desc: "换背景/水印/组合" },
  ];

  return (
    <section className="flex items-center justify-center gap-8 py-8">
      {actions.map((action, i) => (
        <Link
          key={i}
          href={
            action.title === "智能工具箱"
              ? "/tools"
              : action.title === "场景图"
              ? "/workspace/scene"
              : action.title === "白底图"
              ? "/tools/background"
              : action.title === "上架图生成"
              ? "/templates?category=listing"
              : "/templates"
          }
          className="flex flex-col items-center gap-2 w-[140px] group"
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
            <action.icon className="w-6 h-6 text-[#0066FF]" />
          </div>
          <span className="text-sm font-medium text-foreground text-center" style={{ fontFamily: "Inter, sans-serif" }}>
            {action.title}
          </span>
          <span className="text-xs text-muted-foreground text-center" style={{ fontFamily: "Geist, sans-serif" }}>
            {action.desc}
          </span>
        </Link>
      ))}
    </section>
  );
}

function CaseStudies() {
  const cases = [
    { title: "美妆场景图", desc: "AI 合成真实使用场景" },
    { title: "食品白底图", desc: "高精抠图商品化" },
    { title: "服饰海报", desc: "营销海报一键生成" },
    { title: "家居场景图", desc: "室内场景合成" },
    { title: "3C 产品图", desc: "科技感产品呈现" },
    { title: "母婴用品", desc: "温馨风格渲染" },
  ];

  return (
    <section className="flex flex-col items-center gap-6 py-16">
      <h2
        className="text-3xl md:text-4xl font-semibold text-foreground text-center"
        style={{ fontFamily: "Inter, sans-serif" }}
      >
        看看 AI 能为你做什么
      </h2>
      <p
        className="text-lg text-muted-foreground text-center max-w-[600px]"
        style={{ fontFamily: "Geist, sans-serif" }}
      >
        不同品类、不同场景，一键生成专业级商品素材
      </p>
      <div className="grid grid-cols-3 gap-5 w-full max-w-[1200px] mt-4">
        {cases.map((c, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="h-40 bg-muted flex flex-col items-center justify-center gap-2">
              <Image className="w-8 h-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                场景图预览
              </span>
            </div>
            <div className="p-6">
              <h3
                className="text-2xl font-normal text-foreground mb-2"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {c.title}
              </h3>
              <p className="text-base text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                {c.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav />
      <main className="flex-1 flex flex-col items-center">
        <HeroSection />
        <TrustBar />
        <QuickActions />
        <CaseStudies />
      </main>
    </div>
  );
}
