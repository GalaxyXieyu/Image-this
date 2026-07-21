"use client";

import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent } from "react";
import Image from "next/image";
import { hasEnabledImageModel } from "@/lib/ensure-model";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  DrawerRoot,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { BottomSheetSelect, type BottomSheetSelectOption } from "@/components/workbench/BottomSheetSelect";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiPost, apiGet, apiPatch } from "@/lib/api-client";
import type { InputAssetRef } from "@/types/workbench";
import { clearPageDraftPrefix, usePageDraft } from "@/lib/use-page-draft";
import { PromptTemplateSelector } from "@/components/workbench/PromptTemplateSelector";
import {
  expandSteps,
  CycleError,
  DepthError,
  StepsLimitError,
  MissingTemplateError,
} from "@/lib/workbench/expand-workflow";
import { computeWatermarkCanvasPlan, clamp } from "@/components/combo/canvas-plan";
import { GlobalQuickBar } from "@/components/combo/GlobalQuickBar";
import { GlobalSettingsPanel } from "@/components/combo/GlobalSettingsPanel";
import type {
  BackgroundParams,
  ExecutableStepType,
  OutpaintParams,
  SceneParams,
  StepParams,
  StepType,
  UpscaleParams,
  WatermarkCanvasPlan,
  WatermarkCustomPosition,
  WatermarkParams,
  WatermarkPresetPosition,
  WorkflowParams,
  WorkflowStep,
} from "@/components/combo/types";
import { ASPECT_RATIOS, RESOLUTIONS } from "@/components/combo/types";
import { STEP_META, DEFAULT_PARAMS, INITIAL_STEPS } from "@/components/combo/step-meta";
import { buildBackgroundPrompt } from "@/components/combo/step-params";
import { MobileStepSettings, StepParamPanel } from "@/components/combo/step-panels";
import { FieldLabel, SliderRow, ChipGroup } from "@/components/combo/form-controls";
import {
  BackgroundStepParams,
  OutpaintStepParams,
  SceneStepParams,
  UpscaleStepParams,
  WatermarkStepParams,
} from "@/components/combo/step-params";
import { normalizeStepTaskInput } from "@/components/combo/normalize-step";
import { MobileGlobalSettings, CollapsedRail } from "@/components/combo/layout-bits";
import {
  Trash2,
  GripVertical,
  X,
  Search,
  Plus,
  Play,
  Bookmark,
  Image as ImageIcon,
  Wand2,
  Expand,
  ZoomIn,
  Droplets,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Loader2,
  Upload,
  Settings2,
  Layers,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

/* ─── Data ───────────────────────────────────────────────────────── */

const SCENE_CATEGORIES = [
  { id: "daily", label: "日常" },
  { id: "marketing", label: "营销" },
  { id: "festival", label: "节日" },
  { id: "outdoor", label: "户外" },
  { id: "indoor", label: "室内" },
];

const TEMPLATE_PREVIEWS: Record<string, string> = {
  t1: "/scene-presets/scene-elegant.webp",
  t2: "/scene-presets/scene-minimal.webp",
  t3: "/scene-presets/scene-lifestyle.webp",
  t4: "/scene-presets/scene-luxury.webp",
  t5: "/scene-presets/scene-fresh.webp",
  t6: "/scene-presets/scene-elegant.webp",
  m1: "/scene-presets/scene-festival.webp",
  m2: "/scene-presets/scene-elegant.webp",
  m3: "/scene-presets/scene-luxury.webp",
  m4: "/scene-presets/scene-business.webp",
  f1: "/scene-presets/scene-festival.webp",
  f2: "/scene-presets/scene-luxury.webp",
  f3: "/scene-presets/scene-warm.webp",
  f4: "/scene-presets/scene-business.webp",
  f5: "/scene-presets/scene-festival.webp",
  o1: "/scene-presets/scene-outdoor.webp",
  o2: "/scene-presets/scene-fresh.webp",
  o3: "/scene-presets/scene-business.webp",
  o4: "/scene-presets/scene-minimal.webp",
  i1: "/scene-presets/scene-lifestyle.webp",
  i2: "/scene-presets/scene-fresh.webp",
  i3: "/scene-presets/scene-warm.webp",
  i4: "/scene-presets/scene-business.webp",
};

const CATEGORY_FALLBACK_PREVIEWS: Record<string, string> = {
  daily: "/scene-presets/scene-elegant.webp",
  marketing: "/scene-presets/scene-business.webp",
  festival: "/scene-presets/scene-festival.webp",
  outdoor: "/scene-presets/scene-outdoor.webp",
  indoor: "/scene-presets/scene-lifestyle.webp",
};

const SCENE_TEMPLATES: Record<string, { id: string; name: string }[]> = {
  daily: [
    { id: "t1", name: "简约白底" },
    { id: "t2", name: "浅灰展台" },
    { id: "t3", name: "木纹桌面" },
    { id: "t4", name: "大理石台" },
    { id: "t5", name: "纯色渐变" },
    { id: "t6", name: "柔光棚拍" },
  ],
  marketing: [
    { id: "m1", name: "促销标签" },
    { id: "m2", name: "新品首发" },
    { id: "m3", name: "限时秒杀" },
    { id: "m4", name: "爆款推荐" },
  ],
  festival: [
    { id: "f1", name: "春节喜庆" },
    { id: "f2", name: "情人节" },
    { id: "f3", name: "中秋团圆" },
    { id: "f4", name: "双11狂欢" },
    { id: "f5", name: "圣诞主题" },
  ],
  outdoor: [
    { id: "o1", name: "草地自然" },
    { id: "o2", name: "沙滩海景" },
    { id: "o3", name: "城市街景" },
    { id: "o4", name: "雪山风景" },
  ],
  indoor: [
    { id: "i1", name: "客厅家居" },
    { id: "i2", name: "厨房场景" },
    { id: "i3", name: "卧室温馨" },
    { id: "i4", name: "书房办公" },
  ],
};

function getTemplatePreview(templateId: string, categoryId: string) {
  return TEMPLATE_PREVIEWS[templateId] ?? CATEGORY_FALLBACK_PREVIEWS[categoryId] ?? "/scene-presets/scene-elegant.webp";
}

const WORKFLOW_COVERS = [
  "from-neutral-700 to-neutral-900",
  "from-sky-500 to-cyan-400",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-indigo-500 to-blue-500",
];

function getStepOptions(
  workflowTemplates: WorkflowTemplateType[],
  currentEditingTemplateId?: string | null
): BottomSheetSelectOption[] {
  const executableTypes: ExecutableStepType[] = ["scene", "background", "upscale", "watermark", "outpaint"];
  const options: BottomSheetSelectOption[] = executableTypes.map((type) => {
    const Icon = STEP_META[type].icon;
    return {
      id: type,
      label: STEP_META[type].name,
      description: STEP_META[type].description,
      icon: Icon,
    };
  });

  const workflowChildren: BottomSheetSelectOption[] = workflowTemplates
    .filter((t) => t.id !== currentEditingTemplateId)
    .map((t) => ({
      id: `wf:${t.id}`,
      label: t.name,
      description: `${t.steps.length} 步`,
      icon: STEP_META.workflow.icon,
    }));

  if (workflowChildren.length > 0) {
    options.push({
      id: "workflow",
      label: STEP_META.workflow.name,
      description: STEP_META.workflow.description,
      icon: STEP_META.workflow.icon,
      children: workflowChildren,
    });
  }

  return options;
}

type MobileWorkflowStage = "workflow" | "params";

const MOBILE_WORKFLOW_STAGES: { id: MobileWorkflowStage; label: string }[] = [
  { id: "workflow", label: "工作流" },
  { id: "params", label: "参数" },
];

/* ─── Page ───────────────────────────────────────────────────────── */

// 工作流模板类型（与 API 返回对齐）
interface WorkflowTemplateType {
  id: string;
  name: string;
  description?: string;
  category?: string;
  steps: WorkflowStep[];
  globalParams?: Record<string, any>;
  tags?: string[];
  usageCount: number;
  isDefault: boolean;
  isSystem: boolean;
}

// API 响应类型
interface GetWorkflowTemplatesResponse {
  templates: WorkflowTemplateType[];
}

interface PostWorkflowTemplateResponse {
  template: WorkflowTemplateType;
}

type TemplateSaveMode = "create" | "overwrite";


export default function ComboPage() {
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateType[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = usePageDraft<string | null>("workbench.combo.selectedTemplate", null);
  const [templateSearch, setTemplateSearch] = usePageDraft("workbench.combo.templateSearch", "");
  const [steps, setSteps] = usePageDraft<WorkflowStep[]>("workbench.combo.steps", INITIAL_STEPS);
  const [selectedStepId, setSelectedStepId] = usePageDraft<string | null>("workbench.combo.selectedStepId", null);
  const { toast } = useToast();
  const { upload, uploading } = useUpload();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Runtime settings
  const [aspectRatio, setAspectRatio] = usePageDraft("workbench.combo.aspectRatio", "1:1");
  const [resolution, setResolution] = usePageDraft("workbench.combo.resolution", "2k");
  const [watermarkEnabled, setWatermarkEnabled] = usePageDraft("workbench.combo.watermarkEnabled", true);
  const [autoRetry, setAutoRetry] = usePageDraft("workbench.combo.autoRetry", true);
  const [executing, setExecuting] = useState(false);

  // 生图模型清单（来自 /api/models/available）
  const [availableModels, setAvailableModels] = useState<{ provider: string; modelName: string }[]>([]);
  // 选中的生图模型（provider 决定走哪个 provider，modelName 是具体模型 id）——用 usePageDraft 记住用户选择
  const [selectedImageModel, setSelectedImageModel] = usePageDraft<{ provider: string; modelName: string } | null>(
    "workbench.combo.imageModel", null
  );

  // Product upload
  const [productAssets, setProductAssets] = usePageDraft<InputAssetRef[]>("workbench.combo.productAssets", []);
  const [uploadingProductAssets, setUploadingProductAssets] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);
  const [productImageDims, setProductImageDims] = useState({ width: 0, height: 0 });

  // 桌面/移动端都可能缓存商品图，尺寸不能只靠某一块缩略图 onLoad；
  // 否则 canvasPlan 为空时，水印预览会退回“原图铺满”而不是扩图后最终画布。
  useEffect(() => {
    const firstAsset = productAssets[0];
    if (!firstAsset?.clientUrl) {
      setProductImageDims({ width: 0, height: 0 });
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setProductImageDims({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (!cancelled) setProductImageDims({ width: 0, height: 0 });
    };
    img.src = firstAsset.clientUrl;

    return () => {
      cancelled = true;
    };
  }, [productAssets]);

  // Add step drawer
  const [addStepOpen, setAddStepOpen] = useState(false);

  // Save template drawer
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateSaveData, setTemplateSaveData] = useState({ name: "", category: "" });

  // Workflow preview drawer
  const [workflowPreviewOpen, setWorkflowPreviewOpen] = useState(false);
  const [previewingWorkflowId, setPreviewingWorkflowId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = usePageDraft<MobileWorkflowStage>("workbench.combo.mobileStage", "workflow");
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const draggingStepIdRef = useRef<string | null>(null);
  const dragOverStepIdRef = useRef<string | null>(null);

  // Load workflow templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const res = await apiGet<GetWorkflowTemplatesResponse>(
          "/api/workflow-templates"
        );
        setWorkflowTemplates(res.templates || []);
      } catch (error) {
        console.error("加载工作流模板失败:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []);

  // 加载可用生图模型清单并设默认
  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ models: { provider: string; modelName: string }[] }>("/api/models/available");
        const models = res.models || [];
        setAvailableModels(models);
        // 默认：优先沿用已持久化的选择（若仍在清单内），否则选 gemini，否则第一个
        setSelectedImageModel((prev) => {
          if (prev && models.some((m) => m.provider === prev.provider && m.modelName === prev.modelName)) return prev;
          return models.find((m) => m.provider === "mediakit") ?? models.find((m) => m.provider === "gemini") ?? models[0] ?? null;
        });
      } catch (e) {
        console.error("加载可用生图模型失败:", e);   // 清单为空/失败不阻塞——提交时 hasEnabledImageModel() 已兜底
      }
    })();
  }, []);

  const handleUploadProductAssets = async (files?: FileList | File[]) => {
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

      if (uploadedAssets.length > 0) {
        setProductAssets((prev) => [...prev, ...uploadedAssets]);
        toast({
          title: "上传成功",
          description: `已添加 ${uploadedAssets.length} 张商品图`,
        });
      }
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setUploadingProductAssets(false);
    }
  };

  const removeProductAsset = (assetId: string) => {
    setProductAssets((prev) => prev.filter((asset) => asset.assetId !== assetId));
  };

  const templates = workflowTemplates;
  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId) ?? null,
    [steps, selectedStepId]
  );
  const selectedWorkflowTemplate = useMemo(
    () => (selectedTemplate ? templates.find((t) => t.id === selectedTemplate) ?? null : null),
    [selectedTemplate, templates]
  );
  const canOverwriteSelectedTemplate = Boolean(selectedWorkflowTemplate && !selectedWorkflowTemplate.isSystem);
  const selectedTemplateName = selectedWorkflowTemplate?.name ?? null;
  const previewSteps = useMemo(() => {
    if (steps.length === 0) return steps;
    const templatesById = Object.fromEntries(workflowTemplates.map((t) => [t.id, t]));
    try {
      return expandSteps(steps, templatesById) as WorkflowStep[];
    } catch {
      return steps;
    }
  }, [steps, workflowTemplates]);
  const getWatermarkCanvasPlan = useCallback(
    (currentStepId: string) =>
      productImageDims.width && productImageDims.height
        ? computeWatermarkCanvasPlan(previewSteps, currentStepId, productImageDims.width, productImageDims.height)
        : undefined,
    [previewSteps, productImageDims.height, productImageDims.width]
  );
  const getStepCanvasPlan = useCallback(
    (currentStepId: string) =>
      productImageDims.width && productImageDims.height
        ? computeWatermarkCanvasPlan(
            previewSteps,
            currentStepId,
            productImageDims.width,
            productImageDims.height,
            { includeCurrentStep: true }
          )
        : undefined,
    [previewSteps, productImageDims.height, productImageDims.width]
  );

  const handleExecute = async () => {
    if (steps.length === 0) return;
    if (productAssets.length === 0) {
      alert("请先上传商品图片");
      return;
    }
    if (!(await hasEnabledImageModel())) {
      alert("还没有配置模型 API Key，任务无法运行。请先到「设置 → AI 模型配置」配置并启用模型后再生成。");
      return;
    }
    setExecuting(true);
    try {
      // 重新获取最新的工作流模板（确保"实时引用"）
      const templatesRes = await apiGet<GetWorkflowTemplatesResponse>(
        "/api/workflow-templates"
      );
      const latestTemplates = templatesRes.templates || [];
      const templatesById = Object.fromEntries(
        latestTemplates.map((t) => [t.id, t])
      );

      // 展开所有嵌套工作流
      let expandedSteps: WorkflowStep[];
      try {
        expandedSteps = expandSteps(steps, templatesById) as WorkflowStep[];
      } catch (expandError) {
        setExecuting(false);
        if (expandError instanceof CycleError) {
          alert(`工作流存在循环引用：${expandError.message}`);
        } else if (expandError instanceof DepthError) {
          alert(`嵌套工作流深度超过限制：${expandError.message}`);
        } else if (expandError instanceof StepsLimitError) {
          alert(`工作流步数超过限制：${expandError.message}`);
        } else if (expandError instanceof MissingTemplateError) {
          alert(`工作流引用错误：${expandError.message}`);
        } else {
          alert("工作流展开失败，请重试");
        }
        return;
      }

      const global = {
        aspectRatio,
        resolution,
        watermarkEnabled,
        autoRetry,
        aiModel: selectedImageModel?.provider ?? "mediakit",     // provider
        model: selectedImageModel?.modelName ?? undefined,     // 具体模型 id
      };

      // 每个步骤的归一化参数（含 stepType），整条链共用，按上传的每张图各创建一个链式任务
      const pipelineSteps = expandedSteps.map((step) =>
        JSON.parse(JSON.stringify(normalizeStepTaskInput(step, global)))
      );

      // 多图即批量：每张图一个有序流水线任务（步骤 1→2→3… 依次执行，上一步输出喂下一步）
      const tasks = productAssets.map((asset) => ({
        type: "PIPELINE_WORKFLOW",
        workflowType: "pipeline",
        handlerName: "pipeline",
        contractVersion: 2,
        inputData: JSON.stringify({ inputAsset: asset, global, steps: pipelineSteps }),
        totalSteps: pipelineSteps.length,
      }));

      await apiPost("/api/tasks", tasks);
      window.location.href = "/tasks?tab=running";
    } catch (error) {
      setExecuting(false);
      console.error("执行批量处理失败:", error);
      alert("执行批量处理失败，请重试");
    }
  };

  const openSaveTemplateDrawer = () => {
    const editableTemplate = selectedWorkflowTemplate && !selectedWorkflowTemplate.isSystem
      ? selectedWorkflowTemplate
      : null;

    setTemplateSaveData({
      name: editableTemplate?.name ?? "",
      category: editableTemplate?.category ?? "",
    });
    setSaveTemplateOpen(true);
  };

  // Save current workflow as template
  const handleSave = async (mode: TemplateSaveMode = "create") => {
    const templateToOverwrite = mode === "overwrite" && canOverwriteSelectedTemplate
      ? selectedWorkflowTemplate
      : null;
    const shouldOverwrite = Boolean(templateToOverwrite);
    const name = templateSaveData.name.trim() || (templateToOverwrite ? templateToOverwrite.name : "");

    if (!name) {
      alert("模板名称不能为空");
      return;
    }

    const payload = {
      name,
      description: templateToOverwrite?.description ?? "",
      category: templateSaveData.category || undefined,
      steps: steps,
      globalParams: {
        aspectRatio,
        resolution,
        watermarkEnabled,
        autoRetry,
        aiModel: selectedImageModel?.provider ?? "mediakit",     // provider
        model: selectedImageModel?.modelName,      // 具体模型 id
      },
      tags: templateToOverwrite?.tags ?? [],
    };

    try {
      const saved = templateToOverwrite
        ? await apiPatch<PostWorkflowTemplateResponse>(`/api/workflow-templates/${templateToOverwrite.id}`, payload)
        : await apiPost<PostWorkflowTemplateResponse>("/api/workflow-templates", payload);

      // Reload templates
      const res = await apiGet<GetWorkflowTemplatesResponse>(
        "/api/workflow-templates"
      );
      setWorkflowTemplates(res.templates || []);
      setSelectedTemplate(saved.template.id);
      setSaveTemplateOpen(false);
      setTemplateSaveData({ name: "", category: "" });
      toast({
        title: shouldOverwrite ? "已覆盖模板" : "已保存为新模板",
        description: shouldOverwrite ? `已更新「${name}」` : `已创建「${name}」`,
      });
    } catch (error) {
      console.error("保存模板失败:", error);
      alert("保存模板失败，请重试");
    }
  };

  // Load template steps
  const handleLoadTemplate = (templateId: string) => {
    const template = workflowTemplates.find((t) => t.id === templateId);
    if (template) {
      setSteps(template.steps);
      setAspectRatio(template.globalParams?.aspectRatio ?? "1:1");
      setResolution(template.globalParams?.resolution ?? "2k");
      setWatermarkEnabled(template.globalParams?.watermarkEnabled ?? true);
      setAutoRetry(template.globalParams?.autoRetry ?? true);
      // 模型：旧模板无 aiModel/model → 保持当前选择/默认，不覆盖为空、不崩
      const gp = template.globalParams as { aiModel?: string; model?: string } | undefined;
      if (gp?.aiModel && gp?.model) {
        const restored = { provider: gp.aiModel, modelName: gp.model };
        // 仅当该模型仍在用户已启用清单内才应用，否则保留当前选择（避免选到已删除模型）
        setSelectedImageModel((prev) =>
          availableModels.some((m) => m.provider === restored.provider && m.modelName === restored.modelName)
            ? restored
            : prev
        );
      }
      // 旧模板（无字段）：不动 selectedImageModel，沿用挂载时的默认
    }
  };

  // 从工作台 hub 深链进入：?template=<id>&stage=params 预加载模板并跳到参数步
  const deepLinkAppliedRef = useRef(false);
  useEffect(() => {
    if (deepLinkAppliedRef.current || workflowTemplates.length === 0) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get("template");
    if (!templateId) return;
    if (!workflowTemplates.some((t) => t.id === templateId)) return;
    deepLinkAppliedRef.current = true;
    setSelectedTemplate(templateId);
    handleLoadTemplate(templateId);
    if (params.get("stage") === "params") setMobileStage("params");
  }, [workflowTemplates]);

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("确定要删除这个模板吗？")) return;
    try {
      await fetch(`/api/workflow-templates/${templateId}`, { method: "DELETE" });
      const res = await apiGet<GetWorkflowTemplatesResponse>(
        "/api/workflow-templates"
      );
      setWorkflowTemplates(res.templates || []);
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
      }
    } catch (error) {
      console.error("删除模板失败:", error);
      alert("删除模板失败，请重试");
    }
  };

  /* ---- step helpers ---- */
  const addStep = (stepTypeOrId: StepType | string) => {
    // 处理 wf:<id> 格式（嵌入工作流）
    if (typeof stepTypeOrId === "string" && stepTypeOrId.startsWith("wf:")) {
      const refTemplateId = stepTypeOrId.slice(3);
      const refTemplate = workflowTemplates.find((t) => t.id === refTemplateId);
      if (!refTemplate) return;
      setSteps((prev) => [
        ...prev,
        {
          id: `s${Date.now()}`,
          order: prev.length + 1,
          type: "workflow",
          name: refTemplate.name,
          description: `嵌入工作流 · ${refTemplate.steps.length} 步`,
          params: {},
          refTemplateId,
        },
      ]);
      setAddStepOpen(false);
      return;
    }

    // 普通步骤类型
    const stepType = stepTypeOrId as ExecutableStepType;
    const meta = STEP_META[stepType];
    setSteps((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        order: prev.length + 1,
        type: stepType,
        name: meta.name,
        description: meta.description,
        params: { ...DEFAULT_PARAMS[stepType] },
      },
    ]);
    setAddStepOpen(false);
  };

  const removeStep = (id: string) => {
    setSteps((prev) =>
      prev.filter((s) => s.id !== id).map((s, idx) => ({ ...s, order: idx + 1 }))
    );
    if (selectedStepId === id) setSelectedStepId(null);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const copy = [...steps];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIndex, 0, removed);
    setSteps(copy.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const reorderStep = useCallback((activeId: string, overId: string) => {
    if (activeId === overId) return;
    setSteps((prev) => {
      const fromIndex = prev.findIndex((step) => step.id === activeId);
      const toIndex = prev.findIndex((step) => step.id === overId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return prev;

      const copy = [...prev];
      const [removed] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, removed);
      return copy.map((step, idx) => ({ ...step, order: idx + 1 }));
    });
  }, []);

  const startStepDrag = (stepId: string) => {
    draggingStepIdRef.current = stepId;
    dragOverStepIdRef.current = stepId;
    setDraggingStepId(stepId);
    setDragOverStepId(stepId);
  };

  const enterStepDropTarget = (stepId: string) => {
    const activeId = draggingStepIdRef.current;
    if (!activeId || activeId === stepId || dragOverStepIdRef.current === stepId) return;
    dragOverStepIdRef.current = stepId;
    setDragOverStepId(stepId);
    reorderStep(activeId, stepId);
  };

  const moveStepDragPointer = (event: PointerEvent<HTMLElement>) => {
    if (!draggingStepIdRef.current) return;
    event.preventDefault();
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-step-drop-id]");
    const overId = target?.dataset.stepDropId;
    if (overId) enterStepDropTarget(overId);
  };

  const endStepDrag = () => {
    draggingStepIdRef.current = null;
    dragOverStepIdRef.current = null;
    setDraggingStepId(null);
    setDragOverStepId(null);
  };

  const updateStepParams = (id: string, patch: Partial<StepParams["params"]>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, params: { ...s.params, ...patch } } : s))
    );
  };

  const clearWorkflowDraft = () => {
    if (!window.confirm("清空当前 workflow 的缓存配置？这会恢复默认步骤、参数和模型选择。")) return;
    clearPageDraftPrefix("workbench.combo.");
    setSelectedTemplate(null);
    setTemplateSearch("");
    setSteps(INITIAL_STEPS.map((step) => ({ ...step, params: { ...step.params } })));
    setSelectedStepId(null);
    setAspectRatio("1:1");
    setResolution("2k");
    setWatermarkEnabled(true);
    setAutoRetry(true);
    setSelectedImageModel(null);
    setProductAssets([]);
    setMobileStage("workflow");
    toast({ title: "已清空 workflow 缓存", description: "页面已恢复默认配置。" });
  };

  return (
    <div className="relative h-full flex flex-col bg-background">
      <input
        ref={productInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleUploadProductAssets(event.target.files ?? undefined);
          event.currentTarget.value = "";
        }}
      />
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-3">
          <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-1 backdrop-blur">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {MOBILE_WORKFLOW_STAGES.map((stage, index) => {
                const active = mobileStage === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setMobileStage(stage.id)}
                    className={cn(
                      "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-all",
                      active
                        ? "border-transparent bg-accent-gradient text-white shadow-soft"
                        : "border-line bg-surface text-ink-2"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold",
                        active ? "bg-white/20 text-white" : "bg-surface-muted text-ink-2"
                      )}
                    >
                      {index + 1}
                    </span>
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {mobileStage === "workflow" && (
          <section className="mt-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold text-ink">工作流模板</h2>
              {selectedTemplate && (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand-text">
                  已选
                </span>
              )}
            </div>

            {/* 搜索 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="搜索工作流模板…"
                className="h-10 w-full rounded-full border border-line bg-surface pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
              />
            </div>

            {/* 封面卡片列表，可向下滚动 */}
            {(() => {
              const q = templateSearch.trim().toLowerCase();
              const list = q ? templates.filter((t) => t.name.toLowerCase().includes(q)) : templates;
              if (isLoadingTemplates && templates.length === 0) {
                return (
                  <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-ink-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载工作流模板…
                  </div>
                );
              }
              if (list.length === 0) {
                return (
                  <p className="py-6 text-center text-[13px] text-ink-3">
                    {q ? "没有匹配的工作流" : "暂无工作流模板，开始新建吧"}
                  </p>
                );
              }
              return (
                <div className="flex flex-col gap-3">
                  {list.map((tpl, idx) => {
                    const active = selectedTemplate === tpl.id;
                    const cover = WORKFLOW_COVERS[idx % WORKFLOW_COVERS.length];
                    return (
                      <div
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedTemplate(tpl.id);
                          handleLoadTemplate(tpl.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedTemplate(tpl.id);
                            handleLoadTemplate(tpl.id);
                          }
                        }}
                        className={cn(
                          "relative cursor-pointer overflow-hidden rounded-[18px] border bg-surface text-left transition-all",
                          active ? "border-brand ring-2 ring-brand" : "border-line hover:border-brand/40"
                        )}
                      >
                        {/* 封面：渐变 + 步骤图标流水线预览 */}
                        <div className={cn("relative flex h-24 items-center gap-0.5 overflow-hidden bg-gradient-to-br px-4", cover)}>
                          {tpl.steps.slice(0, 5).map((s, i) => {
                            const StepIcon = STEP_META[s.type]?.icon ?? Layers;
                            return (
                              <span key={s.id ?? i} className="flex items-center">
                                {i > 0 && <span className="mx-0.5 text-white/60">›</span>}
                                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/20 text-white backdrop-blur-sm">
                                  <StepIcon className="h-5 w-5" />
                                </span>
                              </span>
                            );
                          })}
                          <span className="absolute right-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                            {tpl.steps.length} 步
                          </span>
                          {active && (
                            <span className="absolute bottom-3 right-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-brand">
                              已选
                            </span>
                          )}
                        </div>
                        {/* 内容 */}
                        <div className="flex items-center justify-between gap-2 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold text-ink">{tpl.name}</p>
                            <p className="mt-0.5 text-[12px] text-ink-3">{tpl.isSystem ? "系统模板" : "自定义模板"}</p>
                          </div>
                          {!tpl.isSystem && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(tpl.id);
                              }}
                              className="shrink-0 text-ink-3 hover:text-danger"
                              aria-label="删除模板"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>
          )}

          {mobileStage === "params" && (
          <>
          <section className="glass-panel rounded-[20px] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                <Upload className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-ink">上传商品图片</h2>
                <p className="hidden">
                  作为流水线输入，稍后会进入任务队列
                </p>
              </div>
              <Button
                onClick={() => productInputRef.current?.click()}
                disabled={uploading || uploadingProductAssets}
                className="h-11 shrink-0 rounded-[12px] bg-accent-gradient px-4 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                选择
              </Button>
            </div>
            {productAssets.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <p className="text-[12px] font-semibold text-ink-2">
                  已选 {productAssets.length} 张
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {productAssets.map((asset, index) => (
                    <div
                      key={asset.assetId}
                      className="group relative w-20 shrink-0 overflow-hidden rounded-[10px] border border-line bg-surface-muted"
                    >
                      <div className="aspect-square bg-surface-muted">
                        <img
                          src={asset.clientUrl}
                          alt={`商品图 ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          onLoad={(e) => {
                            if (index === 0) {
                              const img = e.currentTarget;
                              setProductImageDims({ width: img.naturalWidth, height: img.naturalHeight });
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProductAsset(asset.assetId)}
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-soft opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="移除"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 处理顺序：方形卡片网格，手柄拖动排序 + 删除 + 添加（网格内换行，不横滑） */}
          <section className="mt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-ink">处理顺序</h2>
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-2">
                {steps.length}/5
              </span>
            </div>
            <div className="grid max-h-[260px] grid-cols-4 gap-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {steps.map((step) => {
                const Icon = STEP_META[step.type].icon;
                const isDragging = draggingStepId === step.id;
                const isDragOver = dragOverStepId === step.id && draggingStepId !== step.id;
                const isWorkflow = step.type === "workflow";
                const refTemplate = isWorkflow
                  ? workflowTemplates.find((t) => t.id === step.refTemplateId)
                  : undefined;
                const isRefInvalid = isWorkflow && !refTemplate;
                return (
                  <div
                    key={step.id}
                    data-step-drop-id={step.id}
                    className={cn(
                      "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[14px] border bg-surface p-1 transition-all",
                      isDragging ? "scale-95 border-brand opacity-70 ring-2 ring-brand" : "border-line",
                      isDragOver && "border-brand",
                      isRefInvalid && "opacity-60"
                    )}
                  >
                    {/* 拖拽手柄：只此处可拖，卡片其余区域可正常滚动 */}
                    <button
                      type="button"
                      aria-label={`拖动 ${step.name}`}
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startStepDrag(step.id);
                      }}
                      onPointerMove={moveStepDragPointer}
                      onPointerUp={endStepDrag}
                      onPointerCancel={endStepDrag}
                      className="absolute left-1 top-1 flex h-5 w-5 touch-none items-center justify-center rounded-full text-ink-3/60 active:bg-surface-muted"
                    >
                      <GripVertical className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`删除 ${step.name}`}
                      onClick={() => removeStep(step.id)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-ink-3/60 hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {isRefInvalid ? (
                      <AlertTriangle className="mt-1 h-7 w-7 text-danger" />
                    ) : (
                      <Icon className="mt-1 h-7 w-7 text-brand" />
                    )}
                    <span className="px-0.5 text-center text-[11px] font-medium leading-tight text-ink">
                      {isRefInvalid ? `⚠ ${step.name}` : step.name}
                    </span>
                  </div>
                );
              })}
              {steps.length < 5 && (
                <div className="aspect-square">
                  <BottomSheetSelect
                    options={getStepOptions(workflowTemplates, selectedTemplate)}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "string") {
                        addStep(value);
                      }
                    }}
                    title="选择处理步骤"
                    trigger={
                      <button
                        type="button"
                        className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed border-line-strong text-ink-2 transition-colors hover:border-brand hover:text-brand"
                      >
                        <Plus className="h-7 w-7" />
                        <span className="text-[11px] font-semibold">添加</span>
                      </button>
                    }
                    onOpenChange={setAddStepOpen}
                  />
                </div>
              )}
            </div>
          </section>

          {/* 参数：全局设置 + 各步参数 合并在一处 */}
          <section className="mt-4">
            <h2 className="text-[15px] font-bold text-ink">参数</h2>
            <p className="mt-0.5 mb-3 text-[12px] text-ink-3">
              {productAssets.length > 0
                ? `共 ${productAssets.length} 张商品图 · 每张 ${steps.length} 步，将批量执行`
                : "请先在上一步上传商品图"}
            </p>
            <div className="glass-panel rounded-[20px]">
              <MobileGlobalSettings
                selectedTemplateName={selectedTemplateName}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                resolution={resolution}
                setResolution={setResolution}
                availableModels={availableModels}
                selectedImageModel={selectedImageModel}
                setSelectedImageModel={setSelectedImageModel}
              />
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {steps.map((step) => {
                const Icon = STEP_META[step.type].icon;
                const isWorkflow = step.type === "workflow";
                const refTemplate = isWorkflow
                  ? workflowTemplates.find((t) => t.id === step.refTemplateId)
                  : undefined;
                const isRefInvalid = isWorkflow && !refTemplate;
                return (
                  <div
                    key={step.id}
                    className={cn("glass-panel w-full rounded-[18px] p-3", isRefInvalid && "opacity-60")}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">
                        {step.order}
                      </span>
                      {isRefInvalid ? (
                        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                      ) : (
                        <Icon className="h-4 w-4 shrink-0 text-brand" />
                      )}
                      <span className="min-w-0 flex-1 text-[14px] font-semibold text-ink">
                        {isRefInvalid ? `⚠ ${step.name}` : step.name}
                      </span>
                      {isWorkflow && refTemplate && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewingWorkflowId(step.refTemplateId!);
                            setWorkflowPreviewOpen(true);
                          }}
                          className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-2"
                        >
                          预览
                        </button>
                      )}
                    </div>
                    {isWorkflow ? (
                      isRefInvalid && (
                        <p className="mt-2 text-[12px] text-danger">引用的工作流已失效，请在上方顺序条删除或重新选择</p>
                      )
                    ) : (
                      <div className="mt-3 space-y-4 border-t border-line pt-3">
                        {step.type === "scene" && (
                          <SceneStepParams
                            params={step.params as SceneParams}
                            onChange={(patch) => updateStepParams(step.id, patch)}
                          />
                        )}
                        {step.type === "background" && (
                          <BackgroundStepParams
                            params={step.params as BackgroundParams}
                            onChange={(patch) => updateStepParams(step.id, patch)}
                          />
                        )}
                        {step.type === "upscale" && (
                          <UpscaleStepParams
                            params={step.params as UpscaleParams}
                            onChange={(patch) => updateStepParams(step.id, patch)}
                            productImage={productAssets[0]}
                            canvasPlan={getStepCanvasPlan(step.id)}
                          />
                        )}
                        {step.type === "watermark" && (
                          <WatermarkStepParams
                            params={step.params as WatermarkParams}
                            aspectRatio={aspectRatio}
                            onChange={(patch) => updateStepParams(step.id, patch)}
                            productImage={productAssets[0]}
                            canvasPlan={getWatermarkCanvasPlan(step.id)}
                          />
                        )}
                        {step.type === "outpaint" && (
                          <OutpaintStepParams
                            params={step.params as OutpaintParams}
                            onChange={(patch) => updateStepParams(step.id, patch)}
                            productImage={productAssets[0]}
                            canvasPlan={getStepCanvasPlan(step.id)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          </>
          )}
        </div>

        {/* 移动端：保存模板抽屉 */}
        <DrawerRoot open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{canOverwriteSelectedTemplate ? "保存或覆盖模板" : "保存为常用模板"}</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 px-4 pb-4">
              {canOverwriteSelectedTemplate && selectedWorkflowTemplate && (
                <div className="rounded-[12px] border border-brand/20 bg-brand-soft px-3 py-2 text-[12px] text-ink-2">
                  当前选中「{selectedWorkflowTemplate.name}」。可覆盖这个自定义模板，也可以另存为新模板。
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-ink">模板名称</Label>
                <Input
                  placeholder="给你的工作流起个名字"
                  value={templateSaveData.name}
                  onChange={(e) =>
                    setTemplateSaveData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="h-12 rounded-[12px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-ink">分类（可选）</Label>
                <Input
                  placeholder="如：日常、营销、节日等"
                  value={templateSaveData.category}
                  onChange={(e) =>
                    setTemplateSaveData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  className="h-12 rounded-[12px]"
                />
              </div>
            </div>
            <DrawerFooter>
              <div className="flex flex-col gap-2 sm:flex-row">
                <DrawerClose asChild>
                  <Button variant="outline" className="h-12 flex-1 rounded-full">
                    取消
                  </Button>
                </DrawerClose>
                {canOverwriteSelectedTemplate && (
                  <Button
                    onClick={() => handleSave("overwrite")}
                    variant="outline"
                    className="h-12 flex-1 rounded-full border-brand text-brand hover:bg-brand-soft"
                  >
                    覆盖当前模板
                  </Button>
                )}
                <Button
                  onClick={() => handleSave("create")}
                  className="h-12 flex-1 rounded-full bg-accent-gradient text-white font-semibold"
                >
                  {canOverwriteSelectedTemplate ? "另存为新模板" : "保存"}
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </DrawerRoot>

        {/* 工作流预览抽屉 */}
        {(() => {
          const previewTemplate = previewingWorkflowId
            ? workflowTemplates.find((t) => t.id === previewingWorkflowId)
            : null;
          return (
            <DrawerRoot
              open={workflowPreviewOpen}
              onOpenChange={setWorkflowPreviewOpen}
            >
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>
                    {previewTemplate ? `${previewTemplate.name} · 工作流预览` : "工作流预览"}
                  </DrawerTitle>
                </DrawerHeader>
                {previewTemplate ? (
                  <div className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
                    <div className="mb-3 rounded-[14px] bg-blue-50 p-3 text-[12px] text-blue-700">
                      实时引用：执行时将按照该工作流的当前版本展开
                    </div>
                    <div className="space-y-2">
                      {previewTemplate.steps.map((substep) => (
                        <div
                          key={substep.id}
                          className="flex items-start gap-3 rounded-[14px] border border-line bg-surface p-3"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white">
                            {substep.order}
                          </span>
                          <span className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-ink">
                              {substep.name}
                            </p>
                            <p className="mt-0.5 text-[12px] text-ink-3">
                              {substep.description}
                            </p>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <p className="text-[14px] text-ink-3">工作流信息不可用</p>
                  </div>
                )}
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button className="w-full">关闭预览</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </DrawerRoot>
          );
        })()}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150">
          {mobileStage === "workflow" && (
            <Button
              onClick={() => setMobileStage("params")}
              disabled={!selectedTemplate}
              className="h-12 w-full rounded-full bg-accent-gradient px-5 text-[14px] font-semibold text-white shadow-float disabled:opacity-50"
            >
              下一步：填写参数
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          {mobileStage === "params" && (
            <div className="flex items-center gap-2">
              <Button
                onClick={clearWorkflowDraft}
                variant="outline"
                className="h-12 shrink-0 rounded-full border-line-strong bg-surface px-4 text-[13px] font-semibold"
              >
                <RotateCcw className="h-4 w-4" />
                清空缓存
              </Button>
              <Button
                onClick={openSaveTemplateDrawer}
                variant="outline"
                className="h-12 shrink-0 rounded-full border-line-strong bg-surface px-4 text-[13px] font-semibold"
              >
                <Bookmark className="h-4 w-4" />
                保存
              </Button>
              <Button
                onClick={handleExecute}
                disabled={executing || steps.length === 0 || productAssets.length === 0}
                className="h-12 flex-1 rounded-full bg-accent-gradient px-5 text-[14px] font-semibold text-white shadow-float disabled:opacity-50"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {executing ? "提交中…" : "执行批量处理"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Page header — 桌面端 */}
      <div className="hidden md:block shrink-0 border-b border-line px-6 py-4">
        <h1 className="text-h3 font-semibold text-ink">组合工作流</h1>
        <p className="mt-0.5 text-data text-ink-2">
          编排多个 AI 处理步骤，一键批量执行流水线
        </p>
      </div>

      {/* Three-column workspace — 桌面端 */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* ───── Left: scene templates ───── */}
        {leftCollapsed ? (
          <CollapsedRail
            side="left"
            label="场景模板"
            onExpand={() => setLeftCollapsed(false)}
          />
        ) : (
          <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-data font-semibold text-ink">工作流模板</span>
              <button
                type="button"
                onClick={() => setLeftCollapsed(true)}
                className="rounded-md p-1 text-ink-3 hover:bg-surface-muted hover:text-ink"
                aria-label="折叠"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4">
              {isLoadingTemplates && templates.length === 0 ? (
                <p className="flex items-center gap-2 px-1 py-2 text-caption text-ink-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  加载中…
                </p>
              ) : templates.length === 0 ? (
                <p className="text-caption text-ink-3 px-1 py-2">暂无工作流模板</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {templates.map((tpl) => {
                    const active = selectedTemplate === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSelectedTemplate(tpl.id);
                          handleLoadTemplate(tpl.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedTemplate(tpl.id);
                            handleLoadTemplate(tpl.id);
                          }
                        }}
                        className={cn(
                          "group relative flex cursor-pointer items-center gap-2 rounded-[12px] border px-3 py-2 text-left transition-all",
                          active
                            ? "border-brand bg-brand-soft"
                            : "border-line bg-surface-muted hover:border-brand/40"
                        )}
                        title={tpl.description || tpl.name}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-ink">
                            {tpl.name}
                          </span>
                        </span>
                        {!tpl.isSystem && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(tpl.id);
                            }}
                            className="shrink-0 text-ink-3 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ───── Center: pipeline ───── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 pb-24 pt-6">
            <div className="mx-auto flex max-w-[640px] flex-col gap-4">
              {/* Input area */}
              <div className="glass-panel flex flex-col gap-3 rounded-[18px] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
                    <Upload className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-ink">上传商品图片</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      拖入或点击上传，支持批量 · 作为流水线输入
                    </p>
                  </div>
                  <Button
                    onClick={() => productInputRef.current?.click()}
                    disabled={uploading || uploadingProductAssets}
                    className="h-8 rounded-[10px] bg-accent-gradient px-3.5 text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    选择文件
                  </Button>
                </div>
                {productAssets.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[12px] font-semibold text-ink-2">
                      已选 {productAssets.length} 张
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {productAssets.map((asset, index) => (
                        <div
                          key={asset.assetId}
                          className="group relative overflow-hidden rounded-[10px] border border-line bg-surface-muted"
                        >
                          <div className="aspect-square bg-surface-muted">
                            <img
                              src={asset.clientUrl}
                              alt={`商品图 ${index + 1}`}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              onLoad={(e) => {
                                if (index === 0) {
                                  const img = e.currentTarget;
                                  setProductImageDims({
                                    width: img.naturalWidth,
                                    height: img.naturalHeight,
                                  });
                                }
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeProductAsset(asset.assetId)}
                            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow-soft opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="移除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Separator label */}
              <div className="mt-2 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                <span className="h-px flex-1 bg-line-strong" />
                处理流水线
                <span className="h-px flex-1 bg-line-strong" />
              </div>

              {/* Steps */}
              {steps.map((step, index) => {
                const meta = STEP_META[step.type];
                const Icon = meta.icon;
                const isSelected = selectedStepId === step.id;
                const isWorkflow = step.type === "workflow";
                const refTemplate = isWorkflow
                  ? workflowTemplates.find((t) => t.id === step.refTemplateId)
                  : undefined;
                const isRefInvalid = isWorkflow && !refTemplate;

                return (
                  <div key={step.id} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (isWorkflow && refTemplate) {
                          setPreviewingWorkflowId(step.refTemplateId!);
                          setWorkflowPreviewOpen(true);
                        } else if (!isWorkflow) {
                          setSelectedStepId(step.id);
                        }
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-[18px] border p-3.5 text-left transition-all",
                        isSelected
                          ? "glass-panel border-brand ring-2 ring-brand/40"
                          : "border-line bg-surface hover:border-brand/30 hover:shadow-soft",
                        isRefInvalid && "opacity-60"
                      )}
                    >
                      {/* Order badge */}
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold shadow-soft",
                          isSelected
                            ? "bg-accent-gradient text-white"
                            : "bg-brand text-white"
                        )}
                      >
                        {step.order}
                      </span>

                      <span
                        className="cursor-grab text-ink-3 hover:text-ink active:cursor-grabbing"
                        title="拖拽排序"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>

                      <span
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]",
                          isSelected
                            ? "bg-accent-gradient text-white"
                            : "bg-brand-soft text-brand"
                        )}
                      >
                        {isRefInvalid ? (
                          <AlertTriangle className="h-5 w-5 text-danger" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">
                          {isRefInvalid ? `⚠ ${step.name}` : step.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                          {isRefInvalid ? "引用已失效" : step.description}
                        </span>
                      </span>

                      <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {index > 0 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStep(index, -1);
                            }}
                            className="rounded-md p-1.5 text-ink-3 hover:bg-surface-muted hover:text-ink"
                            title="上移"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {index < steps.length - 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveStep(index, 1);
                            }}
                            className="rounded-md p-1.5 text-ink-3 hover:bg-surface-muted hover:text-ink"
                            title="下移"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeStep(step.id);
                          }}
                          className="rounded-md p-1.5 text-ink-3 hover:bg-danger/10 hover:text-danger"
                          title="删除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </button>

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className="flex justify-center py-1.5">
                        <span className="h-3 w-px bg-brand/40" />
                      </div>
                    )}
                  </div>
                );
              })}

              <BottomSheetSelect
                options={getStepOptions(workflowTemplates, selectedTemplate)}
                value=""
                onChange={(value) => {
                  if (typeof value === "string") {
                    addStep(value);
                  }
                }}
                title="选择处理步骤"
                trigger={
                  <button
                    type="button"
                    disabled={steps.length >= 5}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed p-4 transition-all",
                      steps.length >= 5
                        ? "cursor-not-allowed border-line text-ink-3"
                        : "border-line-strong text-ink-2 hover:border-brand hover:bg-brand-soft/30 hover:text-brand"
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-[14px] font-semibold">添加处理步骤</span>
                    <span className="text-[12px] text-ink-3">({steps.length}/5)</span>
                  </button>
                }
              />
            </div>
          </div>

          {/* Floating action group */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex justify-center">
            <div className="glass-panel pointer-events-auto flex items-center gap-2 rounded-full p-1.5 shadow-float">
              <Button
                onClick={clearWorkflowDraft}
                variant="ghost"
                className="h-11 gap-1.5 rounded-full px-4 text-[14px] font-semibold text-ink-2 hover:bg-surface-muted"
              >
                <RotateCcw className="h-4 w-4" />
                清空缓存
              </Button>
              <Button
                onClick={openSaveTemplateDrawer}
                variant="ghost"
                className="h-11 gap-1.5 rounded-full px-5 text-[14px] font-semibold text-ink-2 hover:bg-surface-muted"
              >
                <Bookmark className="h-4 w-4" />
                保存为常用模板
              </Button>
              <Button
                onClick={handleExecute}
                disabled={executing || steps.length === 0}
                className="h-11 gap-2 rounded-full bg-accent-gradient px-7 text-[14px] font-semibold text-white shadow-float transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {executing ? "提交中…" : "执行批量处理"}
              </Button>
            </div>
          </div>
        </main>

        {/* ───── Right: settings / step params ───── */}
        {rightCollapsed ? (
          <CollapsedRail
            side="right"
            label="执行设置"
            onExpand={() => setRightCollapsed(false)}
          />
        ) : (
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-line bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
            {/* 全局模型/清晰度固定顶部，点步骤参数时也不再被整页替换 */}
            <div className="shrink-0 border-b border-line p-4">
              <GlobalQuickBar
                onCollapse={() => setRightCollapsed(true)}
                selectedTemplateName={
                  selectedTemplate
                    ? templates.find((t) => t.id === selectedTemplate)?.name ?? null
                    : null
                }
                resolution={resolution}
                setResolution={setResolution}
                availableModels={availableModels}
                selectedImageModel={selectedImageModel}
                setSelectedImageModel={setSelectedImageModel}
                showFullSettings={!(selectedStep && selectedStep.type !== "workflow")}
                onShowFullSettings={() => setSelectedStepId(null)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {selectedStep && selectedStep.type !== "workflow" ? (
                <StepParamPanel
                  step={selectedStep}
                  onClose={() => setSelectedStepId(null)}
                  onCollapse={() => setRightCollapsed(true)}
                  onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  aspectRatio={aspectRatio}
                  productImage={productAssets[0]}
                  canvasPlan={
                    selectedStep.type === "watermark"
                      ? getWatermarkCanvasPlan(selectedStep.id)
                      : getStepCanvasPlan(selectedStep.id)
                  }
                  hideChrome
                />
              ) : (
                <GlobalSettingsPanel
                  onCollapse={() => setRightCollapsed(true)}
                  selectedTemplateName={
                    selectedTemplate
                      ? templates.find((t) => t.id === selectedTemplate)?.name ?? null
                      : null
                  }
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  resolution={resolution}
                  setResolution={setResolution}
                  availableModels={availableModels}
                  selectedImageModel={selectedImageModel}
                  setSelectedImageModel={setSelectedImageModel}
                  compact
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── Right: global settings extracted to components/combo ─── */

