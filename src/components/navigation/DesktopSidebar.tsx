"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { PRIMARY_ITEMS, WORKSPACE_SEGMENTS, TOOL_PILLS } from "@/components/navigation/nav-config";

/**
 * 桌面端(≥lg)固定左侧栏：一级导航 + 工作台二级 + 工具子项。
 * 仅 lg 起显示（hidden lg:flex）；移动端与 md~lg 顶部 nav 不受影响。
 */
export function DesktopSidebar({
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
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border/60 bg-surface-glass/60 px-3 py-4 [scrollbar-width:thin]">
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-data font-medium transition-colors",
                active
                  ? "bg-brand-soft text-brand-text"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 工作台二级 */}
      {isWorkspace && (
        <div className="mt-2 flex flex-col gap-0.5 border-t border-border/40 pt-3">
          <span className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">工作台</span>
          {WORKSPACE_SEGMENTS.map((seg) => {
            const active = seg.match(pathname);
            const Icon = seg.icon;
            return (
              <Link
                key={seg.href}
                href={seg.href}
                className={cn(
                  "inline-flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-data transition-colors",
                  active
                    ? "bg-surface text-brand-text shadow-soft"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {seg.label}
              </Link>
            );
          })}

          {/* 工具子项 */}
          {isTools && (
            <div className="mt-1 flex flex-col gap-0.5 pl-3">
              {TOOL_PILLS.map((pill) => {
                const active = activeTool === pill.tool;
                const Icon = pill.icon;
                return (
                  <Link
                    key={pill.tool}
                    href={`/tools?tool=${pill.tool}`}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] transition-colors",
                      active
                        ? "bg-accent-gradient text-white shadow-soft"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {pill.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
