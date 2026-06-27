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
    <header className="hidden h-14 shrink-0 items-center border-b border-border bg-card px-4 md:flex">
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
