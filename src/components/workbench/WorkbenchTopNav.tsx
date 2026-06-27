/**
 * WorkbenchTopNav
 *
 * Compact top navigation bar for workbench pages.
 * Replaces the old Navbar with a neutral, minimal design.
 */

import React from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brands/SpriteImage";

interface WorkbenchTopNavProps {
  title?: string;
  rightContent?: React.ReactNode;
}

export function WorkbenchTopNav({ title, rightContent }: WorkbenchTopNavProps) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex min-h-11 items-center hover:opacity-80 transition-opacity">
          <BrandLogo iconClassName="h-7 w-7" textClassName="text-data" />
        </Link>
        {title && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-data text-foreground font-medium">{title}</span>
          </>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {rightContent}
      </div>
    </header>
  );
}
