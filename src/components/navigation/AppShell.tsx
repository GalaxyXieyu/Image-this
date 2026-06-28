"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useState } from "react";
import { Bell, Download, Moon, Sun, Wand2, Layers, Wrench, Sparkles, Droplets, ZoomIn, Expand, Home, Image as ImageIcon, Settings as SettingsIcon, ListTodo } from "lucide-react";
import { BrandLogo } from "@/components/brands/SpriteImage";
import { MobileTabBar } from "@/components/navigation/MobileTabBar";
import { cn } from "@/lib/utils";

type PrimaryItem = {
  label: string;
  href: string;
  match: (path: string) => boolean;
};

const PRIMARY_ITEMS: (PrimaryItem & { icon: typeof Home })[] = [
  { label: "首页", href: "/", icon: Home, match: (p) => p === "/" },
  {
    label: "工作台",
    href: "/workspace/scene",
    icon: Wand2,
    match: (p) =>
      p.startsWith("/workspace") || p.startsWith("/combo") || p.startsWith("/tools"),
  },
  { label: "图库", href: "/results", icon: ImageIcon, match: (p) => p.startsWith("/results") },
  { label: "设置", href: "/settings", icon: SettingsIcon, match: (p) => p.startsWith("/settings") || p.startsWith("/templates") },
];

const WORKSPACE_SEGMENTS = [
  { label: "场景生成", href: "/workspace/scene", icon: Wand2, match: (p: string) => p.startsWith("/workspace") },
  { label: "组合工作流", href: "/combo", icon: Layers, match: (p: string) => p.startsWith("/combo") },
  { label: "单点工具", href: "/tools", icon: Wrench, match: (p: string) => p.startsWith("/tools") },
];

const TOOL_PILLS = [
  { label: "AI换背景", tool: "background_replace", icon: Sparkles },
  { label: "加水印", tool: "watermark", icon: Droplets },
  { label: "高清放大", tool: "upscale", icon: ZoomIn },
  { label: "智能扩图", tool: "outpaint", icon: Expand },
];

const DEFAULT_TOOL = "background_replace";

const HIDDEN_PREFIXES = ["/auth", "/prompt-studio"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (hidden) {
    return <>{children}</>;
  }

  const isWorkspace = WORKSPACE_SEGMENTS.some((s) => s.match(pathname)) || pathname === "/workspace";
  const isTools = pathname.startsWith("/tools");
  // combo 自带 fixed 底部操作栏，避开冲突时隐藏底部 Tab 栏
  const showTabBar = !pathname.startsWith("/combo");

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground app-bg-glow">
      <Suspense fallback={<TopNav pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} activeTool={DEFAULT_TOOL} />}>
        <TopNavWithSearch pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} />
      </Suspense>
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      {showTabBar && <MobileTabBar />}
    </div>
  );
}

function TopNavWithSearch({
  pathname,
  isWorkspace,
  isTools,
}: {
  pathname: string;
  isWorkspace: boolean;
  isTools: boolean;
}) {
  const searchParams = useSearchParams();
  const activeTool = searchParams.get("tool") ?? DEFAULT_TOOL;
  return <TopNav pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} activeTool={activeTool} />;
}

function TopNav({
  pathname,
  isWorkspace,
  isTools,
  activeTool,
}: {
  pathname: string;
  isWorkspace: boolean;
  isTools: boolean;
  activeTool: string;
}) {
  return (
    <header className="shrink-0 border-b border-border/60 bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
      {/* Row 1: logo / 一级 nav(桌面) / 右上按钮(桌面) / 汉堡(移动) */}
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex min-h-11 items-center transition-opacity hover:opacity-80">
          <BrandLogo iconClassName="h-7 w-7 rounded-lg" textClassName="tracking-tight" />
        </Link>

        {/* 桌面：一级 nav */}
        <nav className="ml-2 hidden md:flex items-center gap-1">
          {PRIMARY_ITEMS.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-data font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand-text"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 桌面：右上按钮组 */}
        <div className="ml-auto hidden md:flex items-center gap-1.5">
          <button
            type="button"
            className="relative inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/80 px-3 py-1.5 text-data text-muted-foreground transition-colors hover:text-foreground"
            aria-label="检查更新"
            title="检查更新"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">更新</span>
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2 rounded-full bg-danger ring-2 ring-background" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="通知"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
          <ThemeToggle />
        </div>

        {/* 移动：右上 任务入口 + 主题（导航改由底部 Tab 栏 + 顶部二级承接） */}
        <div className="ml-auto md:hidden flex items-center gap-1.5">
          <Link
            href="/tasks"
            aria-label="任务"
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-surface/80 transition-colors",
              pathname.startsWith("/tasks") ? "text-brand-text" : "text-muted-foreground"
            )}
          >
            <ListTodo className="h-5 w-5" />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Row 2: 工作台二级 nav — 仅桌面端展示；移动端已由底部 Tab + 工作台 hub 承接，不再重复 */}
      {isWorkspace && (
        <div className="hidden md:flex h-12 items-center gap-3 border-t border-border/40 px-4 md:px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center gap-1 rounded-full border border-border/70 bg-surface-muted/70 p-1">
            {WORKSPACE_SEGMENTS.map((seg) => {
              const active = seg.match(pathname);
              const Icon = seg.icon;
              return (
                <Link
                  key={seg.href}
                  href={seg.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-data transition-colors",
                    active
                      ? "bg-surface text-brand-text shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {seg.label}
                </Link>
              );
            })}
          </div>

          {isTools && (
            <div className="flex flex-wrap items-center gap-1.5">
              {TOOL_PILLS.map((pill) => {
                const active = activeTool === pill.tool;
                const Icon = pill.icon;
                return (
                  <Link
                    key={pill.tool}
                    href={`/tools?tool=${pill.tool}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-data transition-colors",
                      active
                        ? "bg-accent-gradient text-white shadow-soft"
                        : "border border-border/70 bg-surface/80 text-muted-foreground hover:border-brand-soft hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {pill.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </header>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const isDark = current === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="切换主题"
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
