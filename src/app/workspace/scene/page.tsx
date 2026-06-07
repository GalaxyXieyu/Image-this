"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
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
    { num: 1, label: "填写产品信息" },
    { num: 2, label: "选择风格模板" },
    { num: 3, label: "生成与调整" },
  ];

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-center gap-8 px-8 shrink-0">
      {steps.map((s, i) => {
        const isActive = currentStep === s.num;
        const isCompleted = currentStep > s.num;
        return (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[13px]",
                isActive || isCompleted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={cn(
                "text-sm",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-border ml-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary" />
        <span
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          AI 商品视觉工作台
        </span>
      </div>
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          首页
        </Link>
        <Link
          href="/templates"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          模板库
        </Link>
        <Link
          href="/tasks"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          任务中心
        </Link>
        <Link
          href="/results"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          结果管理
        </Link>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          设置
        </Link>
      </nav>
    </header>
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
  const { toast } = useToast();

  const handleUploadAsset = async (role: "input" | "reference", file?: File) => {
    if (!file) return;

    try {
      const response = await upload(role === "input" ? { input: file } : { reference: file });
      const asset = role === "input" ? response.inputAsset : response.referenceAsset;
      if (!asset) return;

      setWorkflowData((prev) => ({
        ...prev,
        [role === "input" ? "inputAsset" : "referenceAsset"]: asset,
      }));
      toast({
        title: role === "input" ? "商品图已上传" : "参考图已上传",
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {workflowData.activePresetName && (
            <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="processing">已载入模板</Badge>
                  <h2
                    className="mt-3 text-base font-semibold text-foreground"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {workflowData.activePresetName}
                  </h2>
                  {workflowData.activePresetDescription && (
                    <p
                      className="mt-1 text-sm text-muted-foreground"
                      style={{ fontFamily: "Geist, sans-serif" }}
                    >
                      {workflowData.activePresetDescription}
                    </p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>模型：{workflowData.aiModel}</p>
                  <p>尺寸：{workflowData.outputResolution}</p>
                  <p>候选：{workflowData.candidateCount} 张</p>
                </div>
              </div>
            </section>
          )}
          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              产品基础信息
            </h2>
            <p
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              请尽可能详细地描述你的产品，AI 会根据这些信息生成最合适的场景图
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>产品名称</Label>
                <Input
                  placeholder="例如：某某品牌保湿面霜"
                  value={workflowData.productName}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, productName: e.target.value }))
                  }
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>产品类型</Label>
                <Select
                  value={workflowData.productType}
                  onValueChange={(value) =>
                    setWorkflowData((prev) => ({ ...prev, productType: value }))
                  }
                >
                  <SelectTrigger style={{ fontFamily: "Geist, sans-serif" }}>
                    <SelectValue placeholder="选择产品类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beauty">美妆护肤</SelectItem>
                    <SelectItem value="food">食品饮料</SelectItem>
                    <SelectItem value="clothing">服装服饰</SelectItem>
                    <SelectItem value="electronics">3C 数码</SelectItem>
                    <SelectItem value="home">家居用品</SelectItem>
                    <SelectItem value="baby">母婴用品</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>目标人群</Label>
                <Input
                  placeholder="例如：25-35 岁女性"
                  value={workflowData.targetAudience}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, targetAudience: e.target.value }))
                  }
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>使用场景</Label>
                <Input
                  placeholder="例如：日常护肤"
                  value={workflowData.usageScene}
                  onChange={(e) =>
                    setWorkflowData((prev) => ({ ...prev, usageScene: e.target.value }))
                  }
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label style={{ fontFamily: "Inter, sans-serif" }}>核心卖点</Label>
              <Textarea
                placeholder="请列出产品的核心卖点..."
                rows={3}
                value={workflowData.sellingPoints}
                onChange={(e) =>
                  setWorkflowData((prev) => ({ ...prev, sellingPoints: e.target.value }))
                }
                style={{ fontFamily: "Geist, sans-serif" }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              使用平台
            </h2>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <label
                  key={platform.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                    workflowData.platforms.includes(platform.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Checkbox
                    checked={workflowData.platforms.includes(platform.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setWorkflowData((prev) => ({
                          ...prev,
                          platforms: [...prev.platforms, platform.id],
                        }));
                      } else {
                        setWorkflowData((prev) => ({
                          ...prev,
                          platforms: prev.platforms.filter((p) => p !== platform.id),
                        }));
                      }
                    }}
                  />
                  <span className="text-sm" style={{ fontFamily: "Geist, sans-serif" }}>
                    {platform.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              素材上传
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <input
                ref={inputFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUploadAsset("input", event.target.files?.[0])}
              />
              <button
                type="button"
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-muted-foreground transition-colors"
                onClick={() => inputFileRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm text-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                    {workflowData.inputAsset?.originalFilename ?? "上传商品图"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    商品主体图，生成时会保持主体稳定
                  </p>
                </div>
              </button>

              <input
                ref={referenceFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleUploadAsset("reference", event.target.files?.[0])}
              />
              <button
                type="button"
                className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-muted-foreground transition-colors"
                onClick={() => referenceFileRef.current?.click()}
                disabled={uploading}
              >
                <ImageIcon className="w-10 h-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm text-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                    {workflowData.referenceAsset?.originalFilename ?? "上传场景参考图"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    用于参考背景、构图、光线和氛围
                  </p>
                </div>
              </button>
            </div>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
              支持 PNG、JPG；素材会先登记为 input asset，任务只携带轻量引用。
            </p>
          </section>
        </div>
      </div>

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          <Link href="/templates">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回模板库
          </Link>
        </Button>
        <Button
          onClick={onNext}
          variant="brand"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          下一步：选择风格模板
          <ArrowRight className="w-4 h-4 ml-2" />
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                AI 生成预览
              </h2>
              <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                基于已提交的商品信息，AI 自动生成预览图
              </p>
            </div>
            <Badge variant="secondary" className="bg-muted" style={{ fontFamily: "Geist, sans-serif" }}>
              已选 {selected.length} 张
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-5">
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
                    "flex flex-col items-center p-6 rounded-xl border transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <template.icon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                    {template.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    {template.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回修改信息
        </Button>
        <Button
          onClick={onNext}
          disabled={selected.length === 0}
          variant="brand"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          下一步：生成并调整
          <ArrowRight className="w-4 h-4 ml-2" />
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
      const originalUrl = workflowData.inputAsset?.clientUrl ?? result.resultImageUrl;
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
      const taskRequests = buildSceneLegacyTaskRequests({
        productInfo: {
          name: workflowData.productName,
          category: workflowData.productType,
          description: workflowData.targetAudience,
          targetPlatform: mapSelectionToTargetPlatform(workflowData.platforms[0]),
          stylePreference: workflowData.stylePreference || workflowData.usageScene,
        },
        inputAssets: [workflowData.inputAsset, workflowData.referenceAsset].filter(
          (asset): asset is InputAssetRef => Boolean(asset)
        ),
        inputAsset: workflowData.inputAsset,
        referenceAsset: workflowData.referenceAsset,
        selectedPresetId: workflowData.selectedPresetId,
        styleTemplateIds: workflowData.selectedTemplates,
        stylePreference: workflowData.stylePreference || workflowData.usageScene,
        sellingPoints: workflowData.sellingPoints,
        batchMode: workflowData.batchMode,
        parameters: {
          aiModel: workflowData.aiModel,
          outputResolution: workflowData.outputResolution,
          candidateCount: workflowData.candidateCount,
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
        tasks.map((task, index) => ({
          id: String(index + 1),
          taskId: task.id,
          name: `${workflowData.activePresetName ?? "场景图"}候选 ${index + 1}`,
          status: "queued",
          progress: 0,
        }))
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
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Wand2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                准备生成
              </h2>
              <p className="text-sm text-muted-foreground mt-2 mb-6" style={{ fontFamily: "Geist, sans-serif" }}>
                点击开始生成，AI 将创建真实任务并进入任务中心队列
              </p>

              <div className="w-full max-w-xl space-y-4 mb-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AI 模型</Label>
                    <Select
                      value={workflowData.aiModel}
                      onValueChange={(value) =>
                        setWorkflowData((prev) => ({ ...prev, aiModel: value }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSceneGenerationModels().map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.label}
                            {m.priority === 'primary' && (
                              <span className="ml-1.5 text-[10px] text-green-600">推荐</span>
                            )}
                            {m.priority === 'fallback' && (
                              <span className="ml-1.5 text-[10px] text-amber-600">兜底</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">输出尺寸</Label>
                    <Select
                      value={workflowData.outputResolution}
                      onValueChange={(value) =>
                        setWorkflowData((prev) => ({ ...prev, outputResolution: value }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="选择尺寸" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="800x800">800 × 800</SelectItem>
                        <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                        <SelectItem value="1200x600">1200 × 600</SelectItem>
                        <SelectItem value="1080x1440">1080 × 1440</SelectItem>
                        <SelectItem value="1080x1920">1080 × 1920</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">候选数量</Label>
                    <Select
                      value={String(workflowData.candidateCount)}
                      onValueChange={(value) =>
                        setWorkflowData((prev) => ({
                          ...prev,
                          candidateCount: Number(value),
                        }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="选择数量" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} 张</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || !workflowData.inputAsset || !workflowData.referenceAsset}
                variant="brand"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                开始生成
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                    生成结果
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    {generating
                      ? "正在创建任务，请稍候..."
                      : isPolling || activeCount > 0
                        ? `正在跟踪 ${activeCount} 个候选任务，已完成 ${completedCount} 个，失败 ${failedCount} 个`
                        : `候选任务已结束，已完成 ${completedCount} 个，失败 ${failedCount} 个`}
                  </p>
                  {pollingError && (
                    <p className="text-xs text-destructive mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                      状态刷新失败：{pollingError}
                    </p>
                  )}
                </div>
                {!generating && (
                  <Button variant="outline" onClick={handleGenerate} style={{ fontFamily: "Inter, sans-serif" }}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-5">
                {results.map((result) => (
                  <div key={result.id} className="flex flex-col rounded-xl border border-border overflow-hidden">
                    <div className="h-40 bg-muted flex items-center justify-center overflow-hidden">
                      {result.resultImageUrl ? (
                        <img src={result.resultImageUrl} alt={result.name} className="h-full w-full object-cover" />
                      ) : result.status === "processing" ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Wand2 className="w-8 h-8 animate-pulse" />
                          <span className="text-xs">{Math.max(0, result.progress)}%</span>
                        </div>
                      ) : result.status === "failed" || result.status === "cancelled" ? (
                        <div className="px-4 text-center text-xs text-destructive">
                          {result.errorMessage ?? "任务处理失败"}
                        </div>
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                          {result.name}
                        </h3>
                        <Badge variant={getCandidateStatusVariant(result.status)}>
                          {getCandidateStatusLabel(result.status)}
                        </Badge>
                      </div>
                      {result.currentStep && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                          {result.currentStep}
                        </p>
                      )}
                      {result.taskId && (
                        <p className="mt-1 truncate text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                          任务 ID：{result.taskId}
                        </p>
                      )}
                      {(result.status === "completed" || result.status === "failed") && result.usedModel && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground/70" style={{ fontFamily: "Geist, sans-serif" }}>
                          模型：{result.usedModel}
                        </p>
                      )}
                      {result.savedImageId && (
                        <p className="mt-1 truncate text-[11px] text-green-600" style={{ fontFamily: "Geist, sans-serif" }}>
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
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1" style={{ fontFamily: "Geist, sans-serif" }} asChild>
                          <Link href="/tasks">查看任务</Link>
                        </Button>
                        {result.savedImageId ? (
                          <Button size="sm" variant="brand" className="flex-1" style={{ fontFamily: "Geist, sans-serif" }} asChild>
                            <Link href="/results">查看结果</Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="brand"
                            className="flex-1"
                            style={{ fontFamily: "Geist, sans-serif" }}
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

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回预览
        </Button>
        <Button asChild variant="outline" style={{ fontFamily: "Inter, sans-serif" }}>
          <Link href="/templates">完成，返回模板库</Link>
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
    <div className="h-screen flex flex-col bg-background">
      <TopNav />
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
