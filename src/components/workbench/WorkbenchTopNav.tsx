/**
 * WorkbenchTopNav
 *
 * Compact top navigation bar for workbench pages.
 * Replaces the old Navbar with a neutral, minimal design.
 */

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface WorkbenchTopNavProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function WorkbenchTopNav({ title, rightContent }: WorkbenchTopNavProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm text-foreground">
            Imagine This
          </span>
        </Link>
        {title && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-foreground font-medium">{title}</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {rightContent}
      </div>
    </header>
  );
}
