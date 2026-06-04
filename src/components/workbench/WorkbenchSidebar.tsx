/**
 * WorkbenchSidebar
 *
 * Left navigation sidebar for workbench pages.
 * Lists workflow sections and tool categories.
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Image,
  Wand2,
  Droplets,
  Expand,
  Zap,
  Video,
  Settings,
  History,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "工作流",
    items: [
      { label: "首页", href: "/", icon: LayoutGrid },
      { label: "模板库", href: "/templates", icon: Image },
      { label: "场景图工作区", href: "/workspace/scene", icon: Wand2 },
    ],
  },
  {
    title: "智能工具箱",
    items: [
      { label: "AI换背景", href: "/tools", icon: Droplets },
      { label: "智能扩图", href: "/tools", icon: Expand },
      { label: "高清化", href: "/tools", icon: Zap },
      { label: "加水印", href: "/tools", icon: Image },
      { label: "视频生成", href: "/tools", icon: Video },
    ],
  },
  {
    title: "管理",
    items: [
      { label: "任务中心", href: "/tasks", icon: History },
      { label: "设置", href: "/settings", icon: Settings },
    ],
  },
];

interface WorkbenchSidebarProps {
  className?: string;
}

export function WorkbenchSidebar({ className = "" }: WorkbenchSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-56 border-r border-border bg-card flex flex-col overflow-y-auto shrink-0",
        className
      )}
    >
      <nav className="p-3 space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
