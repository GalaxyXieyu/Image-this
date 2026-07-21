"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { getPresetById } from "@/lib/workbench/presets";
import type { InputAssetRef, SceneWorkflowDraft, TemplatePreset, WorkflowTaskStatus } from "@/types/workbench";
import { CheckCircle2 } from "lucide-react";

export type Step = 1 | 2 | 3;

export type CandidateStatus = WorkflowTaskStatus | "queued";

export interface SceneCandidateResult {
  id: string;
  taskId?: string;
  savedImageId?: string;
  name: string;
  sourceAsset?: InputAssetRef;
  sourceIndex?: number;
  candidateIndex?: number;
  status: CandidateStatus;
  progress: number;
  currentStep?: string;
  resultImageUrl?: string | null;
  errorMessage?: string;
  usedModel?: string | null;
}

export function getCandidateStatusLabel(status: CandidateStatus) {
  const labels: Record<CandidateStatus, string> = {
    queued: "已入队",
    pending: "等待中",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return labels[status];
}

export function getCandidateStatusVariant(status: CandidateStatus): "success" | "danger" | "processing" | "warning" | "default" {
  if (status === "completed") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "processing") return "processing";
  if (status === "pending") return "warning";
  return "default";
}

export function isTerminalCandidateStatus(status: CandidateStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export interface WorkflowData {
  productName: string;
  productType: string;
  targetAudience: string;
  usageScene: string;
  sellingPoints: string;
  selectedTemplates: string[];
  selectedPresetId?: string;
  activePresetName?: string;
  activePresetDescription?: string;
  stylePreference?: string;
  inputAssets: InputAssetRef[];
  inputAsset?: InputAssetRef;
  referenceAsset?: InputAssetRef;
  aiModel: string;
  outputResolution: string;
  candidateCount: number;
  batchMode: boolean;
}

const EMPTY_WORKFLOW_DATA: WorkflowData = {
  productName: "",
  productType: "",
  targetAudience: "",
  usageScene: "",
  sellingPoints: "",
  selectedTemplates: [],
  inputAssets: [],
  aiModel: "gemini-3.1-flash-image-preview",
  outputResolution: "1024x1024",
  candidateCount: 4,
  batchMode: false,
};

export function isSceneDraftParams(
  params: TemplatePreset["params"]
): params is Partial<SceneWorkflowDraft> {
  return "productInfo" in params || "selectedPresetId" in params;
}


export function createWorkflowDataFromPreset(preset?: TemplatePreset): WorkflowData {
  if (!preset || !isSceneDraftParams(preset.params)) {
    return EMPTY_WORKFLOW_DATA;
  }

  const productInfo = preset.params.productInfo;
  const parameters = preset.params.parameters;

  return {
    ...EMPTY_WORKFLOW_DATA,
    productName: productInfo?.name ?? "",
    productType: productInfo?.category ?? "",
    usageScene: productInfo?.stylePreference ?? "",
    selectedTemplates: productInfo?.stylePreference ? [preset.id] : [],
    selectedPresetId: preset.id,
    activePresetName: preset.name,
    activePresetDescription: preset.description,
    stylePreference: productInfo?.stylePreference,
    aiModel: parameters?.aiModel ?? EMPTY_WORKFLOW_DATA.aiModel,
    outputResolution: parameters?.outputResolution ?? EMPTY_WORKFLOW_DATA.outputResolution,
    candidateCount: parameters?.candidateCount ?? EMPTY_WORKFLOW_DATA.candidateCount,
    batchMode: preset.params.batchMode ?? EMPTY_WORKFLOW_DATA.batchMode,
  };
}

export function StepBar({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: "选择风格模板", mobileLabel: "风格" },
    { num: 2, label: "素材与产品信息", mobileLabel: "素材" },
    { num: 3, label: "生成与结果", mobileLabel: "结果" },
  ];

  return (
    <div className="px-4 pt-3 pb-2 shrink-0 md:px-6 md:pt-4">
      <div className="glass-panel shadow-soft mx-auto flex max-w-[860px] items-center justify-between rounded-[22px] px-3 py-2 md:justify-center md:rounded-full md:px-6 md:py-2.5">
        {steps.map((s, i) => {
          const isActive = currentStep === s.num;
          const isCompleted = currentStep > s.num;
          const reached = isActive || isCompleted;
          return (
            <div key={s.num} className="flex min-w-0 items-center">
              <div className="flex min-w-0 items-center gap-1.5 md:gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors md:h-7 md:w-7",
                    reached
                      ? "bg-accent-gradient text-white shadow-soft"
                      : "bg-surface-muted text-ink-3"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span
                  className={cn(
                    "text-[12px] font-semibold md:text-data md:font-medium",
                    isActive ? "text-ink" : reached ? "text-ink-2" : "text-ink-3"
                  )}
                >
                  <span className="md:hidden">{s.mobileLabel}</span>
                  <span className="hidden md:inline">{s.label}</span>
                </span>
              </div>
              {i < steps.length - 1 && (
	                <div
	                  className={cn(
	                    "mx-2 h-px w-5 shrink-0 transition-colors md:mx-4 md:w-12",
	                    currentStep > s.num ? "bg-brand" : "bg-line-strong"
	                  )}
		                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export const productTypes = [
  { id: "beauty", label: "美妆护肤" },
  { id: "food", label: "食品饮料" },
  { id: "clothing", label: "服装服饰" },
  { id: "electronics", label: "3C 数码" },
  { id: "home", label: "家居用品" },
  { id: "baby", label: "母婴用品" },
  { id: "other", label: "其他" },
];

export const outputResolutionOptions = [
  { id: "800x800", label: "800 方图" },
  { id: "1024x1024", label: "1024 方图" },
  { id: "1200x600", label: "横版 2:1" },
  { id: "1080x1440", label: "竖版 3:4" },
  { id: "1080x1920", label: "竖版 9:16" },
];

export const candidateCountOptions = [1, 2, 3, 4, 5, 6];


export function getOptionLabel(options: Array<{ id: string; label: string }>, value: string) {
  return options.find((option) => option.id === value)?.label ?? value;
}

export function getFilenameDraftName(filename?: string) {
  return filename?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() ?? "";
}

export function getProductAssets(workflowData: WorkflowData) {
  if (workflowData.inputAssets.length > 0) {
    return workflowData.inputAssets;
  }
  return workflowData.inputAsset ? [workflowData.inputAsset] : [];
}

export function getAssetPreviewUrl(asset?: InputAssetRef) {
  return asset?.clientUrl || "";
}

export function getCompactFilename(filename?: string) {
  if (!filename) return "商品图";
  const draftName = getFilenameDraftName(filename);
  return draftName || filename;
}

// ============================================================================
// useSceneGeneration hook: encapsulates generation, polling, and saving logic
// ============================================================================
export interface UseSceneGenerationResult {
  results: SceneCandidateResult[];
  generating: boolean;
  savingCandidateId: string | null;
  completedCount: number;
  failedCount: number;
  activeCount: number;
  isPolling: boolean;
  pollingError: string | null;
  handleGenerate: () => Promise<void>;
  handleSaveResult: (_result: SceneCandidateResult) => Promise<void>;
}

