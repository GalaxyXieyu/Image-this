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

export function AssetPreviewImage({
  asset,
  className,
  fallbackClassName,
  fallbackPose = "cheer",
}: {
  asset?: InputAssetRef;
  className?: string;
  fallbackClassName?: string;
  fallbackPose?: "cheer" | "sleep" | "think" | "star";
}) {
  const [failed, setFailed] = useState(false);
  const previewUrl = getAssetPreviewUrl(asset);

  useEffect(() => {
    setFailed(false);
  }, [previewUrl]);

  if (!previewUrl || failed) {
    return (
      <BrandImageFallback
        title=""
        description=""
        pose={fallbackPose}
        className={cn("[&_p]:hidden", fallbackClassName)}
      />
    );
  }

  return (
    <img
      src={previewUrl}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// ============================================================================
// Extracted components for reuse in both mobile and desktop layouts
// ============================================================================

export function SceneTemplateGrid({
  workflowData,
  setWorkflowData,
}: {
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  // 置顶卡的封面应取真实选中预设的图；仅当预设来自模板库（不在场景预设内）时才回退占位图
  const matchedScenePreset = workflowData.selectedPresetId
    ? sceneStyleTemplates.find((t) => t.id === workflowData.selectedPresetId)
    : undefined;
  const presetTemplate =
    workflowData.selectedPresetId && workflowData.activePresetName
      ? {
          id: workflowData.selectedPresetId,
          name: workflowData.activePresetName,
          desc: workflowData.activePresetDescription ?? "来自模板库的场景预设",
          image: matchedScenePreset?.image ?? "/scene-presets/scene-elegant.webp",
          stylePreference: workflowData.stylePreference || workflowData.usageScene || "professional ecommerce scene",
        }
      : null;
  const templates = presetTemplate
    ? [presetTemplate, ...sceneStyleTemplates.filter((template) => template.id !== presetTemplate.id)]
    : sceneStyleTemplates;

  const selectedId = workflowData.selectedTemplates[0] ?? "";
  const selectedTemplate = templates.find((template) => template.id === selectedId);

  const selectTemplate = (template: SceneStyleTemplate) => {
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
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[18px] font-bold text-ink md:text-[22px]">先选背景模板</h2>
      </div>
      <span className="inline-flex min-h-10 w-fit items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-brand-text">
        {selectedTemplate ? selectedTemplate.name : "未选择"}
      </span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={cn(
                "glass-panel relative flex min-w-0 flex-col items-start overflow-hidden rounded-[16px] p-2.5 text-left transition-all hover:-translate-y-0.5 md:rounded-[20px]",
                isSelected ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""
              )}
            >
              <div className="relative mb-2.5 aspect-[4/3] w-full overflow-hidden rounded-[13px] bg-surface-muted md:aspect-square">
                <img
                  src={template.image}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-gradient shadow-soft">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </span>
                )}
              </div>
              <div className="text-[14px] font-semibold text-ink">{template.name}</div>
              <p className="mt-1 line-clamp-2 min-h-[32px] text-[12px] leading-4 text-ink-3">{template.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

