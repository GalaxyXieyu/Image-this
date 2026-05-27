/**
 * WorkbenchDetailPanel
 *
 * Right-side detail/settings panel for workbench pages.
 * Collapsible on smaller screens.
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface WorkbenchDetailPanelProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  defaultOpen?: boolean;
  width?: number;
}

export function WorkbenchDetailPanel({
  children,
  className = "",
  title,
  defaultOpen = true,
  width = 320,
}: WorkbenchDetailPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "border-l border-border bg-card flex flex-col shrink-0 transition-all duration-200",
        !isOpen && "w-10",
        className
      )}
      style={{ width: isOpen ? width : 40 }}
    >
      {/* Collapse toggle */}
      <div className="h-10 border-b border-border flex items-center justify-between px-3 shrink-0">
        {isOpen && title && (
          <span className="text-sm font-medium text-foreground truncate">
            {title}
          </span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-auto p-1 rounded hover:bg-accent transition-colors"
          aria-label={isOpen ? "收起面板" : "展开面板"}
        >
          {isOpen ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Panel content */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      )}
    </div>
  );
}
