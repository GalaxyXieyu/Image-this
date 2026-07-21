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
import { SceneAdvancedSettings } from "@/components/scene/scene-product-forms";

export function SceneResultsView({
  gen,
  workflowData,
  setWorkflowData,
  selectedTemplate,
  productAssets,
  expectedTaskCount,
  showSetup = true,
}: {
  gen: UseSceneGenerationResult;
  workflowData: WorkflowData;
  setWorkflowData: React.Dispatch<React.SetStateAction<WorkflowData>>;
  selectedTemplate?: SceneStyleTemplate;
  productAssets: InputAssetRef[];
  expectedTaskCount: number;
  /** false 时空态只做预览占位（设置与生成按钮由外部承接，用于桌面双栏右栏） */
  showSetup?: boolean;
}) {
  return (
    <div className="space-y-6">
      {gen.results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 md:py-12">
          {selectedTemplate && (
            <div className="mb-3 flex w-full max-w-xl items-center gap-3 rounded-[18px] border border-line bg-surface p-2.5 shadow-soft">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[14px] bg-surface-muted">
                <img src={selectedTemplate.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-ink">{selectedTemplate.name}</p>
                <p className="mt-1 truncate text-[12px] font-semibold text-ink-3">
                  {productAssets.length} 张商品图 · 每张 {Math.max(1, workflowData.candidateCount || 1)} 张
                </p>
              </div>
            </div>
          )}
          <BrandEmptyState
            pose="think"
            title="准备生成"
            description=""
            className="w-full max-w-xl border-0 bg-transparent py-4 md:py-8"
          />

          {showSetup ? (
            <>
              <div className="mb-4 w-full max-w-xl md:mb-6">
                <MobileCollapsibleSection
                  title="高级生成设置"
                  summary={`${(getSceneGenerationModels().find((m) => m.id === workflowData.aiModel)?.label ?? workflowData.aiModel)} / ${getOptionLabel(outputResolutionOptions, workflowData.outputResolution)} / ${workflowData.candidateCount} 张/商品`}
                >
                  <SceneAdvancedSettings workflowData={workflowData} setWorkflowData={setWorkflowData} />
                </MobileCollapsibleSection>
                <div className="hidden md:block">
                  <SceneAdvancedSettings workflowData={workflowData} setWorkflowData={setWorkflowData} />
                </div>
              </div>
              <div className="mb-4 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2">
                {productAssets.length > 0
                  ? `${productAssets.length} 张商品图 · 每张 ${Math.max(1, workflowData.candidateCount || 1)} 张 · 共 ${expectedTaskCount} 个任务`
                  : "请先上传商品图"}
              </div>
              <Button
                onClick={gen.handleGenerate}
                disabled={gen.generating || productAssets.length === 0}
                variant="brand"
                className="min-h-11 px-6"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                开始生成
              </Button>
            </>
          ) : (
            <p className="max-w-xl text-center text-[13px] text-ink-3">
              在左侧选择背景模板、上传商品图并设置好参数后，点「开始生成」，结果会显示在这里。
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-h3 font-semibold text-foreground">
                生成结果
              </h2>
              <p className="hidden text-data text-muted-foreground mt-1 sm:block">
                {gen.generating
                  ? "正在创建任务，请稍候..."
                  : gen.isPolling || gen.activeCount > 0
                    ? `正在跟踪 ${gen.activeCount} 个候选任务，已完成 ${gen.completedCount} 个，失败 ${gen.failedCount} 个`
                    : `候选任务已结束，已完成 ${gen.completedCount} 个，失败 ${gen.failedCount} 个`}
              </p>
              {gen.pollingError && (
                <p className="text-caption text-destructive mt-1">
                  状态刷新失败：{gen.pollingError}
                </p>
              )}
            </div>
            {!gen.generating && (
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={gen.handleGenerate}>
                <Wand2 className="w-4 h-4 mr-2" />
                重新生成
              </Button>
            )}
          </div>

          <div className="space-y-4 md:space-y-5">
            {groupResultsBySource(gen.results).map((group) => {
              const groupTitle = group.sourceAsset
                ? getCompactFilename(group.sourceAsset.originalFilename)
                : "商品图";
              const groupCompletedCount = group.items.filter((item) => item.status === "completed").length;
              return (
                <section key={group.key} className="rounded-[18px] border border-border bg-surface p-3 md:rounded-[22px] md:p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[12px] border border-line bg-surface-muted">
                        <AssetPreviewImage
                          asset={group.sourceAsset}
                          className="h-full w-full object-contain"
                          fallbackClassName="h-full w-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[14px] font-bold text-ink">{groupTitle}</h3>
                        <p className="text-[12px] font-semibold text-ink-3">
                          {groupCompletedCount}/{group.items.length} 已完成
                        </p>
                      </div>
                    </div>
                    {group.sourceIndex && productAssets.length > 1 && (
                      <Badge variant="secondary">商品 {group.sourceIndex}</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                    {group.items.map((result) => (
                      <div key={result.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
                        <div className="flex aspect-square items-center justify-center overflow-hidden bg-muted">
                          {result.resultImageUrl ? (
                            <img src={result.resultImageUrl} alt={result.name} className="h-full w-full object-cover" />
                          ) : result.status === "processing" ? (
                            <div className="flex flex-col items-center gap-3 text-ink-2">
                              <ConicSpinner size={48} />
                              <span className="text-[13px] font-semibold text-brand-text">
                                {Math.max(0, result.progress)}%
                              </span>
                            </div>
                          ) : result.status === "failed" || result.status === "cancelled" ? (
                            <div className="px-3 text-center text-[12px] text-destructive">
                              {result.errorMessage ?? "任务处理失败"}
                            </div>
                          ) : (
                            <BrandImageFallback
                              title={`候选 ${result.candidateIndex ?? ""}`}
                              description={getCandidateStatusLabel(result.status)}
                              pose={result.status === "queued" || result.status === "pending" ? "think" : "sleep"}
                              className="[&_p]:hidden"
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                              候选 {result.candidateIndex ?? 1}
                            </h4>
                            <Badge variant={getCandidateStatusVariant(result.status)}>
                              {getCandidateStatusLabel(result.status)}
                            </Badge>
                          </div>
                          {result.currentStep && (
                            <p className="mt-1 hidden line-clamp-2 text-caption text-muted-foreground sm:block">
                              {result.currentStep}
                            </p>
                          )}
                          {(result.status === "completed" || result.status === "failed") && result.usedModel && (
                            <p className="mt-1 hidden truncate text-[11px] text-muted-foreground/70 sm:block">
                              模型：{result.usedModel}
                            </p>
                          )}
                          {result.savedImageId && (
                            <p className="mt-1 truncate text-[11px] text-green-600">
                              已保存
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
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {result.savedImageId ? (
                              <Button size="sm" variant="brand" className="min-h-10 w-full" asChild>
                                <Link href="/results">查看结果</Link>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="brand"
                                className="min-h-10 w-full"
                                onClick={() => gen.handleSaveResult(result)}
                                disabled={
                                  result.status !== "completed"
                                  || !result.resultImageUrl
                                  || gen.savingCandidateId === result.id
                                }
                              >
                                {gen.savingCandidateId === result.id ? "保存中..." : "保存"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function groupResultsBySource(results: SceneCandidateResult[]) {
  const groups: Array<{
    key: string;
    sourceAsset?: InputAssetRef;
    sourceIndex?: number;
    items: SceneCandidateResult[];
  }> = [];

  results.forEach((result) => {
    const key = result.sourceAsset?.assetId ?? `source-${result.sourceIndex ?? 0}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = {
        key,
        sourceAsset: result.sourceAsset,
        sourceIndex: result.sourceIndex,
        items: [],
      };
      groups.push(group);
    }
    group.items.push(result);
  });

  return groups;
}

