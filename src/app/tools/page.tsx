"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";
import { BrandEmptyState, BrandLogo } from "@/components/brands/SpriteImage";
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
} from "lucide-react";

const SUPPORTED_TOOLS: Array<{ id: ToolType; label: string; description: string; icon: typeof Wand2 }> = [
  { id: "background_replace", label: "AI换背景", description: "生成电商场景或白底背景", icon: Wand2 },
  { id: "watermark", label: "加水印", description: "添加文字或 Logo 水印", icon: Droplets },
  { id: "upscale", label: "高清放大", description: "提升图片清晰度和尺寸", icon: ZoomIn },
  { id: "outpaint", label: "智能扩图", description: "向外延展画面边界", icon: Expand },
];

type ToolTaskStatus = "idle" | "queued" | WorkflowTaskSummary["status"];

interface ToolDraftState {
  toolType: ToolType;
  inputAsset?: InputAssetRef;
  referenceAsset?: InputAssetRef;
  watermarkLogoAsset?: InputAssetRef;
  parameters: ToolParameters;
  batchMode: boolean;
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

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <BrandLogo />
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/" className="text-data text-muted-foreground hover:text-foreground transition-colors">
          首页
        </Link>
        <Link href="/templates" className="text-data text-muted-foreground hover:text-foreground transition-colors">
          模板库
        </Link>
        <Link href="/tasks" className="text-data text-muted-foreground hover:text-foreground transition-colors">
          任务中心
        </Link>
        <Link href="/results" className="text-data text-muted-foreground hover:text-foreground transition-colors">
          结果管理
        </Link>
        <Link href="/settings" className="text-data text-muted-foreground hover:text-foreground transition-colors">
          设置
        </Link>
      </nav>
    </header>
  );
}

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
      batchMode: Boolean((preset.params as { batchMode?: boolean }).batchMode),
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
      batchMode: false,
    };
  }

  return {
    toolType: "background_replace",
    parameters: buildDefaultToolParameters("background_replace"),
    batchMode: false,
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
  const appliedPresetRef = useRef<string | undefined>(presetId);
  const [runState, setRunState] = useState<ToolRunState>(EMPTY_RUN_STATE);
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
    if (appliedPresetRef.current === presetId) return;
    appliedPresetRef.current = presetId;
    setDraft((prev) => {
      const initialized = createInitialDraft(presetId, toolParam);
      return {
        ...initialized,
        inputAsset: prev.inputAsset,
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

  const handleUploadAsset = async ({ role, file }: { role: "input" | "reference" | "logo"; file?: File }) => {
    if (!file) return;
    try {
      const result = await upload(
        role === "input"
          ? { input: file }
          : role === "reference"
            ? { reference: file }
            : { watermarkLogo: file }
      );
      const asset = role === "input" ? result.inputAsset : role === "reference" ? result.referenceAsset : result.watermarkLogoAsset;
      if (!asset) return;
      setDraft((prev) => ({
        ...prev,
        inputAsset: role === "input" ? asset : prev.inputAsset,
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

  const handleCreateTask = async () => {
    if (!draft.inputAsset) {
      toast({ title: "请先上传图片", description: "工具任务需要一张输入图片。", variant: "destructive" });
      return;
    }

    setCreatingTask(true);
    try {
      const request = buildToolLegacyTaskRequest({
        toolType: draft.toolType,
        inputAsset: draft.inputAsset,
        referenceAsset: draft.referenceAsset,
        watermarkLogoAsset: draft.watermarkLogoAsset,
        parameters: draft.parameters,
        selectedPresetId: draft.selectedPresetId,
        batchMode: draft.batchMode,
      });
      const response = await apiPost<{ success: boolean; task: { id: string } }>("/api/tasks", request);
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

  const resultPreviewUrl = runState.resultImageUrl ?? draft.inputAsset?.clientUrl;
  const isBusy = creatingTask || uploading || isPolling || runState.status === "processing" || runState.status === "pending" || runState.status === "queued";

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopNav />

      <div className="px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-h3 font-semibold text-foreground">
            统一智能工具箱
          </h1>
          <p className="text-data text-muted-foreground mt-0.5">
            上传商品素材，选择工具能力，创建可追踪的 AI 处理任务
          </p>
          {draft.activePresetName && (
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary">当前模板：{draft.activePresetName}</Badge>
              {draft.activePresetDescription && (
                <span className="text-caption text-muted-foreground">{draft.activePresetDescription}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-data text-muted-foreground">
            批量模式
          </Label>
          <Switch checked={draft.batchMode} onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, batchMode: checked }))} />
        </div>
      </div>

      <div className="px-8 border-b border-border shrink-0">
        <div className="flex gap-1">
          {SUPPORTED_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => updateToolType(tool.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-data font-medium transition-colors",
                draft.toolType === tool.id
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
             
            >
              <tool.icon className="w-4 h-4" />
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[320px] border-r border-border bg-muted/30 flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6">
            <section>
              <h3 className="text-data font-semibold text-foreground mb-3">
                输入素材
              </h3>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUploadAsset({ role: "input", file: event.target.files?.[0] })} />
              {!draft.inputAsset ? (
                <button
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-muted-foreground transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /> : <Upload className="w-8 h-8 text-muted-foreground" />}
                  <span className="text-data text-muted-foreground">
                    {uploading ? "上传中..." : "点击上传图片"}
                  </span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img src={draft.inputAsset.clientUrl} alt="输入图片" className="w-full h-full object-contain" />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    重新上传
                  </Button>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-data font-semibold text-foreground mb-3">
                工具参数
              </h3>
              <ToolParameterPanel
                draft={draft}
                updateParameters={updateParameters}
                referenceInputRef={referenceInputRef}
                logoInputRef={logoInputRef}
                onUploadAsset={handleUploadAsset}
              />
            </section>
          </div>
        </aside>

        <main className="flex-1 bg-muted flex items-center justify-center p-8 overflow-auto">
          {!resultPreviewUrl ? (
            <BrandEmptyState
              pose="think"
              title="请先上传图片"
              description="支持 JPG、PNG 格式，建议 1024×1024 以上。"
              className="min-w-[360px] border-white/70 bg-background/80 shadow-sm"
            />
          ) : (
            <div className="w-full max-w-3xl aspect-square bg-card rounded-xl border border-border overflow-hidden shadow-sm relative">
              <img src={resultPreviewUrl} alt={runState.resultImageUrl ? "处理结果" : "输入预览"} className="w-full h-full object-contain" />
              {isBusy && (
                <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-data text-muted-foreground">{runState.currentStep || "任务处理中..."}</span>
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="w-[340px] border-l border-border flex flex-col overflow-y-auto">
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
              <p className="text-caption text-muted-foreground mt-2">
                当前工具：{selectedTool.label}。{selectedTool.description}
              </p>

              {runState.taskId && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <p className="text-caption text-muted-foreground truncate">任务 ID：{runState.taskId}</p>
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
            </section>

            <div className="pt-2 space-y-3">
              <Button
                variant="gradient"
                className="w-full"
                disabled={!draft.inputAsset || creatingTask || uploading}
                onClick={handleCreateTask}
               
              >
                {creatingTask ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {creatingTask ? "创建任务中..." : "创建工具任务"}
              </Button>
              <Button variant="outline" className="w-full" disabled={!runState.resultImageUrl} onClick={() => downloadImage(runState.resultImageUrl)}>
                <Download className="w-4 h-4 mr-2" />
                下载结果
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/tasks">
                  <ListTodo className="w-4 h-4 mr-2" />
                  查看任务中心
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/results">
                  {runState.status === "completed" ? "查看结果管理" : "打开结果管理"}
                </Link>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

type UpdateToolParameters = React.Dispatch<Partial<ToolParameters>>;
type UploadToolAsset = React.Dispatch<{ role: "input" | "reference" | "logo"; file?: File }>;

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
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>模型</Label>
        <Input value={aiModel ?? ""} onChange={(event) => onChange({ aiModel: event.target.value })} placeholder="volcengine / gemini" />
      </div>
      <div className="space-y-2">
        <Label>输出尺寸</Label>
        <Input value={outputResolution ?? ""} onChange={(event) => onChange({ outputResolution: event.target.value })} placeholder="1024x1024" />
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
  if (draft.toolType === "watermark") {
    const params = draft.parameters as WatermarkParams;
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>水印类型</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["text", "logo"] as WatermarkParams["watermarkType"][]).map((type) => (
              <button
                key={type}
                className={cn("rounded-lg border px-3 py-2 text-data", params.watermarkType === type ? "border-primary bg-primary/5 text-primary" : "border-border")}
                onClick={() => updateParameters({ watermarkType: type } as Partial<WatermarkParams>)}
              >
                {type === "text" ? "文字" : "Logo"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>水印文字</Label>
          <Input value={params.watermarkText} onChange={(event) => updateParameters({ watermarkText: event.target.value } as Partial<WatermarkParams>)} />
        </div>
        <div className="space-y-2">
          <Label>透明度：{Math.round(params.watermarkOpacity * 100)}%</Label>
          <Slider value={[params.watermarkOpacity * 100]} min={5} max={100} step={5} onValueChange={([value]) => updateParameters({ watermarkOpacity: value / 100 } as Partial<WatermarkParams>)} />
        </div>
        <div className="space-y-2">
          <Label>水印位置</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["bottom-right", "bottom-left", "top-right", "top-left", "center"] as WatermarkParams["watermarkPosition"][]).map((position) => (
              <button
                key={position}
                className={cn("rounded-lg border px-3 py-2 text-caption", params.watermarkPosition === position ? "border-primary bg-primary/5 text-primary" : "border-border")}
                onClick={() => updateParameters({ watermarkPosition: position } as Partial<WatermarkParams>)}
              >
                {position}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>输出尺寸</Label>
          <Input value={params.outputResolution} onChange={(event) => updateParameters({ outputResolution: event.target.value } as Partial<WatermarkParams>)} placeholder="1024x1024" />
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadAsset({ role: "logo", file: event.target.files?.[0] })} />
        <Button variant="outline" size="sm" className="w-full" onClick={() => logoInputRef.current?.click()}>
          上传 Logo 水印（可选）
        </Button>
        {draft.watermarkLogoAsset && (
          <p className="text-caption text-muted-foreground truncate">
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
          <div className="grid grid-cols-3 gap-2">
            {[2, 4, 8].map((factor) => (
              <button
                key={factor}
                className={cn("rounded-lg border px-3 py-2 text-data", params.upscaleFactor === factor ? "border-primary bg-primary/5 text-primary" : "border-border")}
                onClick={() => updateParameters({ upscaleFactor: factor, outputResolution: `${factor}x` } as Partial<UpscaleParams>)}
              >
                {factor}x
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
          <Textarea value={params.prompt} onChange={(event) => updateParameters({ prompt: event.target.value } as Partial<OutpaintParams>)} rows={4} />
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
        <Textarea value={params.prompt} onChange={(event) => updateParameters({ prompt: event.target.value } as Partial<BackgroundReplaceParams>)} rows={4} />
      </div>
      <ModelAndResolutionFields
        aiModel={params.aiModel}
        outputResolution={params.outputResolution}
        onChange={(patch) => updateParameters(patch as Partial<BackgroundReplaceParams>)}
      />
      <input ref={referenceInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => onUploadAsset({ role: "reference", file: event.target.files?.[0] })} />
      <Button variant="outline" size="sm" className="w-full" onClick={() => referenceInputRef.current?.click()}>
        上传参考背景（可选）
      </Button>
      {draft.referenceAsset && (
        <p className="text-caption text-muted-foreground truncate">
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