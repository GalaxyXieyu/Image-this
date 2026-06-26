"use client";

import Link from "next/link";
import { Monitor, ListChecks, Image as ImageIcon } from "lucide-react";

/**
 * 移动端显示「请用电脑端」降级页，桌面端不渲染。
 * 用法：在 page 顶部 `<MobileDesktopOnly title="组合工作流" />`，下面正常渲染桌面 UI。
 */
export function MobileDesktopOnly({
  title,
  reason = "该页面操作较复杂（多栏拖拽 / 并排对比），手机屏幕上体验不佳。",
}: {
  title: string;
  reason?: string;
}) {
  return (
    <div className="md:hidden flex h-full flex-col items-center justify-center px-6 pb-20 text-center">
      <div className="glass-panel w-full max-w-sm rounded-card p-8 shadow-soft">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
          <Monitor className="h-7 w-7 text-brand" />
        </div>
        <h1 className="mt-5 font-serif text-h3 text-ink tracking-tight">{title} · 请用电脑端</h1>
        <p className="mt-2 text-[13px] leading-[1.6] text-ink-2">{reason}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-gradient px-5 py-2.5 text-data font-semibold text-white shadow-soft"
          >
            <ListChecks className="h-4 w-4" />
            查看任务进度
          </Link>
          <Link
            href="/results"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-data font-medium text-ink-2"
          >
            <ImageIcon className="h-4 w-4" />
            打开图库
          </Link>
        </div>
      </div>
    </div>
  );
}
