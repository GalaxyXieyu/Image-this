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

import { AssetPreviewImage } from "@/components/scene/scene-preview-bits";

export function SceneProductForm({
  workflowData,
  setWorkflowData,
  dense = false,
}: {
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
  /** 桌面窄栏内使用：强制单列，避免 sm:/md: 栅格在 440px 容器里撑破 */
  dense?: boolean;
}) {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUpload();
  const [uploadingProductAssets, setUploadingProductAssets] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const productAssets = getProductAssets(workflowData);
  const isUploadingAsset = uploading || uploadingProductAssets;
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

  const removeReferenceAsset = () => {
    setWorkflowData((prev) => ({
      ...prev,
      referenceAsset: undefined,
    }));
  };

  const moreInfoCount = [
    workflowData.targetAudience,
    workflowData.sellingPoints,
  ].filter(Boolean).length;
  const moreInfoSummary =
    moreInfoCount > 0
      ? `已填 ${moreInfoCount} 项`
      : "可选：人群和卖点";

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
          <div className={cn(
            "-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:overflow-visible md:px-0",
            dense ? "md:grid-cols-3" : "md:grid-cols-5"
          )}>
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
            {workflowData.referenceAsset?.originalFilename ?? "场景参考图（可选）"}
          </p>
          <p className="mt-1 text-[12px] font-semibold text-ink-3">
            {workflowData.referenceAsset ? "已添加参考" : "不传也可以生成"}
          </p>
        </div>
        {workflowData.referenceAsset && (
          <span
            role="button"
            tabIndex={0}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90 text-ink-2 shadow-soft transition-colors hover:text-destructive"
            onClick={(event) => {
              event.stopPropagation();
              removeReferenceAsset();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                removeReferenceAsset();
              }
            }}
            aria-label="移除参考图"
            title="移除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    </>
  );

  const productTypePicker = (
    <>
      {isMobile && (
        <BottomSheetSelect
          title="选择产品类型"
          options={productTypes}
          value={workflowData.productType}
          onChange={(value) => {
            if (typeof value === "string") {
              setWorkflowData((prev) => ({ ...prev, productType: value }));
            }
          }}
          trigger={
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-line-strong bg-surface px-3.5 text-left text-[14px] text-ink"
            >
              <span className={cn("truncate", !workflowData.productType && "text-ink-3")}>
                {workflowData.productType
                  ? getOptionLabel(productTypes, workflowData.productType)
                  : "选择产品类型"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
            </button>
          }
        />
      )}
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

  return (
    <div className="space-y-3.5 md:space-y-3.5">
      {selectedTemplate && (
        <section className="glass-panel overflow-hidden rounded-[18px] p-2.5 md:rounded-[20px] md:p-3">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-surface-muted md:h-20 md:w-20">
              <img
                src={selectedTemplate.image}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="processing" className="hidden md:inline-flex">已选风格</Badge>
                <h2 className="truncate text-[14px] font-bold text-ink md:text-body">
                  {selectedTemplate.name}
                </h2>
              </div>
              <p className="mt-1 line-clamp-1 text-[12px] text-ink-3 md:line-clamp-2 md:text-data">
                {selectedTemplate.desc}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="glass-panel rounded-[20px] p-4 md:rounded-[24px] md:p-[20px_22px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">素材上传</h2>
          </div>
          {isUploadingAsset && (
            <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-[12px] font-semibold text-ink-2">
              上传中
            </span>
          )}
        </div>
        <div className={cn(
          "mt-3 grid grid-cols-1 gap-3",
          !dense && "md:mt-3.5 md:grid-cols-[minmax(0,1.45fr)_minmax(240px,0.85fr)] md:gap-3.5"
        )}>
          {uploadCards}
        </div>
      </section>

      <section className="glass-panel rounded-[20px] p-4 md:rounded-[24px] md:p-[20px_22px]">
        <h2 className="text-base font-bold text-ink">基础描述</h2>
        <div className={cn(
          "mt-3.5 grid grid-cols-1 gap-x-3.5 gap-y-3",
          !dense && "sm:grid-cols-2"
        )}>
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
            <Label>补充场景</Label>
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
      </MobileCollapsibleSection>
    </div>
  );
}

export function SceneAdvancedSettings({
  workflowData,
  setWorkflowData,
}: {
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
}) {
  const isMobile = useIsMobile();
  const sceneModels = getSceneGenerationModels();
  const selectedModelLabel =
    sceneModels.find((model) => model.id === workflowData.aiModel)?.label ?? workflowData.aiModel;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <div className="space-y-1.5">
        <Label className="text-caption text-muted-foreground">AI 模型</Label>
        {isMobile && (
          <BottomSheetSelect
            title="选择 AI 模型"
            options={sceneModels.map((model) => ({
              id: model.id,
              label: model.label,
              description:
                model.priority === "primary"
                  ? "推荐"
                  : model.priority === "fallback"
                    ? "兜底"
                    : undefined,
            }))}
            value={workflowData.aiModel}
            onChange={(value) => {
              if (typeof value === "string") {
                setWorkflowData((prev) => ({ ...prev, aiModel: value }));
              }
            }}
            trigger={
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-line-strong bg-surface px-3.5 text-left text-[14px] text-ink"
              >
                <span className="truncate">{selectedModelLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
              </button>
            }
          />
        )}
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
        {isMobile && (
          <BottomSheetSelect
            title="选择输出尺寸"
            options={outputResolutionOptions}
            value={workflowData.outputResolution}
            onChange={(value) => {
              if (typeof value === "string") {
                setWorkflowData((prev) => ({ ...prev, outputResolution: value }));
              }
            }}
            trigger={
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-line-strong bg-surface px-3.5 text-left text-[14px] text-ink"
              >
                <span className="truncate">
                  {getOptionLabel(outputResolutionOptions, workflowData.outputResolution)}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
              </button>
            }
          />
        )}
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
        {isMobile && (
          <BottomSheetSelect
            title="选择候选数量"
            options={candidateCountOptions.map((count) => ({
              id: String(count),
              label: `${count} 张`,
            }))}
            value={String(workflowData.candidateCount)}
            onChange={(value) => {
              if (typeof value === "string") {
                setWorkflowData((prev) => ({ ...prev, candidateCount: Number(value) }));
              }
            }}
            trigger={
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-line-strong bg-surface px-3.5 text-left text-[14px] text-ink"
              >
                <span className="truncate">{workflowData.candidateCount} 张</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
              </button>
            }
          />
        )}
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
}

