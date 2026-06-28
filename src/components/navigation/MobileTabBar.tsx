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
  const workbenchActive =
    pathname === "/workspace" ||
    pathname.startsWith("/workspace") ||
    pathname.startsWith("/combo") ||
    pathname.startsWith("/tools");

  return (
    <nav className="md:hidden shrink-0 border-t border-border/60 bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-end justify-around px-8 pb-2">
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

        {/* 中间凸起：工作台 hub 入口 */}
        <Link href="/workspace" aria-label="工作台" className="flex w-16 flex-col items-center">
          <span
            className={cn(
              "-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-accent-gradient text-white shadow-float ring-4 ring-background transition-transform active:scale-95"
            )}
          >
            <Plus className="h-6 w-6" />
          </span>
          <span
            className={cn(
              "mt-0.5 text-[11px] font-semibold",
              workbenchActive ? "text-brand-text" : "text-ink-3"
            )}
          >
            工作台
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
