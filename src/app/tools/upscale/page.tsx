"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { WorkbenchDetailPanel } from "@/components/workbench/WorkbenchDetailPanel";
import { WorkbenchActionBar } from "@/components/workbench/WorkbenchActionBar";

export default function UpscaleToolPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="高清化" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>上传图片，AI智能提升分辨率</p>
              <p className="text-sm mt-1">让模糊变清晰，细节更丰富</p>
            </div>
          </div>
        </WorkbenchCanvas>
        <WorkbenchDetailPanel title="高清化参数">
          <p className="text-sm text-muted-foreground">
            高清化参数将在后续阶段实现。
          </p>
        </WorkbenchDetailPanel>
      </div>
      <WorkbenchActionBar
        primaryAction={{ label: "开始高清化", onClick: () => {} }}
      />
    </WorkbenchShell>
  );
}
