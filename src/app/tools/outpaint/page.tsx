"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { WorkbenchDetailPanel } from "@/components/workbench/WorkbenchDetailPanel";
import { WorkbenchActionBar } from "@/components/workbench/WorkbenchActionBar";

export default function OutpaintToolPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="智能扩图" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>上传图片，智能扩展画面边界</p>
              <p className="text-sm mt-1">保持主体不变，自然延伸背景</p>
            </div>
          </div>
        </WorkbenchCanvas>
        <WorkbenchDetailPanel title="扩图参数">
          <p className="text-sm text-muted-foreground">
            扩图参数将在后续阶段实现。
          </p>
        </WorkbenchDetailPanel>
      </div>
      <WorkbenchActionBar
        primaryAction={{ label: "开始扩图", onClick: () => {} }}
      />
    </WorkbenchShell>
  );
}
