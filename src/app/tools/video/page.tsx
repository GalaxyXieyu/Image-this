"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { WorkbenchDetailPanel } from "@/components/workbench/WorkbenchDetailPanel";
import { WorkbenchActionBar } from "@/components/workbench/WorkbenchActionBar";

export default function VideoToolPage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="视频生成" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>上传首帧图片，生成商品展示视频</p>
              <p className="text-sm mt-1">支持多种风格和时长选择</p>
            </div>
          </div>
        </WorkbenchCanvas>
        <WorkbenchDetailPanel title="视频参数">
          <p className="text-sm text-muted-foreground">
            视频生成参数将在后续阶段实现。
          </p>
        </WorkbenchDetailPanel>
      </div>
      <WorkbenchActionBar
        primaryAction={{ label: "生成视频", onClick: () => {} }}
      />
    </WorkbenchShell>
  );
}
