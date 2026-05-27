"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { WorkbenchDetailPanel } from "@/components/workbench/WorkbenchDetailPanel";
import { WorkbenchActionBar } from "@/components/workbench/WorkbenchActionBar";

export default function BackgroundToolPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="AI换背景" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>上传商品图片，选择参考背景或输入提示词</p>
              <p className="text-sm mt-1">AI将自动替换背景并保持商品主体</p>
            </div>
          </div>
        </WorkbenchCanvas>
        <WorkbenchDetailPanel title="参数设置">
          <p className="text-sm text-muted-foreground">
            背景替换参数将在后续阶段实现。
          </p>
        </WorkbenchDetailPanel>
      </div>
      <WorkbenchActionBar
        primaryAction={{ label: "开始处理", onClick: () => {} }}
      />
    </WorkbenchShell>
  );
}
