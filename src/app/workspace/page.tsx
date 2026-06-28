import Link from "next/link";
import { Wand2, Layers, Sparkles, Droplets, ZoomIn, Expand, ChevronRight } from "lucide-react";

const TOOLS = [
  { label: "AI 换背景", desc: "电商场景 / 白底", tool: "background_replace", icon: Sparkles },
  { label: "加水印", desc: "文字 / Logo 水印", tool: "watermark", icon: Droplets },
  { label: "高清放大", desc: "提升清晰度", tool: "upscale", icon: ZoomIn },
  { label: "智能扩图", desc: "扩展画布", tool: "outpaint", icon: Expand },
];

export default function WorkbenchHubPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-5">
          <h1 className="font-serif text-[26px] leading-tight tracking-tight text-ink md:text-h2">工作台</h1>
          <p className="mt-1 text-data text-ink-2">选择一个能力开始创作</p>
        </div>

        {/* 区域一：场景功能 */}
        <section className="mb-6">
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">场景功能</h2>
          <Link
            href="/workspace/scene"
            className="glass-panel flex items-center gap-4 rounded-[20px] p-4 shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-accent-gradient text-white shadow-soft">
              <Wand2 className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-ink">场景生成</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">选场景风格，批量生成商品场景图</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
          </Link>
        </section>

        {/* 区域二：工作流 */}
        <section className="mb-6">
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">工作流</h2>
          <Link
            href="/combo"
            className="glass-panel flex items-center gap-4 rounded-[20px] p-4 shadow-soft transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-brand-soft text-brand">
              <Layers className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-ink">组合工作流</span>
              <span className="mt-0.5 block text-[13px] text-ink-3">多步骤链式流水线，一键批量处理</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-ink-3" />
          </Link>
        </section>

        {/* 区域三：小工具（横向滑动） */}
        <section>
          <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wider text-ink-3">小工具</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.tool}
                  href={`/tools?tool=${t.tool}`}
                  className="glass-panel flex w-32 shrink-0 flex-col gap-2 rounded-[18px] p-3.5 shadow-soft transition-transform hover:-translate-y-0.5 md:w-auto"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                    <Icon className="h-5.5 w-5.5" />
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
