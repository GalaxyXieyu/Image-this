/**
 * WorkbenchShell
 *
 * Root layout container for the new workbench pages.
 * Provides the outer flex structure: top nav + sidebar + canvas + detail panel.
 */

import React from "react";

interface WorkbenchShellProps {
  children: React.ReactNode;
  className?: string;
}

export function WorkbenchShell({ children, className = "" }: WorkbenchShellProps) {
  return (
    <div
      className={`min-h-screen bg-background flex flex-col overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
