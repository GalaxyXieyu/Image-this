"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useState } from "react";
import { Bell, Download, Moon, Sun, Wand2, Layers, Wrench, Sparkles, Droplets, ZoomIn, Expand, Home, Image as ImageIcon, Settings as SettingsIcon, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brands/SpriteImage";
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

  const isWorkspace = WORKSPACE_SEGMENTS.some((s) => s.match(pathname));
  const isTools = pathname.startsWith("/tools");

  return (
    <div className="flex h-[100dvh] flex-col bg-background text-foreground app-bg-glow">
      <Suspense fallback={<TopNav pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} activeTool={DEFAULT_TOOL} />}>
        <TopNavWithSearch pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} />
      </Suspense>
      <main className="flex-1 min-h-0 overflow-hidden pb-14 md:pb-0">{children}</main>
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Mobile bottom tab bar (hidden on md+)
   ────────────────────────────────────────────── */
function MobileBottomNav({ pathname }: { pathname: string }) {
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex h-14 items-stretch justify-around">
        {PRIMARY_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                active ? "text-brand-text" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
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
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
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

        {/* 移动：右上汉堡（含 主题切换 + 更新 + 通知） */}
        <div className="ml-auto md:hidden flex items-center gap-1.5">
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>

      {/* Row 2: 工作台二级 nav（仅 workspace/combo/tools 页显示），移动端可横滚 */}
      {isWorkspace && (
        <div className="flex h-12 items-center gap-3 border-t border-border/40 px-4 md:px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="菜单"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground"
      >
        <Menu className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-[80%] max-w-[300px] glass-panel rounded-none p-4 shadow-float"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0) + 16px)" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-serif text-h3 text-ink">菜单</span>
              <button onClick={() => setOpen(false)} aria-label="关闭">
                <X className="h-5 w-5 text-ink-2" />
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <button className="relative flex w-full items-center gap-2 rounded-[12px] border border-border/70 bg-surface px-3 py-2.5 text-data text-ink-2">
                <Download className="h-4 w-4" />
                检查更新
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-danger" />
              </button>
              <button className="flex w-full items-center gap-2 rounded-[12px] border border-border/70 bg-surface px-3 py-2.5 text-data text-ink-2">
                <Bell className="h-4 w-4" />
                通知
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted ? (
        isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
