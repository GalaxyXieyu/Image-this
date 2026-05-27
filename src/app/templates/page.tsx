"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";

export default function TemplatesPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="模板库" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">模板库</h1>
            <p className="text-muted-foreground">
              选择场景模板或工具预设，快速开始商品视觉生产。
            </p>
            {/* Template grid will be implemented in Phase 2 */}
          </div>
        </WorkbenchCanvas>
      </div>
    </WorkbenchShell>
  );
}
