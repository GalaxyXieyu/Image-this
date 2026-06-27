"use client";

/**
 * WorkbenchShell
 *
 * Root layout container for workbench pages.
 * Supports both plain page shells and the desktop app sidebar layout.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { WorkbenchSidebar } from "./WorkbenchSidebar";

interface WorkbenchShellProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  sidebar?: boolean;
}

export function WorkbenchShell({
  children,
  className = "",
  contentClassName = "",
  sidebar = false,
}: WorkbenchShellProps) {
  if (sidebar) {
    return (
      <div className={cn("h-screen bg-background flex overflow-hidden", className)}>
        <WorkbenchSidebar />
        <main className={cn("min-w-0 flex-1 flex flex-col overflow-hidden", contentClassName)}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div
      className={cn("h-full bg-background flex flex-col overflow-hidden", className)}
    >
      {children}
    </div>
  );
}
