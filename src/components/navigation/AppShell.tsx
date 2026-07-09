"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Bell, Download, History, Moon, Sun, ListTodo, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brands/SpriteImage";
import { MobileTabBar } from "@/components/navigation/MobileTabBar";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { PRIMARY_ITEMS, WORKSPACE_SEGMENTS, TOOL_PILLS, DEFAULT_TOOL } from "@/components/navigation/nav-config";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-1 min-h-0">
        <Suspense fallback={<DesktopSidebar pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} activeTool={DEFAULT_TOOL} />}>
          <DesktopSidebarWithSearch pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} />
        </Suspense>
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
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

function DesktopSidebarWithSearch({
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
  return <DesktopSidebar pathname={pathname} isWorkspace={isWorkspace} isTools={isTools} activeTool={activeTool} />;
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
      {/* Row 1: logo / 一级 nav(md~lg) / 右上按钮(桌面) / 任务入口(移动) */}
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex min-h-11 items-center transition-opacity hover:opacity-80">
          <BrandLogo iconClassName="h-7 w-7 rounded-lg" textClassName="tracking-tight" />
        </Link>

        {/* md~lg：一级 nav（lg 起由左侧栏承接） */}
        <nav className="ml-2 hidden md:flex lg:hidden items-center gap-1">
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
          <Link
            href="/tasks"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface/80 px-3 py-1.5 text-data transition-colors hover:text-foreground",
              pathname.startsWith("/tasks") ? "text-brand-text" : "text-muted-foreground"
            )}
            aria-label="历史记录"
            title="历史记录"
          >
            <History className="h-3.5 w-3.5" />
            <span className="hidden md:inline">历史记录</span>
          </Link>
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
          <LogoutButton />
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
          <LogoutButton mobile />
        </div>
      </div>

      {/* Row 2: 工作台二级 nav — 仅 md~lg 展示；lg 起由左侧栏承接，移动端由底部 Tab + hub 承接 */}
      {isWorkspace && (
        <div className="hidden md:flex lg:hidden h-12 items-center gap-3 border-t border-border/40 px-4 md:px-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

function LogoutButton({ mobile }: { mobile?: boolean }) {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
      aria-label="退出登录"
      title="退出登录"
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-border/70 bg-surface/80 text-muted-foreground transition-colors hover:text-destructive",
        mobile ? "h-11 w-11" : "h-8 w-8"
      )}
    >
      <LogOut className={mobile ? "h-5 w-5" : "h-3.5 w-3.5"} />
    </button>
  );
}
