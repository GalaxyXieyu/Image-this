"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/lib/use-is-mobile";
import { sceneStyleTemplates, type SceneStyleTemplate } from "@/lib/scene-presets";
import { getSceneGenerationModels } from "@/lib/ai-models";
import type { InputAssetRef } from "@/types/workbench";
import { BrandEmptyState, BrandImageFallback } from "@/components/brands/SpriteImage";
import { MobileCollapsibleSection } from "@/components/workbench/mobile/MobileCollapsibleSection";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  type CandidateStatus,
  type SceneCandidateResult,
  type Step,
  type UseSceneGenerationResult,
  type WorkflowData,
  StepBar,
  candidateCountOptions,
  getAssetPreviewUrl,
  getCandidateStatusLabel,
  getCandidateStatusVariant,
  getCompactFilename,
  getFilenameDraftName,
  getOptionLabel,
  getProductAssets,
  isTerminalCandidateStatus,
  outputResolutionOptions,
  productTypes,
} from "@/components/scene/types-and-helpers";
import { useSceneGeneration } from "@/components/scene/use-scene-generation";
import {
  SceneAdvancedSettings,
  SceneProductForm,
} from "@/components/scene/scene-product-forms";
import { SceneResultsView } from "@/components/scene/scene-results";
import {
  AssetPreviewImage,
  SceneTemplateGrid,
} from "@/components/scene/scene-preview-bits";

export function ProductInfoStep({
  onBack,
  onNext,
  workflowData,
  setWorkflowData,
}: {
  onBack: () => void;
  onNext: () => void;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const productAssets = getProductAssets(workflowData);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto px-4 pb-4 pt-2 md:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5">
          <SceneProductForm workflowData={workflowData} setWorkflowData={setWorkflowData} />
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" onClick={onBack} className="min-h-11 shrink-0 px-3 text-ink-2 hover:bg-surface-muted sm:w-auto sm:px-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="sm:hidden">风格</span>
          <span className="hidden sm:inline">返回选择风格</span>
        </Button>
        <Button
          onClick={onNext}
          disabled={productAssets.length === 0}
          className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 sm:flex-none"
        >
          <span className="sm:hidden">确认生成</span>
          <span className="hidden sm:inline">下一步：确认并生成</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function StyleTemplateStep({
  onNext,
  workflowData,
  setWorkflowData,
}: {
  onNext: () => void;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const selectedTemplate = sceneStyleTemplates.find(
    (template) => template.id === workflowData.selectedTemplates[0]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto px-4 pb-28 pt-2 sm:px-6 md:pb-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5 md:gap-5">
          <SceneTemplateGrid workflowData={workflowData} setWorkflowData={setWorkflowData} />
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" asChild className="hidden min-h-11 text-ink-2 hover:bg-surface-muted sm:inline-flex">
          <Link href="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回首页
          </Link>
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-5 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:flex-none sm:px-6"
        >
          <span className="sm:hidden">继续上传素材</span>
          <span className="hidden sm:inline">下一步：上传商品素材</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function GenerateAdjustStep({
  onBack,
  workflowData,
  setWorkflowData,
}: {
  onBack: () => void;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const gen = useSceneGeneration(workflowData);
  const productAssets = getProductAssets(workflowData);
  const selectedTemplate = sceneStyleTemplates.find(
    (template) => template.id === workflowData.selectedTemplates[0]
  ) ?? (workflowData.activePresetName
    ? {
        id: workflowData.selectedTemplates[0] ?? "preset",
        name: workflowData.activePresetName,
        desc: workflowData.activePresetDescription ?? "已选择的背景模板",
        image: "/scene-presets/scene-elegant.webp",
        stylePreference: workflowData.stylePreference || workflowData.usageScene,
      }
    : undefined);
  const expectedTaskCount = productAssets.length * Math.max(1, workflowData.candidateCount || 1);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <SceneResultsView
            gen={gen}
            workflowData={workflowData}
            setWorkflowData={setWorkflowData}
            selectedTemplate={selectedTemplate}
            productAssets={productAssets}
            expectedTaskCount={expectedTaskCount}
          />
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" onClick={onBack} className="min-h-11 shrink-0 px-3 text-ink-2 hover:bg-surface-muted sm:w-auto sm:px-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="sm:hidden">返回</span>
          <span className="hidden sm:inline">返回素材</span>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 flex-1 rounded-[14px] border-line-strong bg-surface px-5 text-[15px] font-semibold text-ink sm:flex-none sm:px-6"
        >
          <Link href="/results">
            <span className="sm:hidden">前往图库</span>
            <span className="hidden sm:inline">完成，前往图库</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Desktop dual-column workspace layout
// ============================================================================
export function SceneDesktopWorkspace({
  workflowData,
  setWorkflowData,
}: {
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const gen = useSceneGeneration(workflowData);
  const productAssets = getProductAssets(workflowData);
  const selectedTemplate = sceneStyleTemplates.find(
    (template) => template.id === workflowData.selectedTemplates[0]
  ) ?? (workflowData.activePresetName
    ? {
        id: workflowData.selectedTemplates[0] ?? "preset",
        name: workflowData.activePresetName,
        desc: workflowData.activePresetDescription ?? "已选择的背景模板",
        image: "/scene-presets/scene-elegant.webp",
        stylePreference: workflowData.stylePreference || workflowData.usageScene,
      }
    : undefined);
  const expectedTaskCount = productAssets.length * Math.max(1, workflowData.candidateCount || 1);

  return (
    <div className="h-full flex min-h-0 bg-background">
      <aside className="w-[440px] shrink-0 overflow-y-auto border-r border-line bg-surface-soft p-5 space-y-5">
        <div>
          <h2 className="text-[18px] font-bold text-ink">背景模板</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {sceneStyleTemplates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setWorkflowData((prev) => ({
                      ...prev,
                      selectedTemplates: [template.id],
                      selectedPresetId: template.id,
                      activePresetName: template.name,
                      activePresetDescription: template.desc,
                      stylePreference: template.stylePreference,
                      productType: prev.productType || template.productType || "",
                      candidateCount: template.candidateCount ?? prev.candidateCount,
                    }));
                  }}
                  className={cn(
                    "relative flex flex-col items-start overflow-hidden rounded-[12px] p-1.5 text-left transition-all hover:-translate-y-0.5",
                    isSelected ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""
                  )}
                >
                  <div className="relative mb-1 aspect-square w-full overflow-hidden rounded-[10px] bg-surface-muted">
                    <img
                      src={template.image}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-gradient shadow-soft">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] font-semibold text-ink line-clamp-1">{template.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-line pt-3">
          <h3 className="text-[14px] font-bold text-ink mb-2">素材 & 信息</h3>
          <SceneProductForm workflowData={workflowData} setWorkflowData={setWorkflowData} dense />
        </div>

        <div className="border-t border-line pt-3">
          <h3 className="text-[14px] font-bold text-ink mb-2">生成设置</h3>
          <SceneAdvancedSettings workflowData={workflowData} setWorkflowData={setWorkflowData} />
        </div>

        <div className="sticky bottom-0 z-10 -mx-5 -mb-5 mt-1 space-y-2 border-t border-line bg-surface-soft/95 px-5 py-3 backdrop-blur-[12px]">
          <Button
            onClick={gen.handleGenerate}
            disabled={gen.generating || productAssets.length === 0}
            variant="brand"
            className="w-full min-h-11 rounded-[12px]"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            {gen.generating ? "生成中..." : "开始生成"}
          </Button>
          {productAssets.length > 0 && (
            <div className="rounded-full border border-line bg-surface px-3 py-1.5 text-center text-[12px] font-semibold text-ink-2">
              {productAssets.length} 图 × {Math.max(1, workflowData.candidateCount || 1)} = {expectedTaskCount} 任务
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <SceneResultsView
          gen={gen}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
          selectedTemplate={selectedTemplate}
          productAssets={productAssets}
          expectedTaskCount={expectedTaskCount}
          showSetup={false}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main page component with responsive layout
// ============================================================================
