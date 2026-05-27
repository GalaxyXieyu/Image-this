/**
 * WorkbenchCanvas
 *
 * Central content area for workbench pages.
 * Holds the main editor, preview, or workflow content.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface WorkbenchCanvasProps {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export function WorkbenchCanvas({
  children,
  className = "",
  padded = true,
}: WorkbenchCanvasProps) {
  return (
    <main
      className={cn(
        "flex-1 overflow-auto bg-background",
        padded && "p-6",
        className
      )}
    >
      {children}
    </main>
  );
}
