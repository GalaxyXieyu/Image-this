"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Image as ImageIcon, Settings as SettingsIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 移动端底部 Tab 栏：左「图库」· 中间凸起「+ 工作台」· 右「设置」。
 * 作为 flex 子节点占位，主内容自然在其上方收缩，避免 fixed 覆盖。
 */
export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const galleryActive = pathname.startsWith("/results");
  const settingsActive = pathname.startsWith("/settings") || pathname.startsWith("/templates");

  return (
    <nav className="md:hidden shrink-0 border-t border-border/60 bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around px-8">
        <Link
          href="/results"
          className={cn(
            "flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium transition-colors",
            galleryActive ? "text-brand-text" : "text-ink-3"
          )}
        >
          <ImageIcon className="h-5 w-5" />
          图库
        </Link>

        {/* 中间：工作台入口 = 黑底白色 + 号按钮（矩形、与栏平齐、无文字，不遮挡页面） */}
        <Link href="/workspace" aria-label="工作台" className="flex w-16 items-center justify-center">
          <span className="flex h-10 w-12 items-center justify-center rounded-[12px] bg-[#1a1a17] text-white shadow-soft transition-transform active:scale-95">
            <Plus className="h-5 w-5" />
          </span>
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex w-16 flex-col items-center gap-0.5 text-[11px] font-medium transition-colors",
            settingsActive ? "text-brand-text" : "text-ink-3"
          )}
        >
          <SettingsIcon className="h-5 w-5" />
          设置
        </Link>
      </div>
    </nav>
  );
}
