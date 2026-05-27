"use client";

import { WorkbenchShell } from "@/components/workbench/WorkbenchShell";
import { WorkbenchTopNav } from "@/components/workbench/WorkbenchTopNav";
import { WorkbenchSidebar } from "@/components/workbench/WorkbenchSidebar";
import { WorkbenchCanvas } from "@/components/workbench/WorkbenchCanvas";
import { StepBar } from "@/components/workbench/StepBar";

const SCENE_STEPS = [
  { id: "product", label: "商品信息", description: "上传素材并填写信息" },
  { id: "generate", label: "生成候选", description: "AI生成场景图候选" },
  { id: "adjust", label: "调整结果", description: "选择并调整最终效果" },
];

export default function SceneWorkspacePage() {
  return (
    <WorkbenchShell>
      <WorkbenchTopNav title="场景图工作区" />
      <div className="flex flex-1 overflow-hidden">
        <WorkbenchSidebar />
        <WorkbenchCanvas>
          <div className="max-w-5xl mx-auto space-y-6">
            <StepBar steps={SCENE_STEPS} currentStep={0} />
            <div className="border rounded-lg p-8 bg-card">
              <h2 className="text-lg font-semibold mb-2">商品信息</h2>
              <p className="text-muted-foreground">
                上传商品图片，填写商品信息，选择场景风格。
              </p>
            </div>
          </div>
        </WorkbenchCanvas>
      </div>
    </WorkbenchShell>
  );
}
