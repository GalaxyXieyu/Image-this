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
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";
import { BrandEmptyState } from "@/components/brands/SpriteImage";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { useIsMobile } from "@/lib/use-is-mobile";
import { getPresetById } from "@/lib/workbench/presets";
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

const SUPPORTED_TOOLS: Array<{ id: ToolType; label: string; description: string; icon: typeof Wand2 }> = [
  { id: "background_replace", label: "AI换背景", description: "生成电商场景或白底背景", icon: Wand2 },
  { id: "watermark", label: "加水印", description: "添加文字或 Logo 水印", icon: Droplets },
  { id: "upscale", label: "高清放大", description: "提升图片清晰度和尺寸", icon: ZoomIn },
  { id: "outpaint", label: "智能扩图", description: "向外延展画面边界", icon: Expand },
];

const WATERMARK_POSITION_OPTIONS: Array<{ id: WatermarkParams["watermarkPosition"]; label: string }> = [
  { id: "bottom-right", label: "右下" },
  { id: "bottom-left", label: "左下" },
  { id: "top-right", label: "右上" },
  { id: "top-left", label: "左上" },
  { id: "center", label: "居中" },
];

const WATERMARK_POSITION_LABELS: Record<WatermarkParams["watermarkPosition"], string> = WATERMARK_POSITION_OPTIONS.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.label }),
  {} as Record<WatermarkParams["watermarkPosition"], string>
);

/** 移动端 BottomSheetSelect 统一触发器，复用设计 token，桌面端不使用。 */
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
    return `${params.watermarkType === "logo" ? "Logo" : "文字"} / ${params.watermarkPosition}`;
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
  const [draft, setDraft] = useState<ToolDraftState>(() => createInitialDraft(presetId, toolParam));
  const appliedSyncRef = useRef<{ preset?: string; tool?: string }>({ preset: presetId, tool: toolParam });
  const [runState, setRunState] = useState<ToolRunState>(EMPTY_RUN_STATE);
  const [creatingTask, setCreatingTask] = useState(false);
  const [paramDrawerOpen, setParamDrawerOpen] = useState(false);
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
  }, [presetId, toolParam]);

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
  }, [runState.taskId, tasks]);

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

  const resultPreviewUrl = runState.resultImageUrl ?? draft.inputAssets[0]?.clientUrl;
  const isBusy = creatingTask || uploading || isPolling || runState.status === "processing" || runState.status === "pending" || runState.status === "queued";
  const taskActions = (
    <>
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

  return (
    <div className="h-full flex flex-col bg-background">

      <div className="shrink-0 border-b border-line px-4 py-2.5 sm:px-6 md:flex md:flex-row md:items-center md:justify-between md:py-4">
        <div className="hidden md:block">
          <h1 className="text-[24px] font-semibold leading-tight text-ink md:text-h3">单点工具箱</h1>
          <p className="mt-0.5 text-data text-ink-2">
            上传商品素材，选择工具能力，创建可追踪的 AI 处理任务
          </p>
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

            <section className="hidden md:block">
              <h3 className="mb-3 text-data font-semibold text-ink">工具参数</h3>
              <ToolParameterPanel
                draft={draft}
                updateParameters={updateParameters}
                referenceInputRef={referenceInputRef}
                logoInputRef={logoInputRef}
                onUploadAsset={handleUploadAsset}
              />
            </section>
            <button
              type="button"
              onClick={() => setParamDrawerOpen(true)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[12px] border border-line-strong bg-surface px-3.5 py-2.5 text-left text-[14px] text-ink transition-colors hover:border-brand md:hidden"
            >
              <div className="min-w-0">
                <div className="text-[14px] font-bold text-ink">工具参数</div>
                <div className="mt-0.5 truncate text-[12px] text-ink-3">{getToolParameterSummary(draft)}</div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
            </button>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center md:overflow-auto bg-surface-muted/40 p-4 pb-3 md:p-8">
          {!resultPreviewUrl ? (
            <BrandEmptyState
              pose="think"
              title="请先上传图片"
              description=""
              className="glass-panel w-full max-w-[360px] rounded-[20px] px-5"
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
        </main>

        <aside className="flex md:w-[340px] md:shrink-0 flex-col md:overflow-y-auto border-t md:border-t-0 md:border-l border-line bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
          <div className="p-5 space-y-6">
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-data font-semibold text-foreground">
                  任务与结果
                </h3>
                <Badge variant="secondary" className={getStatusClassName(runState.status)}>
                  {getStatusLabel(runState.status)}
                </Badge>
              </div>
              <p className="hidden text-caption text-muted-foreground mt-2 md:block">
                当前工具：{selectedTool.label}。{selectedTool.description}
              </p>

              {runState.taskId && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="hidden text-caption text-muted-foreground truncate md:block">任务 ID：{runState.taskId}</p>
                  {runState.currentStep && <p className="hidden text-caption text-muted-foreground md:block">{runState.currentStep}</p>}
                  {(runState.status === "processing" || runState.status === "pending" || runState.status === "queued") && (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(0, Math.min(100, runState.progress))}%` }} />
                    </div>
                  )}
                  {runState.usedModel && <p className="hidden text-[11px] text-muted-foreground/70 md:block">模型：{runState.usedModel}</p>}
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
            </section>

            <div className="hidden pt-2 space-y-3 md:block">{taskActions}</div>
          </div>
        </aside>
      </div>
      <div className="z-30 grid shrink-0 grid-cols-2 gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 md:hidden">
        {taskActions}
      </div>

      {/* 移动端：工具参数抽屉 */}
      <DrawerRoot open={paramDrawerOpen} onOpenChange={setParamDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>工具参数</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <ToolParameterPanel
              draft={draft}
              updateParameters={updateParameters}
              referenceInputRef={referenceInputRef}
              logoInputRef={logoInputRef}
              onUploadAsset={handleUploadAsset}
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button
                className="h-12 w-full rounded-full bg-accent-gradient text-[14px] font-semibold text-white"
                onClick={() => setParamDrawerOpen(false)}
              >
                完成
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </DrawerRoot>
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
          {isMobile ? (
            <BottomSheetSelect
              title="水印类型"
              options={[
                { id: "text", label: "文字" },
                { id: "logo", label: "Logo" },
              ]}
              value={params.watermarkType}
              onChange={(value) => {
                if (typeof value === "string") {
                  updateParameters({ watermarkType: value as WatermarkParams["watermarkType"] } as Partial<WatermarkParams>);
                }
              }}
              trigger={<SheetTrigger label={params.watermarkType === "logo" ? "Logo" : "文字"} />}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(["text", "logo"] as WatermarkParams["watermarkType"][]).map((type) => (
                <button
                  key={type}
	                className={cn("min-h-11 rounded-lg border px-3 py-2 text-data", params.watermarkType === type ? "border-primary bg-primary/5 text-primary" : "border-border")}
                  onClick={() => updateParameters({ watermarkType: type } as Partial<WatermarkParams>)}
                >
                  {type === "text" ? "文字" : "Logo"}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>水印文字</Label>
          <Input className="min-h-11" value={params.watermarkText} onChange={(event) => updateParameters({ watermarkText: event.target.value } as Partial<WatermarkParams>)} />
        </div>
        <div className="space-y-2">
          <Label>透明度：{Math.round(params.watermarkOpacity * 100)}%</Label>
          <Slider value={[params.watermarkOpacity * 100]} min={5} max={100} step={5} onValueChange={([value]) => updateParameters({ watermarkOpacity: value / 100 } as Partial<WatermarkParams>)} />
        </div>
        <div className="space-y-2">
          <Label>水印位置</Label>
          {isMobile ? (
            <BottomSheetSelect
              title="水印位置"
              options={WATERMARK_POSITION_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
              value={params.watermarkPosition}
              onChange={(value) => {
                if (typeof value === "string") {
                  updateParameters({ watermarkPosition: value as WatermarkParams["watermarkPosition"] } as Partial<WatermarkParams>);
                }
              }}
              trigger={<SheetTrigger label={WATERMARK_POSITION_LABELS[params.watermarkPosition] ?? params.watermarkPosition} />}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(["bottom-right", "bottom-left", "top-right", "top-left", "center"] as WatermarkParams["watermarkPosition"][]).map((position) => (
                <button
                  key={position}
	                className={cn("min-h-11 rounded-lg border px-3 py-2 text-caption", params.watermarkPosition === position ? "border-primary bg-primary/5 text-primary" : "border-border")}
                  onClick={() => updateParameters({ watermarkPosition: position } as Partial<WatermarkParams>)}
                >
                  {position}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label>输出尺寸</Label>
          <Input className="min-h-11" value={params.outputResolution} onChange={(event) => updateParameters({ outputResolution: event.target.value } as Partial<WatermarkParams>)} placeholder="1024x1024" />
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadAsset({ role: "logo", file: event.target.files?.[0] })} />
        <Button variant="outline" size="sm" className="min-h-11 w-full" onClick={() => logoInputRef.current?.click()}>
          上传 Logo 水印（可选）
        </Button>
        <InlineAssetPreview asset={draft.watermarkLogoAsset} label="Logo 水印" />
        {draft.watermarkLogoAsset && (
          <p className="hidden text-caption text-muted-foreground truncate md:block">
            Logo：{draft.watermarkLogoAsset.originalFilename}
          </p>
        )}
      </div>
    );
  }

  if (draft.toolType === "upscale") {
    const params = draft.parameters as UpscaleParams;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>放大倍数</Label>
          {isMobile ? (
            <BottomSheetSelect
              title="放大倍数"
              options={[2, 4, 8].map((factor) => ({ id: String(factor), label: `${factor}x` }))}
              value={String(params.upscaleFactor)}
              onChange={(value) => {
                if (typeof value === "string") {
                  const factor = Number(value);
                  updateParameters({ upscaleFactor: factor, outputResolution: `${factor}x` } as Partial<UpscaleParams>);
                }
              }}
              trigger={<SheetTrigger label={`${params.upscaleFactor}x`} />}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[2, 4, 8].map((factor) => (
                <button
                  key={factor}
	                className={cn("min-h-11 rounded-lg border px-3 py-2 text-data", params.upscaleFactor === factor ? "border-primary bg-primary/5 text-primary" : "border-border")}
                  onClick={() => updateParameters({ upscaleFactor: factor, outputResolution: `${factor}x` } as Partial<UpscaleParams>)}
                >
                  {factor}x
                </button>
              ))}
            </div>
          )}
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
