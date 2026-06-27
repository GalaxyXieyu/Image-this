"use client";

import { ChevronDown } from "lucide-react";

export function MobileCollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group glass-panel rounded-[18px] md:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-ink">{title}</div>
          <div className="mt-0.5 hidden truncate text-[12px] text-ink-3 sm:block">{summary}</div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}
