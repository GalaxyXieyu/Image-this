/**
 * WorkbenchTopNav
 *
 * Compact top navigation bar for workbench pages.
 * Replaces the old Navbar with a neutral, minimal design.
 */

import React from "react";
import Link from "next/link";

interface WorkbenchTopNavProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function WorkbenchTopNav({ title, rightContent }: WorkbenchTopNavProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/brands/logo-icon.png" alt="ImageThis" className="w-7 h-7" />
          <span className="font-semibold text-sm text-foreground">
            ImageThis
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
