"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { WorkbenchDetailPanel } from "@/components/workbench/WorkbenchDetailPanel";
import { WorkbenchActionBar } from "@/components/workbench/WorkbenchActionBar";

export default function WatermarkToolPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="加水印" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>上传图片，添加文字或Logo水印</p>
              <p className="text-sm mt-1">支持批量处理和位置调整</p>
            </div>
          </div>
        </WorkbenchCanvas>
        <WorkbenchDetailPanel title="水印设置">
          <p className="text-sm text-muted-foreground">
            水印参数将在后续阶段实现。
          </p>
        </WorkbenchDetailPanel>
      </div>
      <WorkbenchActionBar
        primaryAction={{ label: "添加水印", onClick: () => {} }}
      />
    </WorkbenchShell>
  );
}
