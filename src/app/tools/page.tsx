"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { hasEnabledImageModel } from "@/lib/ensure-model";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";
import { BrandEmptyState } from "@/components/brands/SpriteImage";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { useIsMobile } from "@/lib/use-is-mobile";
import { getPresetById } from "@/lib/workbench/presets";
import { usePageDraft } from "@/lib/use-page-draft";
import {
  buildDefaultToolParameters,
  buildToolLegacyTaskRequest,
  normalizePresetToolType,
  TOOL_TYPE_LABELS,
} from "@/lib/workbench/tool-task-adapter";
import type {
  BackgroundReplaceParams,
  InputAssetRef,
  OutpaintParams,
  ToolParameters,
  ToolType,
  UpscaleParams,
  WatermarkParams,
  WatermarkPreset,
  WatermarkFreePosition,
  WorkflowTaskSummary,
} from "@/types/workbench";
import {
  Wand2,
  Expand,
  ZoomIn,
  Upload,
  Download,
  Sparkles,
  Loader2,
  Droplets,
  ListTodo,
  AlertCircle,
  ChevronDown,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import {
  WATERMARK_POSITION_LABELS,
  WATERMARK_POSITION_OPTIONS,
  WatermarkDragEditor,
} from "@/components/tools/watermark-editor";

const SUPPORTED_TOOLS: Array<{ id: ToolType; label: string; description: string; icon: typeof Wand2 }> = [
  { id: "background_replace", label: "AI换背景", description: "生成电商场景或白底背景", icon: Wand2 },
  { id: "watermark", label: "加水印", description: "添加文字或 Logo 水印", icon: Droplets },
  { id: "upscale", label: "高清放大", description: "提升图片清晰度和尺寸", icon: ZoomIn },
  { id: "outpaint", label: "智能扩图", description: "向外延展画面边界", icon: Expand },
];

function SheetTrigger({ label, icon: Icon }: { label: string; icon?: typeof Wand2 }) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-2 rounded-[12px] border border-line-strong bg-surface px-3.5 text-left text-[14px] text-ink transition-colors hover:border-brand"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 text-brand" />}
      <span className="flex-1 truncate font-medium">{label}</span>
      <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
    </button>
  );
}

type ToolTaskStatus = "idle" | "queued" | WorkflowTaskSummary["status"];

interface ToolDraftState {
  toolType: ToolType;
  inputAssets: InputAssetRef[];
  referenceAsset?: InputAssetRef;
  watermarkLogoAsset?: InputAssetRef;
  parameters: ToolParameters;
  selectedPresetId?: string;
  activePresetName?: string;
  activePresetDescription?: string;
}

interface ToolRunState {
  taskId?: string;
  status: ToolTaskStatus;
  progress: number;
  currentStep?: string;
  resultImageUrl?: string | null;
  errorMessage?: string;
  usedModel?: string | null;
  processedImageId?: string;
}

const EMPTY_RUN_STATE: ToolRunState = {
  status: "idle",
  progress: 0,
};

function getStatusLabel(status: ToolTaskStatus) {
  const labels: Record<ToolTaskStatus, string> = {
    idle: "未开始",
    queued: "已入队",
    pending: "等待中",
    processing: "处理中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return labels[status];
}

function getStatusClassName(status: ToolTaskStatus) {
  if (status === "completed") return "bg-green-50 text-green-600 border-green-200";
  if (status === "failed" || status === "cancelled") return "bg-red-50 text-red-600 border-red-200";
  if (status === "processing") return "bg-[#DBEAFE] text-primary border-[#BFDBFE]";
  if (status === "queued" || status === "pending") return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-muted text-muted-foreground";
}

function createInitialDraft(presetId?: string, toolParam?: string): ToolDraftState {
  const preset = presetId ? getPresetById(presetId) : undefined;
  if (preset?.type === "tool") {
    const toolType = normalizePresetToolType(preset.toolType ?? (preset.params as { toolType?: string }).toolType);
    const presetParams = (preset.params as { parameters?: Partial<ToolParameters> }).parameters;

    // Extract asset references from preset params if present
    const presetReferenceAsset = (presetParams as BackgroundReplaceParams | undefined)?.referenceAsset;
    const presetWatermarkLogoAsset = (presetParams as WatermarkParams | undefined)?.watermarkLogoAsset;

    return {
      toolType,
      parameters: {
        ...buildDefaultToolParameters(toolType),
        ...presetParams,
      } as ToolParameters,
      inputAssets: [],
      selectedPresetId: preset.id,
      activePresetName: preset.name,
      activePresetDescription: preset.description,
      referenceAsset: presetReferenceAsset,
      watermarkLogoAsset: presetWatermarkLogoAsset,
    };
  }

  // If no preset but tool param is provided, initialize that tool
  if (toolParam) {
    const toolType = normalizePresetToolType(toolParam);
    return {
      toolType,
      parameters: buildDefaultToolParameters(toolType),
      inputAssets: [],
    };
  }

  return {
    toolType: "background_replace",
    parameters: buildDefaultToolParameters("background_replace"),
    inputAssets: [],
  };
}

function getResultUrl(task?: WorkflowTaskSummary) {
  return task?.resultImageUrl ?? null;
}

function downloadImage(url?: string | null) {
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = `tool-result-${Date.now()}.png`;
  a.click();
}

function getToolParameterSummary(draft: ToolDraftState) {
  if (draft.toolType === "watermark") {
    const params = draft.parameters as WatermarkParams;
    const posLabel = typeof params.watermarkPosition === "string"
      ? WATERMARK_POSITION_LABELS[params.watermarkPosition] ?? params.watermarkPosition
      : "自定义位置";
    return `${params.watermarkType === "logo" ? "Logo" : "文字"} / ${posLabel}`;
  }

  if (draft.toolType === "upscale") {
    const params = draft.parameters as UpscaleParams;
    return `${params.upscaleFactor}x / ${params.outputResolution}`;
  }

  if (draft.toolType === "outpaint") {
    const params = draft.parameters as OutpaintParams;
    return `${params.xScale.toFixed(1)}x · ${params.yScale.toFixed(1)}x`;
  }

  const params = draft.parameters as BackgroundReplaceParams;
  return `${params.aiModel || "默认模型"} / ${params.outputResolution}`;
}

function ToolMobileDisclosure({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-[16px] border border-line bg-surface md:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-[14px] font-bold text-ink">{title}</div>
          <div className="mt-0.5 truncate text-[12px] text-ink-3">{summary}</div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 px-3.5 pb-4 pt-1">{children}</div>
    </details>
  );
}

function InlineAssetPreview({ asset, label }: { asset?: InputAssetRef; label: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [asset?.clientUrl]);

  if (!asset) return null;

  return (
    <div className="flex min-h-12 items-center gap-2 rounded-[12px] border border-line bg-surface-muted/60 p-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface">
        {asset.clientUrl && !failed ? (
          <img
            src={asset.clientUrl}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-ink-3" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-ink">{label}</p>
        <p className="truncate text-[11px] text-ink-3">{asset.originalFilename}</p>
      </div>
    </div>
  );
}

function ToolboxPageInner() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("preset") ?? undefined;
  const toolParam = searchParams.get("tool") ?? undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUpload();
  const { toast } = useToast();
  const [draft, setDraft] = usePageDraft<ToolDraftState>("workbench.tools.draft", () =>
    createInitialDraft(presetId, toolParam)
  );
  const appliedSyncRef = useRef<{ preset?: string; tool?: string }>({ preset: presetId, tool: toolParam });
  const [runState, setRunState] = usePageDraft<ToolRunState>("workbench.tools.runState", EMPTY_RUN_STATE);
  const [creatingTask, setCreatingTask] = useState(false);
  const { tasks, isPolling, startPolling, error: pollingError } = useWorkflowTaskPolling({
    interval: 3000,
    autoStart: false,
  });

  const selectedTool = useMemo(
    () => SUPPORTED_TOOLS.find((tool) => tool.id === draft.toolType) ?? SUPPORTED_TOOLS[0],
    [draft.toolType]
  );

  useEffect(() => {
    if (appliedSyncRef.current.preset === presetId && appliedSyncRef.current.tool === toolParam) return;
    appliedSyncRef.current = { preset: presetId, tool: toolParam };
    setDraft((prev) => {
      const initialized = createInitialDraft(presetId, toolParam);
      return {
        ...initialized,
        inputAssets: prev.inputAssets,
        referenceAsset: prev.referenceAsset ?? initialized.referenceAsset,
        watermarkLogoAsset: prev.watermarkLogoAsset ?? initialized.watermarkLogoAsset,
      };
    });
    setRunState(EMPTY_RUN_STATE);
  }, [presetId, toolParam, setDraft, setRunState]);

  useEffect(() => {
    if (!runState.taskId) return;
    if (runState.status !== "queued" && runState.status !== "pending" && runState.status !== "processing") {
      return;
    }
    startPolling([runState.taskId]);
  }, [runState.taskId, runState.status, startPolling]);

  useEffect(() => {
    if (!runState.taskId || tasks.length === 0) return;
    const task = tasks.find((item) => item.id === runState.taskId);
    if (!task) return;
    setRunState({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      currentStep: task.currentStep,
      resultImageUrl: getResultUrl(task),
      errorMessage: task.errorMessage ? mapProviderErrorMessage(task.errorMessage) : undefined,
      usedModel: task.usedModel,
      processedImageId: task.processedImageId,
    });
  }, [runState.taskId, tasks, setRunState]);

  const updateToolType = (toolType: ToolType) => {
    setDraft((prev) => ({
      ...prev,
      toolType,
      parameters: buildDefaultToolParameters(toolType),
      selectedPresetId: undefined,
      activePresetName: undefined,
      activePresetDescription: undefined,
    }));
    setRunState(EMPTY_RUN_STATE);
  };

  const updateParameters = (patch: Partial<ToolParameters>) => {
    setDraft((prev) => ({
      ...prev,
      parameters: { ...prev.parameters, ...patch } as ToolParameters,
    }));
  };

  const handleUploadAsset = async ({ role, file }: { role: "reference" | "logo"; file?: File }) => {
    if (!file) return;
    try {
      const result = await upload(role === "reference" ? { reference: file } : { watermarkLogo: file });
      const asset = role === "reference" ? result.referenceAsset : result.watermarkLogoAsset;
      if (!asset) return;
      setDraft((prev) => ({
        ...prev,
        referenceAsset: role === "reference" ? asset : prev.referenceAsset,
        watermarkLogoAsset: role === "logo" ? asset : prev.watermarkLogoAsset,
      }));
      setRunState(EMPTY_RUN_STATE);
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请重新选择图片",
        variant: "destructive",
      });
    }
  };

  // 多张商品图上传：上传多张即批量处理，无需开关
  const handleUploadInputAssets = async (files?: FileList | File[]) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    try {
      const uploaded: InputAssetRef[] = [];
      for (const file of selectedFiles) {
        const result = await upload({ input: file });
        if (result.inputAsset) uploaded.push(result.inputAsset);
      }
      if (uploaded.length === 0) return;
      setDraft((prev) => ({ ...prev, inputAssets: [...prev.inputAssets, ...uploaded] }));
      setRunState(EMPTY_RUN_STATE);
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请重新选择图片",
        variant: "destructive",
      });
    }
  };

  const removeInputAsset = (assetId: string) => {
    setDraft((prev) => ({ ...prev, inputAssets: prev.inputAssets.filter((a) => a.assetId !== assetId) }));
    setRunState(EMPTY_RUN_STATE);
  };

  const handleCreateTask = async () => {
    if (draft.inputAssets.length === 0) {
      toast({ title: "请先上传图片", description: "工具任务至少需要一张输入图片。", variant: "destructive" });
      return;
    }
    if (!(await hasEnabledImageModel())) {
      toast({ title: "还没有配置模型 Key", description: "请先到「设置 → AI 模型配置」配置并启用模型后再生成，否则任务无法运行。", variant: "destructive" });
      return;
    }

    const isBatch = draft.inputAssets.length > 1;
    setCreatingTask(true);
    try {
      const requests = draft.inputAssets.map((inputAsset) =>
        buildToolLegacyTaskRequest({
          toolType: draft.toolType,
          inputAsset,
          referenceAsset: draft.referenceAsset,
          watermarkLogoAsset: draft.watermarkLogoAsset,
          parameters: draft.parameters,
          selectedPresetId: draft.selectedPresetId,
          batchMode: isBatch,
        })
      );

      if (isBatch) {
        // 多图即批量：一次创建多个任务，跳转任务中心查看进度
        await apiPost("/api/tasks", requests);
        toast({
          title: "批量任务已创建",
          description: `${TOOL_TYPE_LABELS[draft.toolType]} 已为 ${requests.length} 张图片入队。`,
        });
        window.location.href = "/tasks";
        return;
      }

      const response = await apiPost<{ success: boolean; task: { id: string } }>("/api/tasks", requests[0]);
      setRunState({
        taskId: response.task.id,
        status: "queued",
        progress: 0,
        currentStep: "任务已创建，等待处理",
      });
      startPolling([response.task.id]);
      toast({
        title: "工具任务已创建",
        description: `${TOOL_TYPE_LABELS[draft.toolType]} 已进入任务队列。`,
      });
    } catch (error) {
      toast({
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "请检查图片和参数后重试",
        variant: "destructive",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  // 加水印工具的输入预览已由左侧拖拽编辑器承担，主区不再重复显示原图（避免上下两个一样的预览），只显示处理结果
  const resultPreviewUrl = runState.resultImageUrl
    ?? (draft.toolType === "watermark" ? undefined : draft.inputAssets[0]?.clientUrl);
  const isBusy = creatingTask || uploading || isPolling || runState.status === "processing" || runState.status === "pending" || runState.status === "queued";
  const createBtn = (
    <Button
      variant="gradient"
      className="min-h-11 w-full"
      disabled={draft.inputAssets.length === 0 || creatingTask || uploading}
      onClick={handleCreateTask}
    >
      {creatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
      {creatingTask
        ? "创建中..."
        : draft.inputAssets.length > 1
          ? `批量处理 ${draft.inputAssets.length} 张`
          : "创建工具任务"}
    </Button>
  );
  const resultBtns = (
    <>
      <Button variant="outline" className="min-h-11 w-full" disabled={!runState.resultImageUrl} onClick={() => downloadImage(runState.resultImageUrl)}>
        <Download className="w-4 h-4 mr-2" />
        下载结果
      </Button>
      <Button variant="outline" className="hidden min-h-11 w-full md:inline-flex" asChild>
        <Link href="/tasks">
          <ListTodo className="w-4 h-4 mr-2" />
          查看任务中心
        </Link>
      </Button>
      <Button variant="outline" className="hidden min-h-11 w-full md:inline-flex" asChild>
        <Link href="/results">
          {runState.status === "completed" ? "查看结果管理" : "打开结果管理"}
        </Link>
      </Button>
    </>
  );
  const taskActions = (
    <>
      {createBtn}
      {resultBtns}
    </>
  );

  return (
    <div className="h-full flex flex-col bg-background">

      <div className="shrink-0 border-b border-line px-4 py-2.5 sm:px-6 md:flex md:flex-row md:items-center md:justify-between md:py-4">
        <div className="hidden md:block">
          {draft.activePresetName && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="bg-brand-soft text-brand-text">
                当前模板：{draft.activePresetName}
              </Badge>
              {draft.activePresetDescription && (
                <span className="text-caption text-ink-3">{draft.activePresetDescription}</span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 md:hidden">
          <BottomSheetSelect
            title="选择工具"
            options={SUPPORTED_TOOLS.map((tool) => ({
              id: tool.id,
              label: tool.label,
              description: tool.description,
              icon: tool.icon,
            }))}
            value={draft.toolType}
            onChange={(value) => {
              if (typeof value === "string") {
                updateToolType(value as ToolType);
              }
            }}
            trigger={<SheetTrigger label={selectedTool.label} icon={selectedTool.icon} />}
          />
          {draft.activePresetName && (
            <div className="flex min-h-9 items-center">
              <span className="min-w-0 truncate text-[12px] text-ink-3">
                模板：{draft.activePresetName}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        <aside className="flex md:w-[320px] md:shrink-0 flex-col md:overflow-y-auto border-b md:border-b-0 md:border-r border-line bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
          <div className="flex flex-col gap-3 p-4 md:gap-5 md:p-5">
            <section>
              <h3 className="mb-2 text-data font-semibold text-ink md:mb-3">输入素材</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  void handleUploadInputAssets(event.target.files ?? undefined);
                  event.currentTarget.value = "";
                }}
              />
              {draft.inputAssets.length === 0 ? (
                <button
                  type="button"
                  className="flex min-h-[104px] w-full items-center justify-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-line-strong bg-surface p-4 text-left transition-all hover:border-brand hover:bg-brand-soft/30 md:min-h-0 md:flex-col md:p-7 md:text-center"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <ConicSpinner size={42} showPulse={false} />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-brand-soft">
                      <Upload className="h-6 w-6 text-brand" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-data font-semibold text-ink">
                      {uploading ? "上传中…" : "点击上传图片"}
                    </span>
                    <span className="block text-[11px] text-ink-3">支持多张，上传多张即批量处理</span>
                  </span>
                </button>
              ) : (
                <div className="flex flex-col gap-2.5 md:gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    {draft.inputAssets.map((asset, index) => (
                      <div
                        key={asset.assetId}
                        className="group relative aspect-square overflow-hidden rounded-[12px] border border-line bg-surface-muted"
                      >
                        <img
                          src={asset.clientUrl}
                          alt={`输入图 ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeInputAsset(asset.assetId)}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-soft opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="移除"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="min-h-11 w-full text-ink-2" onClick={() => fileInputRef.current?.click()}>
                    {draft.inputAssets.length > 1 ? `已选 ${draft.inputAssets.length} 张 · 添加更多` : "添加更多"}
                  </Button>
                </div>
              )}
            </section>

            {/* 工具参数：桌面/移动都内联展示（水印等参数常用，不再收进抽屉） */}
            <section>
              <h3 className="mb-2 text-data font-semibold text-ink md:mb-3">工具参数</h3>
              <ToolParameterPanel
                draft={draft}
                updateParameters={updateParameters}
                referenceInputRef={referenceInputRef}
                logoInputRef={logoInputRef}
                onUploadAsset={handleUploadAsset}
              />
            </section>
          </div>
          {/* 桌面：左栏底部固定「创建任务」主 CTA */}
          <div className="sticky bottom-0 z-10 hidden border-t border-line bg-surface-glass/95 p-4 backdrop-blur-[12px] md:block">
            {createBtn}
          </div>
        </aside>

        {/* 桌面：右侧大预览 + 状态 + 结果操作（二列布局，合并原中间预览与右侧任务列） */}
        <main className="flex flex-1 flex-col bg-surface-muted/40 md:min-h-0">
          <div className="hidden items-center justify-between gap-2 border-b border-line bg-surface-glass px-6 py-2.5 md:flex">
            <p className="min-w-0 truncate text-[13px] text-ink-2">当前工具：{selectedTool.label}。{selectedTool.description}</p>
            <Badge variant="secondary" className={cn("shrink-0", getStatusClassName(runState.status))}>
              {getStatusLabel(runState.status)}
            </Badge>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-auto p-4 pb-3 md:p-8">
            {!resultPreviewUrl ? (
              <BrandEmptyState
                pose="think"
                title="预览 / 结果区"
                description="上传图片并创建任务后，输入预览与处理结果会显示在这里"
                className="w-full max-w-[360px] px-5"
              />
            ) : (
              <div className="glass-panel relative aspect-square w-full max-w-3xl overflow-hidden rounded-[24px]">
                <img src={resultPreviewUrl} alt={runState.resultImageUrl ? "处理结果" : "输入预览"} className="h-full w-full object-contain" />
                {isBusy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface/70 backdrop-blur-sm">
                    <ConicSpinner size={64} />
                    <span className="text-data font-semibold text-brand-text">
                      {runState.currentStep || "任务处理中…"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 桌面：任务信息 + 结果操作 */}
          <div className="hidden border-t border-line bg-surface-glass px-6 py-3 md:block">
            {runState.taskId && (
              <div className="mb-3 space-y-1.5">
                {runState.currentStep && <p className="text-caption text-muted-foreground">{runState.currentStep}</p>}
                {(runState.status === "processing" || runState.status === "pending" || runState.status === "queued") && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, runState.progress))}%` }} />
                  </div>
                )}
                {runState.usedModel && <p className="text-[11px] text-muted-foreground/70">模型：{runState.usedModel}</p>}
                {runState.errorMessage && (
                  <div className="flex items-start gap-2 text-caption text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{runState.errorMessage}</span>
                  </div>
                )}
                {pollingError && <p className="text-caption text-destructive">状态刷新失败：{pollingError}</p>}
                {runState.status === "completed" && runState.processedImageId && (
                  <p className="text-[11px] text-green-600">结果已保存到结果管理</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">{resultBtns}</div>
          </div>
        </main>
      </div>
      <div className="z-30 grid shrink-0 grid-cols-2 gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 md:hidden">
        {taskActions}
      </div>
    </div>
  );
}

type UpdateToolParameters = React.Dispatch<Partial<ToolParameters>>;
type UploadToolAsset = React.Dispatch<{ role: "reference" | "logo"; file?: File }>;

function ModelAndResolutionFields({
  aiModel,
  outputResolution,
  onChange,
}: {
  aiModel?: string;
  outputResolution?: string;
  onChange: (patch: { aiModel?: string; outputResolution?: string }) => void;
}) {
  return (
	    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>模型</Label>
        <Input className="min-h-11" value={aiModel ?? ""} onChange={(event) => onChange({ aiModel: event.target.value })} placeholder="volcengine / gemini" />
      </div>
      <div className="space-y-2">
        <Label>输出尺寸</Label>
        <Input className="min-h-11" value={outputResolution ?? ""} onChange={(event) => onChange({ outputResolution: event.target.value })} placeholder="1024x1024" />
      </div>
    </div>
  );
}

function ToolParameterPanel({
  draft,
  updateParameters,
  referenceInputRef,
  logoInputRef,
  onUploadAsset,
}: {
  draft: ToolDraftState;
  updateParameters: UpdateToolParameters;
  referenceInputRef: React.RefObject<HTMLInputElement | null>;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
  onUploadAsset: UploadToolAsset;
}) {
  const isMobile = useIsMobile();
  if (draft.toolType === "watermark") {
    const params = draft.parameters as WatermarkParams;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>水印类型</Label>
          {/* 文字/Logo 二选一，pill 切换（移动端也用 pill，不用下拉） */}
          <div className="grid grid-cols-2 gap-2">
            {(["text", "logo"] as WatermarkParams["watermarkType"][]).map((type) => (
              <button
                key={type}
                className={cn("min-h-11 rounded-lg border px-3 py-2 text-data transition-colors", params.watermarkType === type ? "border-primary bg-primary/5 text-primary" : "border-border")}
                onClick={() => updateParameters({ watermarkType: type } as Partial<WatermarkParams>)}
              >
                {type === "text" ? "文字" : "Logo"}
              </button>
            ))}
          </div>
        </div>
        {/* 文字水印 → 显示文字输入；Logo 水印 → 隐藏（改用下方上传） */}
        {params.watermarkType === "text" && (
          <div className="space-y-2">
            <Label>水印文字</Label>
            <Input className="min-h-11" value={params.watermarkText} onChange={(event) => updateParameters({ watermarkText: event.target.value } as Partial<WatermarkParams>)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>透明度：{Math.round(params.watermarkOpacity * 100)}%</Label>
          <Slider value={[params.watermarkOpacity * 100]} min={5} max={100} step={5} onValueChange={([value]) => updateParameters({ watermarkOpacity: value / 100 } as Partial<WatermarkParams>)} />
        </div>
        <div className="space-y-2">
          <Label>水印位置{typeof params.watermarkPosition === "object" ? "（已自定义拖放）" : ""}</Label>
          {/* 拖拽定位编辑器：有源图时显示，直接把水印拖到想要的位置 */}
          {draft.inputAssets[0]?.clientUrl && (
            <WatermarkDragEditor
              imageUrl={draft.inputAssets[0].clientUrl}
              logoUrl={params.watermarkType === "logo" ? draft.watermarkLogoAsset?.clientUrl : undefined}
              text={params.watermarkText}
              opacity={params.watermarkOpacity}
              position={params.watermarkPosition}
              onChange={(pos) => updateParameters({ watermarkPosition: pos } as Partial<WatermarkParams>)}
            />
          )}
          <Label className="text-caption text-muted-foreground">快捷定位</Label>
          {isMobile ? (
            <BottomSheetSelect
              title="快捷定位"
              options={WATERMARK_POSITION_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
              value={typeof params.watermarkPosition === "string" ? params.watermarkPosition : ""}
              onChange={(value) => {
                if (typeof value === "string" && value) {
                  updateParameters({ watermarkPosition: value as WatermarkParams["watermarkPosition"] } as Partial<WatermarkParams>);
                }
              }}
              trigger={<SheetTrigger label={typeof params.watermarkPosition === "string" ? (WATERMARK_POSITION_LABELS[params.watermarkPosition] ?? params.watermarkPosition) : "自定义位置"} />}
            />
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {WATERMARK_POSITION_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
	                className={cn("min-h-11 rounded-lg border px-2 py-2 text-caption", params.watermarkPosition === id ? "border-primary bg-primary/5 text-primary" : "border-border")}
                  onClick={() => updateParameters({ watermarkPosition: id } as Partial<WatermarkParams>)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>输出尺寸</Label>
          <Input className="min-h-11" value={params.outputResolution} onChange={(event) => updateParameters({ outputResolution: event.target.value } as Partial<WatermarkParams>)} placeholder="1024x1024" />
        </div>
        {/* Logo 水印 → 才显示上传（与文字二选一） */}
        {params.watermarkType === "logo" && (
          <>
            <input ref={logoInputRef} type="file" accept="image/png" className="hidden" onChange={(event) => onUploadAsset({ role: "logo", file: event.target.files?.[0] })} />
            <Button variant="outline" size="sm" className="min-h-11 w-full" onClick={() => logoInputRef.current?.click()}>
              {draft.watermarkLogoAsset ? "更换 PNG 水印" : "上传 PNG 水印"}
            </Button>
            <InlineAssetPreview asset={draft.watermarkLogoAsset} label="Logo 水印" />
          </>
        )}
      </div>
    );
  }

  if (draft.toolType === "upscale") {
    const params = draft.parameters as UpscaleParams;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>放大倍数</Label>
            <span className="text-data font-semibold text-primary">{params.upscaleFactor}×</span>
          </div>
          <Slider
            value={[params.upscaleFactor]}
            min={1.1}
            max={4}
            step={0.1}
            onValueChange={([v]) => {
              const f = Math.round(v * 10) / 10;
              updateParameters({ upscaleFactor: f, outputResolution: `${f}x` } as Partial<UpscaleParams>);
            }}
          />
          <div className="grid grid-cols-5 gap-2">
            {[1.2, 1.5, 2, 3, 4].map((factor) => (
              <button
                key={factor}
                type="button"
                className={cn("min-h-9 rounded-lg border text-[12px] font-medium", params.upscaleFactor === factor ? "border-primary bg-primary/5 text-primary" : "border-border")}
                onClick={() => updateParameters({ upscaleFactor: factor, outputResolution: `${factor}x` } as Partial<UpscaleParams>)}
              >
                {factor}×
              </button>
            ))}
          </div>
        </div>
        <ModelAndResolutionFields
          aiModel={params.aiModel}
          outputResolution={params.outputResolution}
          onChange={(patch) => updateParameters(patch as Partial<UpscaleParams>)}
        />
      </div>
    );
  }

  if (draft.toolType === "outpaint") {
    const params = draft.parameters as OutpaintParams;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>扩图提示词</Label>
          <Textarea className="min-h-[132px]" value={params.prompt} onChange={(event) => updateParameters({ prompt: event.target.value } as Partial<OutpaintParams>)} rows={4} />
        </div>
        <div className="space-y-2">
          <Label>横向扩展：{params.xScale.toFixed(1)}x</Label>
          <Slider value={[params.xScale]} min={1} max={3} step={0.1} onValueChange={([value]) => updateParameters({ xScale: value } as Partial<OutpaintParams>)} />
        </div>
        <div className="space-y-2">
          <Label>纵向扩展：{params.yScale.toFixed(1)}x</Label>
          <Slider value={[params.yScale]} min={1} max={3} step={0.1} onValueChange={([value]) => updateParameters({ yScale: value } as Partial<OutpaintParams>)} />
        </div>
        <ModelAndResolutionFields
          aiModel={params.aiModel}
          outputResolution={params.outputResolution}
          onChange={(patch) => updateParameters(patch as Partial<OutpaintParams>)}
        />
      </div>
    );
  }

  const params = draft.parameters as BackgroundReplaceParams;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>背景提示词</Label>
        <Textarea className="min-h-[132px]" value={params.prompt} onChange={(event) => updateParameters({ prompt: event.target.value } as Partial<BackgroundReplaceParams>)} rows={4} />
      </div>
      <ModelAndResolutionFields
        aiModel={params.aiModel}
        outputResolution={params.outputResolution}
        onChange={(patch) => updateParameters(patch as Partial<BackgroundReplaceParams>)}
      />
      <input ref={referenceInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadAsset({ role: "reference", file: event.target.files?.[0] })} />
      <Button variant="outline" size="sm" className="min-h-11 w-full" onClick={() => referenceInputRef.current?.click()}>
        上传参考背景（可选）
      </Button>
      <InlineAssetPreview asset={draft.referenceAsset} label="参考背景" />
      {draft.referenceAsset && (
        <p className="hidden text-caption text-muted-foreground truncate md:block">
          参考图：{draft.referenceAsset.originalFilename}
        </p>
      )}
    </div>
  );
}

export default function ToolboxPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <ToolboxPageInner />
    </Suspense>
  );
}
