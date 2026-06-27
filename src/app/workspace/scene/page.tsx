"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { apiPost } from "@/lib/api-client";
import { useUpload } from "@/lib/use-upload";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";
import { useToast } from "@/components/ui/use-toast";
import { getPresetById } from "@/lib/workbench/presets";
import { buildSceneLegacyTaskRequests } from "@/lib/workbench/scene-task-adapter";
import { getSceneGenerationModels } from "@/lib/ai-models";
import type { InputAssetRef, SceneWorkflowDraft, TemplatePreset, WorkflowTaskStatus } from "@/types/workbench";
import { BrandEmptyState, BrandImageFallback } from "@/components/brands/SpriteImage";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Plus,
  Trash2,
  Wand2,
  ShoppingBag,
} from "lucide-react";

type Step = 1 | 2 | 3;

type CandidateStatus = WorkflowTaskStatus | "queued";

interface SceneCandidateResult {
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

function getCandidateStatusLabel(status: CandidateStatus) {
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

function getCandidateStatusVariant(status: CandidateStatus): "success" | "danger" | "processing" | "warning" | "default" {
  if (status === "completed") return "success";
  if (status === "failed" || status === "cancelled") return "danger";
  if (status === "processing") return "processing";
  if (status === "pending") return "warning";
  return "default";
}

function isTerminalCandidateStatus(status: CandidateStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

interface WorkflowData {
  productName: string;
  productType: string;
  targetAudience: string;
  usageScene: string;
  sellingPoints: string;
  platforms: string[];
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
  platforms: [],
  selectedTemplates: [],
  inputAssets: [],
  aiModel: "gemini-3.1-flash-image-preview",
  outputResolution: "1024x1024",
  candidateCount: 4,
  batchMode: false,
};

function isSceneDraftParams(
  params: TemplatePreset["params"]
): params is Partial<SceneWorkflowDraft> {
  return "productInfo" in params || "selectedPresetId" in params;
}

function mapPlatformToSelection(platform?: string): string[] {
  if (!platform) return [];
  if (platform === "tmall") return ["taobao"];
  if (["taobao", "jd", "pdd", "douyin"].includes(platform)) return [platform];
  return [];
}

function mapSelectionToTargetPlatform(platform?: string): SceneWorkflowDraft["productInfo"]["targetPlatform"] {
  if (!platform) return undefined;
  if (["taobao", "jd", "pdd", "douyin"].includes(platform)) {
    return platform as SceneWorkflowDraft["productInfo"]["targetPlatform"];
  }
  return "other";
}

function createWorkflowDataFromPreset(preset?: TemplatePreset): WorkflowData {
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
    platforms: mapPlatformToSelection(productInfo?.targetPlatform),
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

function StepBar({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: "素材与产品信息", mobileLabel: "素材" },
    { num: 2, label: "选择风格模板", mobileLabel: "风格" },
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


const platforms = [
  { id: "taobao", label: "淘宝/天猫" },
  { id: "jd", label: "京东" },
  { id: "pdd", label: "拼多多" },
  { id: "douyin", label: "抖音" },
  { id: "xiaohongshu", label: "小红书" },
  { id: "wechat", label: "微信小程序" },
];

const productTypes = [
  { id: "beauty", label: "美妆护肤" },
  { id: "food", label: "食品饮料" },
  { id: "clothing", label: "服装服饰" },
  { id: "electronics", label: "3C 数码" },
  { id: "home", label: "家居用品" },
  { id: "baby", label: "母婴用品" },
  { id: "other", label: "其他" },
];

const outputResolutionOptions = [
  { id: "800x800", label: "800 方图" },
  { id: "1024x1024", label: "1024 方图" },
  { id: "1200x600", label: "横版 2:1" },
  { id: "1080x1440", label: "竖版 3:4" },
  { id: "1080x1920", label: "竖版 9:16" },
];

const candidateCountOptions = [1, 2, 3, 4, 5, 6];

function HorizontalPillScroller({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

function MobileCollapsibleSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group glass-panel rounded-[18px] md:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-ink">{title}</div>
          <div className="mt-0.5 hidden truncate text-[12px] text-ink-3 sm:block">{summary}</div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

function getOptionLabel(options: Array<{ id: string; label: string }>, value: string) {
  return options.find((option) => option.id === value)?.label ?? value;
}

function getFilenameDraftName(filename?: string) {
  return filename?.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() ?? "";
}

function getProductAssets(workflowData: WorkflowData) {
  if (workflowData.inputAssets.length > 0) {
    return workflowData.inputAssets;
  }
  return workflowData.inputAsset ? [workflowData.inputAsset] : [];
}

function getAssetPreviewUrl(asset?: InputAssetRef) {
  return asset?.clientUrl || "";
}

function getCompactFilename(filename?: string) {
  if (!filename) return "商品图";
  const draftName = getFilenameDraftName(filename);
  return draftName || filename;
}

function AssetPreviewImage({
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

function ProductInfoStep({
  onNext,
  workflowData,
  setWorkflowData,
}: {
  onNext: () => void;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUpload();
  const [uploadingProductAssets, setUploadingProductAssets] = useState(false);
  const { toast } = useToast();
  const productAssets = getProductAssets(workflowData);
  const isUploadingAsset = uploading || uploadingProductAssets;

  const appendProductAssets = (assets: InputAssetRef[]) => {
    if (assets.length === 0) return;

    setWorkflowData((prev) => {
      const nextAssets = [...getProductAssets(prev), ...assets];
      return {
        ...prev,
        inputAssets: nextAssets,
        inputAsset: nextAssets[0],
        productName: prev.productName || getFilenameDraftName(nextAssets[0]?.originalFilename),
      };
    });
  };

  const handleUploadInputAssets = async (files?: FileList | File[]) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    const uploadedAssets: InputAssetRef[] = [];
    setUploadingProductAssets(true);
    try {
      for (const file of selectedFiles) {
        const response = await upload({ input: file });
        if (response.inputAsset) {
          uploadedAssets.push(response.inputAsset);
        }
      }

      appendProductAssets(uploadedAssets);
      if (uploadedAssets.length > 0) {
        toast({
          title: "商品图已加入",
          description: `已添加 ${uploadedAssets.length} 张商品图，共 ${productAssets.length + uploadedAssets.length} 张。`,
        });
      }
    } catch (error) {
      appendProductAssets(uploadedAssets);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setUploadingProductAssets(false);
    }
  };

  const handleUploadReferenceAsset = async (file?: File) => {
    if (!file) return;
    try {
      const response = await upload({ reference: file });
      const asset = response.referenceAsset;
      if (!asset) return;

      setWorkflowData((prev) => ({
        ...prev,
        referenceAsset: asset,
      }));
      toast({
        title: "参考图已上传",
        description: asset.originalFilename,
      });
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const removeProductAsset = (assetId: string) => {
    setWorkflowData((prev) => {
      const nextAssets = getProductAssets(prev).filter((asset) => asset.assetId !== assetId);
      return {
        ...prev,
        inputAssets: nextAssets,
        inputAsset: nextAssets[0],
      };
    });
  };

  const moreInfoCount = [
    workflowData.targetAudience,
    workflowData.sellingPoints,
    workflowData.platforms.length > 0 ? "platforms" : "",
  ].filter(Boolean).length;
  const moreInfoSummary =
    moreInfoCount > 0
      ? `已填 ${moreInfoCount} 项`
      : "可选：人群、卖点和平台";

  const uploadCards = (
    <>
      <input
        ref={inputFileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleUploadInputAssets(event.target.files ?? undefined);
          event.currentTarget.value = "";
        }}
      />
      <div className="min-w-0">
        <button
          type="button"
          className={cn(
            "flex min-h-[112px] w-full items-center gap-3 rounded-[14px] border-[1.5px] border-dashed bg-surface p-3 text-left transition-all hover:border-brand hover:bg-brand-soft/40 md:min-h-[120px]",
            productAssets.length > 0 ? "border-brand/50 bg-brand-soft/25" : "border-line-strong"
          )}
          onClick={() => inputFileRef.current?.click()}
          disabled={isUploadingAsset}
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand md:h-14 md:w-14">
            <ImagePlus className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink">
              {productAssets.length > 0 ? "继续添加商品图" : "添加商品图"}
            </span>
            <span className="mt-1 inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-ink-2">
              已选 {productAssets.length} 张
            </span>
          </span>
          <Plus className="h-5 w-5 shrink-0 text-brand" />
        </button>

        {productAssets.length > 0 && (
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {productAssets.map((asset, index) => (
              <div
                key={asset.assetId}
                className="group relative w-[104px] shrink-0 overflow-hidden rounded-[12px] border border-line bg-surface md:w-auto"
              >
                <div className="aspect-square bg-surface-muted">
                  <AssetPreviewImage
                    asset={asset}
                    className="h-full w-full object-contain"
                    fallbackClassName="h-full w-full"
                  />
                </div>
                <button
                  type="button"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-2 shadow-soft transition-colors hover:text-destructive"
                  onClick={() => removeProductAsset(asset.assetId)}
                  aria-label={`移除第 ${index + 1} 张商品图`}
                  title="移除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="border-t border-line px-2 py-1.5">
                  <p className="truncate text-[11px] font-semibold text-ink">
                    {index + 1}. {getCompactFilename(asset.originalFilename)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={referenceFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void handleUploadReferenceAsset(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        className={cn(
          "flex min-h-[112px] items-center gap-3 rounded-[14px] border-[1.5px] border-dashed bg-surface p-3 text-left transition-all hover:border-brand hover:bg-brand-soft/40 md:min-h-[120px]",
          workflowData.referenceAsset ? "border-brand/40 bg-surface-muted/70" : "border-line-strong"
        )}
        onClick={() => referenceFileRef.current?.click()}
        disabled={isUploadingAsset}
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-surface-muted md:h-20 md:w-20">
          <AssetPreviewImage
            asset={workflowData.referenceAsset}
            className="h-full w-full object-cover"
            fallbackClassName="h-10 w-10"
            fallbackPose="sleep"
          />
        </span>
        <div className="min-w-0">
          <p className="max-w-full truncate text-[14px] font-semibold text-ink">
            {workflowData.referenceAsset?.originalFilename ?? "上传场景参考图"}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-ink-3">单张参考</p>
        </div>
      </button>
    </>
  );

  const productTypePicker = (
    <>
      <div className="md:hidden">
        <HorizontalPillScroller>
          {productTypes.map((type) => {
            const selected = workflowData.productType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setWorkflowData((prev) => ({ ...prev, productType: type.id }))}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                  selected
                    ? "border-transparent bg-accent-gradient text-white shadow-soft"
                    : "border-line-strong bg-surface text-ink-2"
                )}
              >
                {type.label}
              </button>
            );
          })}
        </HorizontalPillScroller>
      </div>
      <Select
        value={workflowData.productType}
        onValueChange={(value) =>
          setWorkflowData((prev) => ({ ...prev, productType: value }))
        }
      >
        <SelectTrigger className="hidden min-h-11 md:flex">
          <SelectValue placeholder="选择产品类型" />
        </SelectTrigger>
        <SelectContent>
          {productTypes.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  const platformPicker = (
    <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] md:flex-wrap [&::-webkit-scrollbar]:hidden">
      {platforms.map((platform) => {
        const selected = workflowData.platforms.includes(platform.id);
        return (
          <button
            key={platform.id}
            type="button"
            onClick={() => {
              setWorkflowData((prev) => ({
                ...prev,
                platforms: selected
                  ? prev.platforms.filter((p) => p !== platform.id)
                  : [...prev.platforms, platform.id],
              }));
            }}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-data transition-colors",
              selected
                ? "border-brand bg-brand-soft text-brand-text"
                : "border-line-strong text-ink-2 hover:border-brand/40 hover:text-ink"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors",
                selected ? "border-brand bg-brand text-white" : "border-line-strong"
              )}
            >
              {selected && <CheckCircle2 className="h-3 w-3" />}
            </span>
            {platform.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto px-4 pb-4 pt-2 md:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5">
          {workflowData.activePresetName && (
            <section className="glass-panel rounded-[20px] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="processing">已载入模板</Badge>
                  <h2 className="mt-3 text-body font-semibold text-ink">
                    {workflowData.activePresetName}
                  </h2>
                  {workflowData.activePresetDescription && (
                    <p className="mt-1 text-data text-ink-2">
                      {workflowData.activePresetDescription}
                    </p>
                  )}
                </div>
                <div className="hidden text-right text-caption text-ink-3 sm:block">
                  <p>模型：{workflowData.aiModel}</p>
                  <p>尺寸：{workflowData.outputResolution}</p>
                  <p>候选：{workflowData.candidateCount} 张</p>
                </div>
              </div>
            </section>
          )}

          <section className="glass-panel rounded-[20px] p-4 md:rounded-[24px] md:p-[20px_22px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-ink">素材上传</h2>
                <p className="mt-1 hidden text-[13px] text-ink-2 sm:block">
                  先放商品图，参考图用于背景、构图和氛围。
                </p>
              </div>
              {isUploadingAsset && (
                <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[12px] font-semibold text-ink-2">
                  上传中
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:mt-3.5 md:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.85fr)] md:gap-3.5">
              {uploadCards}
            </div>
            <p className="mt-3 hidden text-[12px] text-ink-3 sm:block">
              支持 PNG、JPG；素材会先登记为 input asset，任务只携带轻量引用。
            </p>
          </section>

          <section className="glass-panel rounded-[20px] p-4 md:rounded-[24px] md:p-[20px_22px]">
            <h2 className="text-base font-bold text-ink">基础描述</h2>
            <p className="mt-1 hidden text-[13px] text-ink-2 sm:block">
              名称、品类和场景就够继续。
            </p>
            <div className="mt-3.5 grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>产品名称</Label>
                <Input
                  placeholder="例如：某某品牌保湿面霜"
                  value={workflowData.productName}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, productName: e.target.value }))
                  }
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>产品类型</Label>
                {productTypePicker}
              </div>
              <div className="space-y-2 sm:col-span-2 md:col-span-1">
                <Label>使用场景</Label>
                <Input
                  placeholder="例如：清晨浴室台面自然光"
                  value={workflowData.usageScene}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, usageScene: e.target.value }))
                  }
                  className="min-h-11"
                />
              </div>
              <div className="hidden space-y-2 md:block">
                <Label>目标人群</Label>
                <Input
                  placeholder="例如：25-35 岁女性"
                  value={workflowData.targetAudience}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, targetAudience: e.target.value }))
                  }
                  className="min-h-11"
                />
              </div>
            </div>
            <div className="mt-3 hidden space-y-1.5 md:block">
              <Label className="text-[13px] font-semibold text-ink-2">核心卖点</Label>
              <Textarea
                placeholder="请列出产品的核心卖点……"
                rows={2}
                value={workflowData.sellingPoints}
                onChange={(e) =>
                  setWorkflowData((prev) => ({ ...prev, sellingPoints: e.target.value }))
                }
                className="min-h-[96px] resize-none rounded-[12px]"
              />
            </div>
          </section>

          <MobileCollapsibleSection title="更多产品信息" summary={moreInfoSummary}>
            <div className="space-y-2">
              <Label>目标人群</Label>
              <Input
                placeholder="例如：25-35 岁女性"
                value={workflowData.targetAudience}
                onChange={(e) =>
                  setWorkflowData((prev) => ({ ...prev, targetAudience: e.target.value }))
                }
                className="min-h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-ink-2">核心卖点</Label>
              <Textarea
                placeholder="补充 1-3 个卖点即可"
                rows={2}
                value={workflowData.sellingPoints}
                onChange={(e) =>
                  setWorkflowData((prev) => ({ ...prev, sellingPoints: e.target.value }))
                }
                className="min-h-[88px] resize-none rounded-[12px]"
              />
            </div>
            <div className="space-y-2">
              <Label>使用平台</Label>
              {platformPicker}
            </div>
          </MobileCollapsibleSection>

          <section className="hidden glass-panel rounded-[20px] p-5 md:block md:rounded-[24px] md:p-[20px_22px]">
            <h2 className="text-base font-bold text-ink">使用平台</h2>
            <div className="mt-3.5">{platformPicker}</div>
          </section>
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" asChild className="hidden min-h-11 text-ink-2 hover:bg-surface-muted sm:inline-flex">
          <Link href="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            返回首页
          </Link>
        </Button>
        <Button
          onClick={onNext}
          className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 sm:flex-none"
        >
          <span className="sm:hidden">继续选风格</span>
          <span className="hidden sm:inline">下一步：选择风格模板</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StyleTemplateStep({
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
  const templates = [
    workflowData.selectedPresetId && workflowData.activePresetName
      ? {
          id: workflowData.selectedPresetId,
          name: workflowData.activePresetName,
          desc: workflowData.activePresetDescription ?? "来自模板库的场景预设",
          icon: ShoppingBag,
        }
      : null,
    { id: "elegant", name: "简约自然", desc: "适合美妆护肤", icon: ShoppingBag },
    { id: "lifestyle", name: "生活场景", desc: "适合家居日用", icon: ShoppingBag },
    { id: "minimal", name: "极简商务", desc: "适合3C数码", icon: ShoppingBag },
    { id: "warm", name: "温馨居家", desc: "适合母婴用品", icon: ShoppingBag },
    { id: "fresh", name: "清新自然", desc: "适合食品饮料", icon: ShoppingBag },
    { id: "luxury", name: "奢华高端", desc: "适合珠宝配饰", icon: ShoppingBag },
    { id: "tech", name: "科技感", desc: "适合数码产品", icon: ShoppingBag },
    { id: "festival", name: "节日氛围", desc: "适合节日促销", icon: ShoppingBag },
  ].filter((template): template is { id: string; name: string; desc: string; icon: typeof ShoppingBag } => Boolean(template));

  const selected = workflowData.selectedTemplates;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
		      <div className="flex-1 overflow-auto px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5 md:gap-5">
		          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-ink md:text-[22px]">AI 生成预览</h2>
              <p className="mt-1 hidden text-[14px] text-ink-2 sm:block">
                基于已提交的商品信息，选择想要的风格方向
              </p>
            </div>
	            <span className="inline-flex min-h-10 w-fit items-center rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-brand-text">
              已选 {selected.length} 张
            </span>
          </div>

	          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {templates.map((template) => {
              const isSelected = selected.includes(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (isSelected) {
                      setWorkflowData((prev) => ({
                        ...prev,
                        selectedTemplates: prev.selectedTemplates.filter(
                          (s) => s !== template.id
                        ),
                      }));
                    } else {
                      setWorkflowData((prev) => ({
                        ...prev,
                        selectedTemplates: [...prev.selectedTemplates, template.id],
                      }));
                    }
                  }}
                  className={cn(
	                    "glass-panel relative flex flex-col items-start rounded-[16px] p-3 text-left transition-all hover:-translate-y-0.5 md:rounded-[20px] md:p-3.5",
                    isSelected ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""
                  )}
                >
                  <div
	                    className="relative mb-3 flex h-[92px] w-full items-center justify-center rounded-[13px] md:h-[104px]"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, var(--surface-2), var(--surface-2) 9px, transparent 9px, transparent 18px)",
                    }}
                  >
                    <template.icon className="h-[30px] w-[30px] text-brand opacity-85" />
                    {isSelected && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-gradient">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="text-[14px] font-semibold text-ink">{template.name}</div>
                  <p className="mt-1 hidden text-[12px] text-ink-3 sm:block">{template.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" onClick={onBack} className="min-h-11 shrink-0 px-3 text-ink-2 hover:bg-surface-muted sm:w-auto sm:px-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="sm:hidden">返回</span>
          <span className="hidden sm:inline">返回修改信息</span>
        </Button>
        <Button
          onClick={onNext}
          disabled={selected.length === 0}
          className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-5 text-[15px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:flex-none sm:px-6"
        >
          <span className="sm:hidden">继续生成</span>
          <span className="hidden sm:inline">下一步：生成并调整</span>
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function GenerateAdjustStep({
  onBack,
  workflowData,
  setWorkflowData,
}: {
  onBack: () => void;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<SceneCandidateResult[]>([]);
  const { toast } = useToast();
  const { tasks: polledTasks, isPolling, startPolling, error: pollingError } = useWorkflowTaskPolling({
    interval: 3000,
    autoStart: false,
  });

  useEffect(() => {
    if (polledTasks.length === 0) return;
    setResults((prev) =>
      prev.map((result) => {
        if (!result.taskId) return result;
        const task = polledTasks.find((item) => item.id === result.taskId);
        if (!task) return result;
        return {
          ...result,
          status: task.status,
          progress: task.progress,
          currentStep: task.currentStep,
          resultImageUrl: task.resultImageUrl,
          errorMessage: task.errorMessage ? mapProviderErrorMessage(task.errorMessage) : undefined,
          usedModel: task.usedModel,
        };
      })
    );
  }, [polledTasks]);

  const completedCount = results.filter((result) => result.status === "completed").length;
  const failedCount = results.filter((result) => result.status === "failed" || result.status === "cancelled").length;
  const activeCount = results.filter((result) => !isTerminalCandidateStatus(result.status)).length;
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const sceneModels = getSceneGenerationModels();
  const productAssets = getProductAssets(workflowData);
  const expectedTaskCount = productAssets.length * Math.max(1, workflowData.candidateCount || 1);
  const selectedModelLabel =
    sceneModels.find((model) => model.id === workflowData.aiModel)?.label ?? workflowData.aiModel;
  const advancedSettingsSummary = `${selectedModelLabel} / ${getOptionLabel(outputResolutionOptions, workflowData.outputResolution)} / ${workflowData.candidateCount} 张/商品`;
  const advancedSettingsControls = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="space-y-1.5">
        <Label className="text-caption text-muted-foreground">AI 模型</Label>
        <div className="md:hidden">
          <HorizontalPillScroller>
            {sceneModels.map((model) => {
              const selected = workflowData.aiModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setWorkflowData((prev) => ({ ...prev, aiModel: model.id }))}
                  className={cn(
                    "min-h-11 max-w-[220px] shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                    selected
                      ? "border-transparent bg-accent-gradient text-white shadow-soft"
                      : "border-line-strong bg-surface text-ink-2"
                  )}
                >
                  <span className="block truncate">{model.label}</span>
                </button>
              );
            })}
          </HorizontalPillScroller>
        </div>
        <Select
          value={workflowData.aiModel}
          onValueChange={(value) =>
            setWorkflowData((prev) => ({ ...prev, aiModel: value }))
          }
        >
          <SelectTrigger className="hidden min-h-11 text-data md:flex">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent>
            {sceneModels.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
                {m.priority === "primary" && (
                  <span className="ml-1.5 text-[10px] text-green-600">推荐</span>
                )}
                {m.priority === "fallback" && (
                  <span className="ml-1.5 text-[10px] text-amber-600">兜底</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-caption text-muted-foreground">输出尺寸</Label>
        <div className="md:hidden">
          <HorizontalPillScroller>
            {outputResolutionOptions.map((option) => {
              const selected = workflowData.outputResolution === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setWorkflowData((prev) => ({ ...prev, outputResolution: option.id }))}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors",
                    selected
                      ? "border-transparent bg-accent-gradient text-white shadow-soft"
                      : "border-line-strong bg-surface text-ink-2"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </HorizontalPillScroller>
        </div>
        <Select
          value={workflowData.outputResolution}
          onValueChange={(value) =>
            setWorkflowData((prev) => ({ ...prev, outputResolution: value }))
          }
        >
          <SelectTrigger className="hidden min-h-11 text-data md:flex">
            <SelectValue placeholder="选择尺寸" />
          </SelectTrigger>
          <SelectContent>
            {outputResolutionOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-caption text-muted-foreground">候选数量</Label>
        <div className="md:hidden">
          <HorizontalPillScroller>
            {candidateCountOptions.map((count) => {
              const selected = workflowData.candidateCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => setWorkflowData((prev) => ({ ...prev, candidateCount: count }))}
                  className={cn(
                    "min-h-11 shrink-0 rounded-full border px-4 text-[13px] font-semibold transition-colors",
                    selected
                      ? "border-transparent bg-accent-gradient text-white shadow-soft"
                      : "border-line-strong bg-surface text-ink-2"
                  )}
                >
                  {count} 张
                </button>
              );
            })}
          </HorizontalPillScroller>
        </div>
        <Select
          value={String(workflowData.candidateCount)}
          onValueChange={(value) =>
            setWorkflowData((prev) => ({
              ...prev,
              candidateCount: Number(value),
            }))
          }
        >
          <SelectTrigger className="hidden min-h-11 text-data md:flex">
            <SelectValue placeholder="选择数量" />
          </SelectTrigger>
          <SelectContent>
            {candidateCountOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>{n} 张</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const handleSaveResult = async (result: SceneCandidateResult) => {
    if (result.status !== "completed" || !result.resultImageUrl) {
      toast({
        title: "暂时不能保存",
        description: "只有已完成且有结果图的候选可以保存。",
        variant: "destructive",
      });
      return;
    }

    if (result.savedImageId) {
      toast({
        title: "结果已保存",
        description: "这个候选已经在结果管理中。",
      });
      return;
    }

    setSavingCandidateId(result.id);
    try {
      const originalUrl = result.sourceAsset?.clientUrl ?? workflowData.inputAsset?.clientUrl ?? result.resultImageUrl;
      const response = await apiPost<{
        success: boolean;
        image: { id: string };
      }>("/api/images", {
        filename: `${workflowData.productName || "场景图"}-${result.name}.png`,
        originalUrl,
        processedUrl: result.resultImageUrl,
        thumbnailUrl: result.resultImageUrl,
        processType: "BACKGROUND_REMOVAL",
        status: "COMPLETED",
        metadata: JSON.stringify({
          workflowType: "scene_generation",
          taskId: result.taskId,
          candidateId: result.id,
          sourceAssetId: result.sourceAsset?.assetId,
          sourceAssetName: result.sourceAsset?.originalFilename,
          sourceIndex: result.sourceIndex,
          candidateIndex: result.candidateIndex,
          selectedPresetId: workflowData.selectedPresetId,
          presetName: workflowData.activePresetName,
          productName: workflowData.productName,
          productType: workflowData.productType,
          targetAudience: workflowData.targetAudience,
          usageScene: workflowData.usageScene,
          sellingPoints: workflowData.sellingPoints,
          platforms: workflowData.platforms,
          selectedTemplates: workflowData.selectedTemplates,
          aiModel: workflowData.aiModel,
          usedModel: result.usedModel,
          outputResolution: workflowData.outputResolution,
          savedAt: new Date().toISOString(),
        }),
      });

      setResults((prev) =>
        prev.map((item) =>
          item.id === result.id ? { ...item, savedImageId: response.image.id } : item
        )
      );
      toast({
        title: "已保存到结果管理",
        description: "可以在结果管理中查看和下载这张场景图。",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSavingCandidateId(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const candidateCount = Math.max(1, workflowData.candidateCount || 1);
      const taskRequests = buildSceneLegacyTaskRequests({
        productInfo: {
          name: workflowData.productName,
          category: workflowData.productType,
          description: workflowData.targetAudience,
          targetPlatform: mapSelectionToTargetPlatform(workflowData.platforms[0]),
          stylePreference: workflowData.stylePreference || workflowData.usageScene,
        },
        inputAssets: [...productAssets, workflowData.referenceAsset].filter(
          (asset): asset is InputAssetRef => Boolean(asset)
        ),
        inputAsset: productAssets[0],
        productAssets,
        referenceAsset: workflowData.referenceAsset,
        selectedPresetId: workflowData.selectedPresetId,
        styleTemplateIds: workflowData.selectedTemplates,
        stylePreference: workflowData.stylePreference || workflowData.usageScene,
        sellingPoints: workflowData.sellingPoints,
        batchMode: workflowData.batchMode,
        parameters: {
          aiModel: workflowData.aiModel,
          outputResolution: workflowData.outputResolution,
          candidateCount,
        },
      });

      const response = await apiPost<{
        success: boolean;
        tasks?: Array<{ id: string }>;
        task?: { id: string };
      }>("/api/tasks", taskRequests.length === 1 ? taskRequests[0] : taskRequests);

      const tasks = response.tasks ?? (response.task ? [response.task] : []);
      const createdTaskIds = tasks.map((task) => task.id);
      setResults(
        tasks.map((task, index) => {
          const sourceIndex = Math.floor(index / candidateCount);
          const candidateIndex = (index % candidateCount) + 1;
          const sourceAsset = productAssets[sourceIndex] ?? productAssets[0];
          const sourceName = getCompactFilename(sourceAsset?.originalFilename);
          return {
          id: task.id,
          taskId: task.id,
          name: productAssets.length > 1
            ? `${sourceName} · 候选 ${candidateIndex}`
            : `${workflowData.activePresetName ?? "场景图"}候选 ${candidateIndex}`,
          sourceAsset,
          sourceIndex: sourceIndex + 1,
          candidateIndex,
          status: "queued",
          progress: 0,
          };
        })
      );
      if (createdTaskIds.length > 0) {
        startPolling(createdTaskIds);
      }
      toast({
        title: "生成任务已创建",
        description: `已创建 ${tasks.length} 个场景图任务，可在任务中心查看进度。`,
      });
    } catch (error) {
      toast({
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "请检查素材和模型配置后重试",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
	      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 md:py-12">
              <BrandEmptyState
                pose="think"
                title="准备生成"
                description=""
                className="w-full max-w-xl border-0 bg-transparent py-4 md:py-8"
              />

              <div className="mb-4 w-full max-w-xl md:mb-6">
                <MobileCollapsibleSection title="高级生成设置" summary={advancedSettingsSummary}>
                  {advancedSettingsControls}
                </MobileCollapsibleSection>
                <div className="hidden md:block">
                  {advancedSettingsControls}
                </div>
              </div>
              <div className="mb-4 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2">
                {productAssets.length > 0
                  ? `${productAssets.length} 张商品图 · 将创建 ${expectedTaskCount} 个任务`
                  : "请先上传商品图"}
              </div>
              <Button
	                onClick={handleGenerate}
	                disabled={generating || productAssets.length === 0 || !workflowData.referenceAsset}
	                variant="brand"
	                className="min-h-11 px-6"
	              >
                <Wand2 className="w-4 h-4 mr-2" />
                开始生成
              </Button>
            </div>
          ) : (
            <>
	              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-h3 font-semibold text-foreground">
                    生成结果
                  </h2>
                  <p className="hidden text-data text-muted-foreground mt-1 sm:block">
                    {generating
                      ? "正在创建任务，请稍候..."
                      : isPolling || activeCount > 0
                        ? `正在跟踪 ${activeCount} 个候选任务，已完成 ${completedCount} 个，失败 ${failedCount} 个`
                        : `候选任务已结束，已完成 ${completedCount} 个，失败 ${failedCount} 个`}
                  </p>
                  {pollingError && (
                    <p className="text-caption text-destructive mt-1">
                      状态刷新失败：{pollingError}
                    </p>
                  )}
                </div>
                {!generating && (
	                  <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={handleGenerate}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                {results.map((result) => (
                  <div key={result.id} className="flex flex-col rounded-xl border border-border overflow-hidden">
                    <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                      {result.resultImageUrl ? (
                        <img src={result.resultImageUrl} alt={result.name} className="h-full w-full object-cover" />
                      ) : result.status === "processing" ? (
                        <div className="flex flex-col items-center gap-3 text-ink-2">
                          <ConicSpinner size={56} />
                          <span className="text-[13px] font-semibold text-brand-text">
                            {Math.max(0, result.progress)}%
                          </span>
                        </div>
                      ) : result.status === "failed" || result.status === "cancelled" ? (
                        <div className="px-4 text-center text-caption text-destructive">
                          {result.errorMessage ?? "任务处理失败"}
                        </div>
                      ) : (
                        <BrandImageFallback
                          title={result.name}
                          description={getCandidateStatusLabel(result.status)}
                          pose={result.status === "queued" || result.status === "pending" ? "think" : "sleep"}
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="min-w-0 truncate text-data font-medium text-foreground">
                          {result.name}
                        </h3>
                        <Badge variant={getCandidateStatusVariant(result.status)}>
                          {getCandidateStatusLabel(result.status)}
                        </Badge>
                      </div>
                      {result.sourceAsset && productAssets.length > 1 && (
                        <p className="mt-1 truncate text-[11px] font-semibold text-brand-text">
                          商品 {result.sourceIndex}/{productAssets.length}
                        </p>
                      )}
                      {result.currentStep && (
                        <p className="mt-1 hidden line-clamp-2 text-caption text-muted-foreground sm:block">
                          {result.currentStep}
                        </p>
                      )}
                      {result.taskId && (
                        <p className="mt-1 hidden truncate text-caption text-muted-foreground sm:block">
                          任务 ID：{result.taskId}
                        </p>
                      )}
                      {(result.status === "completed" || result.status === "failed") && result.usedModel && (
                        <p className="mt-1 hidden truncate text-[11px] text-muted-foreground/70 sm:block">
                          模型：{result.usedModel}
                        </p>
                      )}
                      {result.savedImageId && (
                        <p className="mt-1 truncate text-[11px] text-green-600">
                          已保存到结果管理
                        </p>
                      )}
                      {result.status === "processing" && (
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, result.progress))}%` }}
                          />
                        </div>
                      )}
	                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
	                        <Button size="sm" variant="outline" className="min-h-10 flex-1" asChild>
                          <Link href="/tasks">查看任务</Link>
                        </Button>
                        {result.savedImageId ? (
	                          <Button size="sm" variant="brand" className="min-h-10 flex-1" asChild>
                            <Link href="/results">查看结果</Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="brand"
                            className="min-h-10 flex-1"
                            onClick={() => handleSaveResult(result)}
                            disabled={
                              result.status !== "completed"
                              || !result.resultImageUrl
                              || savingCandidateId === result.id
                            }
                          >
                            {savingCandidateId === result.id ? "保存中..." : "保存结果"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="z-30 flex shrink-0 items-center gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 sm:justify-between sm:px-6">
        <Button variant="ghost" onClick={onBack} className="min-h-11 shrink-0 px-3 text-ink-2 hover:bg-surface-muted sm:w-auto sm:px-4">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          <span className="sm:hidden">返回</span>
          <span className="hidden sm:inline">返回预览</span>
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

function SceneWorkspacePageInner() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("preset") ?? undefined;
  const activePreset = useMemo(
    () => (presetId ? getPresetById(presetId) : undefined),
    [presetId]
  );
  const [step, setStep] = useState<Step>(1);
  const [workflowData, setWorkflowData] = useState<WorkflowData>(() =>
    createWorkflowDataFromPreset(activePreset)
  );

  return (
    <div className="h-full flex flex-col bg-background">
      <StepBar currentStep={step} />
      {step === 1 && (
        <ProductInfoStep
          onNext={() => setStep(2)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
      {step === 2 && (
        <StyleTemplateStep
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
      {step === 3 && (
        <GenerateAdjustStep
          onBack={() => setStep(2)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
    </div>
  );
}

export default function SceneWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <SceneWorkspacePageInner />
    </Suspense>
  );
}
