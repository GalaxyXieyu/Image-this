"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Download, Moon, Sun } from "lucide-react";
import { BrandLogo } from "@/components/brands/SpriteImage";
import { cn } from "@/lib/utils";

type PrimaryItem = {
  label: string;
  href: string;
  match: (path: string) => boolean;
};

const PRIMARY_ITEMS: PrimaryItem[] = [
  { label: "首页", href: "/", match: (p) => p === "/" },
  {
    label: "工作台",
    href: "/workspace/scene",
    match: (p) =>
      p.startsWith("/workspace") || p.startsWith("/combo") || p.startsWith("/tools"),
  },
  { label: "图库", href: "/results", match: (p) => p.startsWith("/results") },
  { label: "设置", href: "/settings", match: (p) => p.startsWith("/settings") || p.startsWith("/templates") },
];

const WORKSPACE_SEGMENTS = [
  { label: "场景生成", href: "/workspace/scene", match: (p: string) => p.startsWith("/workspace") },
  { label: "组合工作流", href: "/combo", match: (p: string) => p.startsWith("/combo") },
  { label: "单点工具", href: "/tools", match: (p: string) => p.startsWith("/tools") },
];

const TOOL_PILLS = [
  { label: "AI换背景", tool: "background_replace" },
  { label: "加水印", tool: "watermark" },
  { label: "高清放大", tool: "upscale" },
  { label: "智能扩图", tool: "outpaint" },
];

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
      <TopNav pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}

function TopNav({
  pathname,
  isWorkspace,
  isTools,
}: {
  pathname: string;
  isWorkspace: boolean;
  isTools: boolean;
}) {
  return (
    <header className="shrink-0 border-b border-border/60 bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
      <div className="flex h-14 items-center gap-4 px-6">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
          <BrandLogo iconClassName="h-7 w-7 rounded-lg" textClassName="tracking-tight" />
        </Link>

        <nav className="ml-2 flex items-center gap-1">
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

        {isWorkspace && (
          <div className="ml-3 hidden md:flex items-center gap-1 rounded-full border border-border/70 bg-surface-muted/70 p-1">
            {WORKSPACE_SEGMENTS.map((seg) => {
              const active = seg.match(pathname);
              return (
                <Link
                  key={seg.href}
                  href={seg.href}
                  className={cn(
                    "rounded-full px-3 py-1 text-data transition-colors",
                    active
                      ? "bg-accent-gradient text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {seg.label}
                </Link>
              );
            })}
          </div>
        )}

        {isTools && (
          <div className="ml-2 hidden lg:flex items-center gap-1.5">
            {TOOL_PILLS.map((pill) => (
              <Link
                key={pill.tool}
                href={`/tools?tool=${pill.tool}`}
                className="rounded-full border border-border/70 bg-surface/80 px-3 py-1 text-data text-muted-foreground transition-colors hover:border-brand-soft hover:text-foreground"
              >
                {pill.label}
              </Link>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/80 px-3 py-1.5 text-data text-muted-foreground transition-colors hover:text-foreground"
            aria-label="检查更新"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">更新</span>
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
      </div>
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
