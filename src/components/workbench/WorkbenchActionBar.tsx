/**
 * WorkbenchActionBar
 *
 * Bottom action bar for workbench pages.
 * Holds primary actions, batch toggles, and step navigation.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WorkbenchActionBarProps {
  children?: React.ReactNode;
  className?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
}

export function WorkbenchActionBar({
  children,
  className = "",
  primaryAction,
  secondaryAction,
}: WorkbenchActionBarProps) {
  return (
    <div
      className={cn(
        "h-14 border-t border-border bg-card flex items-center px-4 gap-3 shrink-0",
        className
      )}
    >
      {secondaryAction && (
        <Button
          variant="outline"
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled}
        >
          {secondaryAction.label}
        </Button>
      )}
      {primaryAction && (
        <Button
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled || primaryAction.loading}
        >
          {primaryAction.loading ? "处理中..." : primaryAction.label}
        </Button>
      )}
      <div className="ml-auto flex items-center gap-3">{children}</div>
    </div>
  );
}
