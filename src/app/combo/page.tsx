"use client";

import { useCallback, useMemo, useRef, useState, useEffect, type PointerEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { useIsMobile } from "@/lib/use-is-mobile";
import { useUpload } from "@/lib/use-upload";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { apiPost, apiGet } from "@/lib/api-client";
import type { InputAssetRef } from "@/types/workbench";
import {
  expandSteps,
  CycleError,
  DepthError,
  StepsLimitError,
  MissingTemplateError,
} from "@/lib/workbench/expand-workflow";
import {
  Trash2,
  GripVertical,
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

type StepType = "scene" | "background" | "upscale" | "watermark" | "outpaint" | "workflow";

// 可执行步骤类型（workflow 不是可执行的叶子，执行前需展开）
type ExecutableStepType = Exclude<StepType, "workflow">;

interface SceneParams { sceneStyle: string; candidateCount: number }
interface BackgroundParams { bgType: string; featherEdge: number; keepShadow: boolean; referenceAsset?: InputAssetRef }
interface UpscaleParams { factor: number; denoise: number }
type WatermarkPresetPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

interface WatermarkCustomPosition {
  x: number;
  y: number;
  editorWidth: number;
  editorHeight: number;
}

interface WatermarkParams {
  content: string;
  position: WatermarkPresetPosition | "custom";
  opacity: number;
  customPosition?: WatermarkCustomPosition;
}
interface OutpaintParams { direction: string; ratio: number }
interface WorkflowParams {} // workflow 步无参数

type StepParams =
  | { type: "scene"; params: SceneParams }
  | { type: "background"; params: BackgroundParams }
  | { type: "upscale"; params: UpscaleParams }
  | { type: "watermark"; params: WatermarkParams }
  | { type: "outpaint"; params: OutpaintParams }
  | { type: "workflow"; params: WorkflowParams };

interface WorkflowStep {
  id: string;
  order: number;
  type: StepType;
  name: string;
  description: string;
  params: StepParams["params"];
  /**
   * Phase 3 扩展位（工作流嵌套）：未来支持把一个已保存的工作流模板作为一步嵌入。
   * 届时 StepType 增加 "workflow"，本字段引用被嵌入的 WorkflowTemplate.id；
   * 执行时递归展开为扁平步骤（需环检测/深度限制）。
   * 当前未启用，仅预留数据形状，保证已保存模板的 steps(JSON) 向前兼容。
   */
  refTemplateId?: string;
}

const STEP_META: Record<
  StepType,
  { icon: React.ElementType; name: string; description: string }
> = {
  scene: { icon: ImageIcon, name: "生成场景图", description: "流水线起点：先按场景模板生成底图，后续步骤在此基础上加工" },
  background: { icon: Wand2, name: "AI 换背景", description: "智能替换背景，融合光影" },
  upscale: { icon: ZoomIn, name: "高清放大", description: "AI 超分辨率放大，提升清晰度" },
  watermark: { icon: Droplets, name: "水印与尺寸", description: "添加品牌水印，调整输出尺寸" },
  outpaint: { icon: Expand, name: "智能扩图", description: "智能扩展画布，补充画面内容" },
  workflow: { icon: Layers, name: "嵌入工作流", description: "把一个已保存的工作流作为一步" },
};

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

  // 加入嵌入工作流选项，支持二级选择
  const workflowChildren: BottomSheetSelectOption[] = workflowTemplates
    .filter((t) => t.id !== currentEditingTemplateId) // 排除当前正在编辑的模板（防自嵌）
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

const DEFAULT_PARAMS: Record<ExecutableStepType, StepParams["params"]> = {
  scene: { sceneStyle: "natural", candidateCount: 4 } as SceneParams,
  background: { bgType: "studio", featherEdge: 8, keepShadow: true } as BackgroundParams,
  upscale: { factor: 2, denoise: 30 } as UpscaleParams,
  watermark: { content: "@品牌名", position: "bottom-right", opacity: 70 } as WatermarkParams,
  outpaint: { direction: "all", ratio: 25 } as OutpaintParams,
};

const TYPE_TO_API: Record<ExecutableStepType, string> = {
  scene: "SCENE_GENERATION",
  background: "BACKGROUND_REMOVAL",
  upscale: "IMAGE_UPSCALING",
  watermark: "WATERMARK",
  outpaint: "IMAGE_EXPANSION",
};

const INITIAL_STEPS: WorkflowStep[] = [
  {
    id: "s1",
    order: 1,
    type: "scene",
    ...STEP_META.scene,
    params: { ...DEFAULT_PARAMS.scene },
  },
  {
    id: "s2",
    order: 2,
    type: "background",
    ...STEP_META.background,
    params: { ...DEFAULT_PARAMS.background },
  },
  {
    id: "s3",
    order: 3,
    type: "watermark",
    ...STEP_META.watermark,
    params: { ...DEFAULT_PARAMS.watermark },
  },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1" },
  { id: "3:4", label: "3:4" },
  { id: "4:3", label: "4:3" },
  { id: "16:9", label: "16:9" },
  { id: "9:16", label: "9:16" },
];

const RESOLUTIONS = [
  { id: "1k", label: "1K · 标准" },
  { id: "2k", label: "2K · 推荐" },
  { id: "4k", label: "4K · 超清" },
];

type MobileWorkflowStage = "workflow" | "params" | "arrange";

const MOBILE_WORKFLOW_STAGES: { id: MobileWorkflowStage; label: string }[] = [
  { id: "workflow", label: "工作流" },
  { id: "params", label: "参数" },
  { id: "arrange", label: "编排" },
];

const SCENE_STYLE_LABELS: Record<string, string> = {
  natural: "自然光",
  studio: "棚拍",
  lifestyle: "生活场景",
  minimal: "极简",
};

const BG_TYPE_LABELS: Record<string, string> = {
  studio: "纯色棚拍",
  scene: "AI 场景",
  white: "白底",
  blur: "虚化",
};

const WATERMARK_POSITION_LABELS: Record<WatermarkParams["position"], string> = {
  "top-left": "左上",
  "top-right": "右上",
  "bottom-left": "左下",
  "bottom-right": "右下",
  center: "居中",
  custom: "自定义",
};

const OUTPAINT_DIRECTION_LABELS: Record<string, string> = {
  all: "四周",
  horizontal: "左右",
  vertical: "上下",
};

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

function normalizeStepTaskInput(
  step: WorkflowStep,
  global: {
    batchCount: number;
    aspectRatio: string;
    resolution: string;
    watermarkEnabled: boolean;
    autoRetry: boolean;
  }
) {
  const params = step.params as Record<string, unknown>;
  const baseInput = {
    stepType: step.type,
    stepName: step.name,
    stepParams: step.params,
    global,
  };

  if (step.type === "background") {
    const backgroundParams = step.params as BackgroundParams;
    return {
      ...baseInput,
      referenceAsset: backgroundParams.referenceAsset,
      customPrompt: buildBackgroundPrompt(backgroundParams),
      aiModel: "gemini",
      outputResolution: global.resolution,
    };
  }

  if (step.type === "watermark") {
    const watermarkParams = step.params as WatermarkParams;
    return {
      ...baseInput,
      watermarkType: "text",
      watermarkText: watermarkParams.content,
      watermarkPosition:
        watermarkParams.position === "custom"
          ? watermarkParams.customPosition ?? "bottom-right"
          : watermarkParams.position,
      watermarkOpacity: watermarkParams.opacity / 100,
      outputResolution: toOutputResolution(global.resolution),
    };
  }

  return {
    ...baseInput,
    ...params,
  };
}

function buildBackgroundPrompt(params: BackgroundParams) {
  const bgTypeLabel: Record<string, string> = {
    studio: "纯色棚拍背景，专业柔光",
    scene: "参考图风格的电商场景背景",
    white: "干净白底背景",
    blur: "虚化景深背景",
  };

  return [
    "保持商品主体完全不变，只替换背景",
    bgTypeLabel[params.bgType] ?? "自然融合的电商背景",
    `边缘羽化 ${params.featherEdge}px`,
    params.keepShadow ? "保留自然接触阴影" : "弱化原始阴影",
  ].join("，");
}

function toOutputResolution(resolution: string) {
  const resolutionMap: Record<string, string> = {
    "1k": "1024x1024",
    "2k": "2048x2048",
    "4k": "4096x4096",
  };

  return resolutionMap[resolution] ?? "original";
}

function getStepParamSummary(step: WorkflowStep) {
  if (step.type === "workflow") {
    return step.refTemplateId ? "执行时展开引用工作流" : "引用工作流";
  }

  if (step.type === "scene") {
    const params = step.params as SceneParams;
    return `${SCENE_STYLE_LABELS[params.sceneStyle] ?? params.sceneStyle} · ${params.candidateCount} 张候选`;
  }

  if (step.type === "background") {
    const params = step.params as BackgroundParams;
    const ref = params.referenceAsset ? "已传参考" : "无参考图";
    return `${BG_TYPE_LABELS[params.bgType] ?? params.bgType} · ${ref}`;
  }

  if (step.type === "upscale") {
    const params = step.params as UpscaleParams;
    return `${params.factor}x 放大 · 降噪 ${params.denoise}%`;
  }

  if (step.type === "watermark") {
    const params = step.params as WatermarkParams;
    return `${params.content || "未填水印"} · ${WATERMARK_POSITION_LABELS[params.position]} · ${params.opacity}%`;
  }

  if (step.type === "outpaint") {
    const params = step.params as OutpaintParams;
    return `${OUTPAINT_DIRECTION_LABELS[params.direction] ?? params.direction}扩展 · ${params.ratio}%`;
  }

  return step.description;
}

export default function ComboPage() {
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateType[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { upload, uploading } = useUpload();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Runtime settings
  const [batchCount, setBatchCount] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("2k");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Product upload
  const [productAssets, setProductAssets] = useState<InputAssetRef[]>([]);
  const [uploadingProductAssets, setUploadingProductAssets] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  // Add step drawer
  const [addStepOpen, setAddStepOpen] = useState(false);

  // Save template drawer
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateSaveData, setTemplateSaveData] = useState({ name: "", category: "" });

  // Workflow preview drawer
  const [workflowPreviewOpen, setWorkflowPreviewOpen] = useState(false);
  const [previewingWorkflowId, setPreviewingWorkflowId] = useState<string | null>(null);
  const [mobileStage, setMobileStage] = useState<MobileWorkflowStage>("workflow");
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
      }
    };
    loadTemplates();
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
  const selectedTemplateName = selectedTemplate
    ? templates.find((t) => t.id === selectedTemplate)?.name ?? null
    : null;

  const handleExecute = async () => {
    if (steps.length === 0) return;
    if (productAssets.length === 0) {
      alert("请先上传商品图片");
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

      const global = { batchCount, aspectRatio, resolution, watermarkEnabled, autoRetry };

      // 映射展开后的步骤为任务（均为可执行叶子步骤）
      const tasks = expandedSteps.map((step) => {
        // 此时 step.type 不应为 "workflow"，因为已经展开
        const execType = step.type as ExecutableStepType;
        const inputDataObj = {
          ...JSON.parse(JSON.stringify(normalizeStepTaskInput(step, global))),
          inputAsset: productAssets[0],
        };
        return {
          type: TYPE_TO_API[execType],
          inputData: JSON.stringify(inputDataObj),
          totalSteps: 1,
        };
      });

      await apiPost("/api/tasks", tasks);
      window.location.href = "/tasks";
    } catch (error) {
      setExecuting(false);
      console.error("执行批量处理失败:", error);
      alert("执行批量处理失败，请重试");
    }
  };

  // Save current workflow as template
  const handleSave = async () => {
    if (!templateSaveData.name.trim()) {
      alert("模板名称不能为空");
      return;
    }
    try {
      await apiPost<PostWorkflowTemplateResponse>("/api/workflow-templates", {
        name: templateSaveData.name,
        description: "",
        category: templateSaveData.category || undefined,
        steps: steps,
        globalParams: {
          batchCount,
          aspectRatio,
          resolution,
          watermarkEnabled,
          autoRetry,
        },
        tags: [],
      });
      // Reload templates
      const res = await apiGet<GetWorkflowTemplatesResponse>(
        "/api/workflow-templates"
      );
      setWorkflowTemplates(res.templates || []);
      setSaveTemplateOpen(false);
      setTemplateSaveData({ name: "", category: "" });
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
      setBatchCount(template.globalParams?.batchCount ?? 10);
      setAspectRatio(template.globalParams?.aspectRatio ?? "1:1");
      setResolution(template.globalParams?.resolution ?? "2k");
      setWatermarkEnabled(template.globalParams?.watermarkEnabled ?? true);
      setAutoRetry(template.globalParams?.autoRetry ?? true);
    }
  };

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
          <section className="glass-panel rounded-[20px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-ink">工作流模板</h2>
                <p className="hidden">
                  选已有工作流或新建空白
                </p>
              </div>
              {selectedTemplate && (
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[12px] font-semibold text-brand-text">
                  已选
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {templates.length === 0 ? (
                <p className="col-span-2 text-[13px] text-ink-3">暂无工作流模板，开始新建吧</p>
              ) : (
                templates.map((tpl) => {
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
                        "relative flex min-h-[116px] cursor-pointer flex-col justify-between gap-3 rounded-[18px] border p-3 text-left transition-all",
                        active
                          ? "border-brand bg-brand-soft shadow-soft"
                          : "border-line bg-surface hover:border-brand/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                          <Layers className="h-5 w-5" />
                        </span>
                        <span className="rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink-3">
                          {tpl.steps.length} 步
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[14px] font-semibold leading-5 text-ink">{tpl.name}</span>
                        <span className="mt-1 block text-[12px] text-ink-3">
                          {tpl.isSystem ? "系统模板" : "自定义模板"}
                        </span>
                      </div>
                      {!tpl.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl.id);
                          }}
                          className="absolute right-3 top-14 text-ink-3 hover:text-danger"
                          aria-label="删除模板"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <Button
              type="button"
              onClick={() => setMobileStage("params")}
              className="mt-4 h-12 w-full rounded-full bg-accent-gradient text-[14px] font-semibold text-white shadow-soft"
            >
              继续填写参数
              <ChevronRight className="h-4 w-4" />
            </Button>
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

          <section className="mt-4 glass-panel rounded-[20px]">
            <MobileGlobalSettings
              selectedTemplateName={selectedTemplateName}
              batchCount={batchCount}
              setBatchCount={setBatchCount}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              resolution={resolution}
              setResolution={setResolution}
              watermarkEnabled={watermarkEnabled}
              setWatermarkEnabled={setWatermarkEnabled}
              autoRetry={autoRetry}
              setAutoRetry={setAutoRetry}
            />
          </section>

          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-ink">步骤参数</h2>
                <p className="hidden">
                  系统按当前工作流汇总需要填写的参数
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileStage("arrange")}
                className="h-9 rounded-full bg-accent-gradient px-3 text-[12px] font-semibold text-white shadow-soft"
              >
                去编排
              </button>
            </div>
            <div className="grid gap-2">
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
                    className={cn(
                      "glass-panel flex min-h-[76px] w-full items-center gap-3 rounded-[18px] p-3 text-left transition-all",
                      isRefInvalid && "opacity-60"
                    )}
                  >
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
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-[12px] font-bold text-white">
                        {step.order}
                      </span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
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
                        <span className="mt-0.5 block truncate text-[12px] leading-4 text-ink-3">
                          {isRefInvalid ? "引用已失效" : getStepParamSummary(step)}
                        </span>
                      </span>
                    </button>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                  </div>
                );
              })}
            </div>
          </section>
          </>
          )}

          {mobileStage === "arrange" && (
          <section className="mt-1">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-ink">处理流水线</h2>
                <p className="hidden">
                  长按拖动排序，点击步骤可编辑参数
                </p>
              </div>
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-2">
                {steps.length}/5
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {steps.map((step) => {
                const Icon = STEP_META[step.type].icon;
                const isSelected = selectedStepId === step.id;
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
                    onPointerMove={moveStepDragPointer}
                    className={cn(
                      "glass-panel flex min-h-[82px] w-full items-center gap-3 rounded-[18px] p-3 text-left transition-all",
                      isSelected && "ring-2 ring-brand",
                      isDragging && "scale-[0.98] opacity-75 ring-2 ring-brand",
                      isDragOver && "translate-y-0.5 border-brand",
                      isRefInvalid && "opacity-60"
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`拖动 ${step.name}`}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startStepDrag(step.id);
                      }}
                      onPointerMove={moveStepDragPointer}
                      onPointerUp={endStepDrag}
                      onPointerCancel={endStepDrag}
                      className="flex h-11 w-8 shrink-0 touch-none items-center justify-center rounded-full text-ink-3 active:bg-surface-muted"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
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
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-[12px] font-bold text-white">
                        {step.order}
                      </span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
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
                        <span className="mt-0.5 block truncate text-[12px] leading-4 text-ink-3">
                          {isRefInvalid ? "引用已失效" : getStepParamSummary(step)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`删除 ${step.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStep(step.id);
                      }}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-3 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
                      "flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed text-[14px] font-semibold transition-colors",
                      steps.length >= 5
                        ? "cursor-not-allowed border-line text-ink-3"
                        : "border-line-strong text-ink-2 hover:border-brand hover:text-brand"
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    添加处理步骤
                  </button>
                }
                onOpenChange={setAddStepOpen}
              />
            </div>
          </section>
          )}
        </div>

        {/* 移动端：步骤参数抽屉 */}
        {selectedStep && selectedStep.type !== "workflow" && (
          <DrawerRoot
            open={isMobile && selectedStepId !== null}
            onOpenChange={(open: boolean) => {
              if (!open) setSelectedStepId(null);
            }}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{selectedStep.name}</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 pt-2">
                {selectedStep.type === "scene" && (
                  <SceneStepParams
                    params={selectedStep.params as SceneParams}
                    onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  />
                )}
                {selectedStep.type === "background" && (
                  <BackgroundStepParams
                    params={selectedStep.params as BackgroundParams}
                    onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  />
                )}
                {selectedStep.type === "upscale" && (
                  <UpscaleStepParams
                    params={selectedStep.params as UpscaleParams}
                    onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  />
                )}
                {selectedStep.type === "watermark" && (
                  <WatermarkStepParams
                    params={selectedStep.params as WatermarkParams}
                    aspectRatio={aspectRatio}
                    onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  />
                )}
                {selectedStep.type === "outpaint" && (
                  <OutpaintStepParams
                    params={selectedStep.params as OutpaintParams}
                    onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                  />
                )}
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button
                    className="h-12 w-full rounded-full bg-accent-gradient text-[14px] font-semibold text-white"
                    onClick={() => setSelectedStepId(null)}
                  >
                    完成
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </DrawerRoot>
        )}

        {/* 移动端：保存模板抽屉 */}
        <DrawerRoot open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>保存为常用模板</DrawerTitle>
            </DrawerHeader>
            <div className="flex flex-col gap-4 px-4 pb-4">
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
              <div className="flex gap-2">
                <DrawerClose asChild>
                  <Button variant="outline" className="h-12 flex-1 rounded-full">
                    取消
                  </Button>
                </DrawerClose>
                <Button
                  onClick={handleSave}
                  className="h-12 flex-1 rounded-full bg-accent-gradient text-white font-semibold"
                >
                  保存
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setSaveTemplateOpen(true)}
              variant="outline"
              className="h-12 shrink-0 rounded-full border-line-strong bg-surface px-4 text-[13px] font-semibold"
            >
              <Bookmark className="h-4 w-4" />
              保存
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executing || steps.length === 0}
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
              {templates.length === 0 ? (
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
                onClick={() => setSaveTemplateOpen(true)}
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
          <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-l border-line bg-surface-glass backdrop-blur-[20px] backdrop-saturate-150">
            {selectedStep && selectedStep.type !== "workflow" ? (
              <StepParamPanel
                step={selectedStep}
                onClose={() => setSelectedStepId(null)}
                onCollapse={() => setRightCollapsed(true)}
                onChange={(patch) => updateStepParams(selectedStep.id, patch)}
                aspectRatio={aspectRatio}
              />
            ) : (
              <GlobalSettingsPanel
                onCollapse={() => setRightCollapsed(true)}
                selectedTemplateName={
                  selectedTemplate
                    ? templates.find((t) => t.id === selectedTemplate)?.name ?? null
                    : null
                }
                batchCount={batchCount}
                setBatchCount={setBatchCount}
                aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio}
                resolution={resolution}
                setResolution={setResolution}
                watermarkEnabled={watermarkEnabled}
                setWatermarkEnabled={setWatermarkEnabled}
                autoRetry={autoRetry}
                setAutoRetry={setAutoRetry}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ─── Right: global settings ─────────────────────────────────────── */

function GlobalSettingsPanel({
  onCollapse,
  selectedTemplateName,
  batchCount,
  setBatchCount,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  watermarkEnabled,
  setWatermarkEnabled,
  autoRetry,
  setAutoRetry,
}: {
  onCollapse: () => void;
  selectedTemplateName: string | null;
  batchCount: number;
  setBatchCount: (_count: number) => void;
  aspectRatio: string;
  setAspectRatio: (_value: string) => void;
  resolution: string;
  setResolution: (_value: string) => void;
  watermarkEnabled: boolean;
  setWatermarkEnabled: (_value: boolean) => void;
  autoRetry: boolean;
  setAutoRetry: (_value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-brand" />
          <span className="text-data font-semibold text-ink">全局执行设置</span>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          className="rounded-md p-1 text-ink-3 hover:bg-surface-muted hover:text-ink"
          aria-label="折叠"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">方案信息</Label>
        <div className="rounded-[14px] border border-line bg-surface p-3">
          <p className="truncate text-[13px] font-semibold text-ink">
            {selectedTemplateName ?? "未选择模板"}
          </p>
          <p className="mt-0.5 hidden text-[12px] text-ink-3 md:block">
            {selectedTemplateName ? "已加载该模板的步骤和参数" : "从左侧选择一个工作流模板"}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">批量数量</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={batchCount}
          onChange={(e) => setBatchCount(Number(e.target.value))}
          className="h-9 rounded-[11px]"
        />
        <p className="hidden text-[11px] text-ink-3 md:block">单次最多处理 100 张图片</p>
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">画面比例</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {ASPECT_RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setAspectRatio(r.id)}
              className={cn(
                "rounded-[10px] border px-1 py-1.5 text-[11px] font-semibold transition-colors",
                aspectRatio === r.id
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <Label className="text-caption font-medium text-ink-3">输出清晰度</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setResolution(r.id)}
              className={cn(
                "rounded-[10px] border px-1 py-2 text-[11px] font-semibold transition-colors",
                resolution === r.id
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-line" />

      <div className="flex items-center justify-between">
        <Label className="cursor-pointer text-data text-ink">自动添加水印</Label>
        <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer text-data text-ink">失败自动重试</Label>
        <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
      </div>
    </div>
  );
}

function MobileGlobalSettings({
  selectedTemplateName,
  batchCount,
  setBatchCount,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  watermarkEnabled,
  setWatermarkEnabled,
  autoRetry,
  setAutoRetry,
}: {
  selectedTemplateName: string | null;
  batchCount: number;
  setBatchCount: (_count: number) => void;
  aspectRatio: string;
  setAspectRatio: (_value: string) => void;
  resolution: string;
  setResolution: (_value: string) => void;
  watermarkEnabled: boolean;
  setWatermarkEnabled: (_value: boolean) => void;
  autoRetry: boolean;
  setAutoRetry: (_value: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-brand" />
        <span className="text-[15px] font-bold text-ink">全局执行设置</span>
      </div>

      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <FieldLabel>{selectedTemplateName ?? "未选择模板"}</FieldLabel>
          <Input
            type="number"
            min={1}
            max={100}
            value={batchCount}
            onChange={(e) => setBatchCount(Number(e.target.value))}
            className="h-11 rounded-[12px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>输出清晰度</FieldLabel>
          <ChipGroup
            value={resolution}
            onChange={setResolution}
            options={RESOLUTIONS}
            cols={3}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <FieldLabel>画面比例</FieldLabel>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio.id}
              type="button"
              onClick={() => setAspectRatio(ratio.id)}
              className={cn(
                "h-9 min-w-14 shrink-0 rounded-full border px-3 text-[12px] font-semibold transition-colors",
                aspectRatio === ratio.id
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2"
              )}
            >
              {ratio.label}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-[14px] border border-line bg-surface px-3">
          <Label className="cursor-pointer text-[12px] font-semibold text-ink">自动水印</Label>
          <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-2 rounded-[14px] border border-line bg-surface px-3">
          <Label className="cursor-pointer text-[12px] font-semibold text-ink">失败重试</Label>
          <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
        </div>
      </div>
    </div>
  );
}

function MobileStepSettings({
  step,
  onClose,
  onChange,
  aspectRatio,
}: {
  step: WorkflowStep;
  onClose: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
  aspectRatio: string;
}) {
  const Icon = STEP_META[step.type].icon;
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-brand-soft text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-ink">{step.name}</p>
            <p className="hidden text-[12px] text-ink-3 md:block">步骤 {step.order} 参数</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 shrink-0 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-surface-muted"
        >
          收起
        </button>
      </div>

      {step.type === "scene" && (
        <SceneStepParams params={step.params as SceneParams} onChange={onChange} />
      )}
      {step.type === "background" && (
        <BackgroundStepParams params={step.params as BackgroundParams} onChange={onChange} />
      )}
      {step.type === "upscale" && (
        <UpscaleStepParams params={step.params as UpscaleParams} onChange={onChange} />
      )}
      {step.type === "watermark" && (
        <WatermarkStepParams
          params={step.params as WatermarkParams}
          aspectRatio={aspectRatio}
          onChange={onChange}
        />
      )}
      {step.type === "outpaint" && (
        <OutpaintStepParams params={step.params as OutpaintParams} onChange={onChange} />
      )}
    </div>
  );
}

/* ─── Right: per-step parameters ─────────────────────────────────── */

function StepParamPanel({
  step,
  onClose,
  onCollapse,
  onChange,
  aspectRatio,
}: {
  step: WorkflowStep;
  onClose: () => void;
  onCollapse: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
  aspectRatio: string;
}) {
  // 仅用于非 workflow 步，类型保证由调用处进行
  if (step.type === "workflow") {
    return null;
  }

  const Icon = STEP_META[step.type].icon;
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-ink-2 hover:bg-surface-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-data font-semibold">{step.name}</span>
        </button>
        <button
          type="button"
          onClick={onCollapse}
          className="rounded-md p-1 text-ink-3 hover:bg-surface-muted hover:text-ink"
          aria-label="折叠"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2.5 rounded-[14px] bg-brand-soft p-3 text-brand-text">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] font-semibold">步骤 {step.order} · {step.name}</span>
      </div>

      {step.type === "scene" && (
        <SceneStepParams params={step.params as SceneParams} onChange={onChange} />
      )}
      {step.type === "background" && (
        <BackgroundStepParams params={step.params as BackgroundParams} onChange={onChange} />
      )}
      {step.type === "upscale" && (
        <UpscaleStepParams params={step.params as UpscaleParams} onChange={onChange} />
      )}
      {step.type === "watermark" && (
        <WatermarkStepParams
          params={step.params as WatermarkParams}
          aspectRatio={aspectRatio}
          onChange={onChange}
        />
      )}
      {step.type === "outpaint" && (
        <OutpaintStepParams params={step.params as OutpaintParams} onChange={onChange} />
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-caption font-medium text-ink-3">{children}</Label>;
}

function SliderRow({
  label,
  value,
  suffix,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  suffix?: string;
  min: number;
  max: number;
  step?: number;
  onChange: (_value: number) => void;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] font-semibold text-brand-text">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </section>
  );
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  cols = 2,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (_value: T) => void;
  cols?: number;
}) {
  const colClass =
    cols === 5 ? "grid-cols-5" : cols === 4 ? "grid-cols-4" : cols === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className={cn("grid gap-1.5", colClass)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-[10px] border px-2 py-2 text-[12px] font-semibold transition-colors",
            value === o.id
              ? "border-brand bg-brand-soft text-brand-text"
              : "border-line-strong text-ink-2 hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SceneStepParams({
  params,
  onChange,
}: {
  params: SceneParams;
  onChange: (_patch: Partial<SceneParams>) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>场景风格</FieldLabel>
        <ChipGroup
          value={params.sceneStyle}
          onChange={(v) => onChange({ sceneStyle: v })}
          options={[
            { id: "natural", label: "自然光" },
            { id: "studio", label: "棚拍" },
            { id: "lifestyle", label: "生活场景" },
            { id: "minimal", label: "极简" },
          ]}
        />
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>候选数量</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ candidateCount: n })}
              className={cn(
	                "h-11 w-11 rounded-[12px] border text-[12px] font-semibold transition-colors",
                params.candidateCount === n
                  ? "border-brand bg-brand-soft text-brand-text"
                  : "border-line-strong text-ink-2 hover:text-ink"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function BackgroundStepParams({
  params,
  onChange,
}: {
  params: BackgroundParams;
  onChange: (_patch: Partial<BackgroundParams>) => void;
}) {
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useUpload();

  const handleReferenceUpload = async (file?: File) => {
    if (!file) return;
    try {
      const result = await upload({ reference: file });
      if (result.referenceAsset) {
        onChange({ referenceAsset: result.referenceAsset });
      }
    } catch {
      // useUpload exposes the message through error; keep this panel compact.
    }
  };

  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>参考背景</FieldLabel>
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleReferenceUpload(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        {params.referenceAsset ? (
          <div className="overflow-hidden rounded-[14px] border border-line bg-surface">
            <div className="relative h-32 bg-surface-muted">
              <Image
                src={params.referenceAsset.clientUrl}
                alt="参考背景预览"
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                unoptimized
                className="h-full w-full object-cover"
              />
              <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-ink shadow-soft backdrop-blur"
                  aria-label="替换参考背景"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ referenceAsset: undefined })}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 text-danger shadow-soft backdrop-blur"
                  aria-label="移除参考背景"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="min-w-0 truncate text-[12px] font-semibold text-ink">
                {params.referenceAsset.originalFilename}
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-brand-text">已添加</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => referenceInputRef.current?.click()}
            disabled={uploading}
            className="flex min-h-24 items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong bg-surface text-[13px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "上传中..." : "上传参考图"}
          </button>
        )}
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>背景类型</FieldLabel>
        <ChipGroup
          value={params.bgType}
          onChange={(v) => onChange({ bgType: v })}
          options={[
            { id: "studio", label: "纯色棚拍" },
            { id: "scene", label: "AI 场景" },
            { id: "white", label: "白底" },
            { id: "blur", label: "虚化" },
          ]}
        />
      </section>
      <SliderRow
        label="边缘羽化"
        value={params.featherEdge}
        suffix=" px"
        min={0}
        max={24}
        onChange={(featherEdge) => onChange({ featherEdge })}
      />
      <div className="flex items-center justify-between">
        <Label className="cursor-pointer text-data text-ink">保留主体阴影</Label>
        <Switch
          checked={params.keepShadow}
          onCheckedChange={(keepShadow) => onChange({ keepShadow })}
        />
      </div>
    </>
  );
}

function UpscaleStepParams({
  params,
  onChange,
}: {
  params: UpscaleParams;
  onChange: (_patch: Partial<UpscaleParams>) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>放大倍数</FieldLabel>
        <ChipGroup
          value={String(params.factor) as "2" | "3" | "4"}
          onChange={(v) => onChange({ factor: Number(v) })}
          options={[
            { id: "2", label: "2×" },
            { id: "3", label: "3×" },
            { id: "4", label: "4×" },
          ]}
          cols={3}
        />
      </section>
      <SliderRow
        label="降噪强度"
        value={params.denoise}
        suffix="%"
        min={0}
        max={100}
        onChange={(denoise) => onChange({ denoise })}
      />
    </>
  );
}

function WatermarkStepParams({
  params,
  aspectRatio,
  onChange,
}: {
  params: WatermarkParams;
  aspectRatio: string;
  onChange: (_patch: Partial<WatermarkParams>) => void;
}) {
  return (
    <>
      <WatermarkPositionPreview
        params={params}
        aspectRatio={aspectRatio}
        onChange={onChange}
      />
      <section className="flex flex-col gap-2">
        <FieldLabel>水印内容</FieldLabel>
        <Input
          value={params.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="@品牌名"
          className="h-9 rounded-[11px]"
        />
      </section>
      <section className="flex flex-col gap-2">
        <FieldLabel>水印位置</FieldLabel>
        <ChipGroup
          value={params.position}
          onChange={(v) =>
            onChange({
              position: v as WatermarkParams["position"],
              customPosition: v === "custom" ? params.customPosition : undefined,
            })
          }
          options={[
            { id: "top-left", label: "左上" },
            { id: "top-right", label: "右上" },
            { id: "bottom-left", label: "左下" },
            { id: "bottom-right", label: "右下" },
            { id: "center", label: "居中" },
            { id: "custom", label: "自定义" },
          ]}
          cols={3}
        />
      </section>
      <SliderRow
        label="不透明度"
        value={params.opacity}
        suffix="%"
        min={10}
        max={100}
        onChange={(opacity) => onChange({ opacity })}
      />
    </>
  );
}

function WatermarkPositionPreview({
  params,
  aspectRatio,
  onChange,
}: {
  params: WatermarkParams;
  aspectRatio: string;
  onChange: (_patch: Partial<WatermarkParams>) => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const watermarkRef = useRef<HTMLSpanElement>(null);
  const previewText = params.content.trim() || "@品牌名";
  const aspectStyle = useMemo(() => {
    const [rawWidth, rawHeight] = aspectRatio.split(":").map(Number);
    const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 1;
    const height = Number.isFinite(rawHeight) && rawHeight > 0 ? rawHeight : 1;
    return {
      aspectRatio: `${width} / ${height}`,
      maxWidth: height > width ? `min(100%, ${(52 * width) / height}vh)` : "100%",
    };
  }, [aspectRatio]);

  const getPresetPosition = useCallback((
    position: WatermarkPresetPosition | "custom",
    editorWidth: number,
    editorHeight: number,
    markWidth: number,
    markHeight: number
  ) => {
    const padding = 12;
    switch (position) {
      case "top-left":
        return { x: padding, y: padding };
      case "top-right":
        return { x: editorWidth - markWidth - padding, y: padding };
      case "bottom-left":
        return { x: padding, y: editorHeight - markHeight - padding };
      case "center":
        return {
          x: (editorWidth - markWidth) / 2,
          y: (editorHeight - markHeight) / 2,
        };
      case "bottom-right":
      case "custom":
      default:
        return {
          x: editorWidth - markWidth - padding,
          y: editorHeight - markHeight - padding,
        };
    }
  }, []);

  const updateWatermarkElement = useCallback(() => {
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    if (!preview || !watermark) return;

    const editorWidth = preview.clientWidth;
    const editorHeight = preview.clientHeight;
    const markWidth = watermark.offsetWidth;
    const markHeight = watermark.offsetHeight;
    const raw =
      params.position === "custom" && params.customPosition
        ? {
            x: (params.customPosition.x / params.customPosition.editorWidth) * editorWidth,
            y: (params.customPosition.y / params.customPosition.editorHeight) * editorHeight,
          }
        : getPresetPosition(params.position, editorWidth, editorHeight, markWidth, markHeight);
    const x = clamp(raw.x, 0, Math.max(0, editorWidth - markWidth));
    const y = clamp(raw.y, 0, Math.max(0, editorHeight - markHeight));

    watermark.style.left = `${x}px`;
    watermark.style.top = `${y}px`;
  }, [getPresetPosition, params.customPosition, params.position]);

  useEffect(() => {
    updateWatermarkElement();
  }, [updateWatermarkElement, previewText, aspectRatio]);

  const handlePointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.buttons !== 1) return;
    updateCustomPosition(event);
  };

  const updateCustomPosition = (event: PointerEvent<HTMLSpanElement>) => {
    const preview = previewRef.current;
    const watermark = watermarkRef.current;
    if (!preview || !watermark) return;

    const rect = preview.getBoundingClientRect();
    const markWidth = watermark.offsetWidth;
    const markHeight = watermark.offsetHeight;
    const x = clamp(event.clientX - rect.left - markWidth / 2, 0, Math.max(0, rect.width - markWidth));
    const y = clamp(event.clientY - rect.top - markHeight / 2, 0, Math.max(0, rect.height - markHeight));

    watermark.style.left = `${x}px`;
    watermark.style.top = `${y}px`;
    onChange({
      position: "custom",
      customPosition: {
        x: Math.round(x),
        y: Math.round(y),
        editorWidth: Math.round(rect.width),
        editorHeight: Math.round(rect.height),
      },
    });
  };

  return (
    <section className="flex flex-col gap-2">
      <FieldLabel>位置预览</FieldLabel>
      <div
        ref={previewRef}
        className="relative mx-auto max-h-[52vh] min-h-40 w-full touch-none overflow-hidden rounded-[14px] border border-line bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_48%,#dbeafe_100%)]"
        style={aspectStyle}
      >
        <div className="absolute inset-x-8 bottom-8 h-[44%] rounded-t-[40%] bg-white/70 shadow-soft" />
        <div className="absolute left-1/2 top-[44%] h-16 w-16 -translate-x-1/2 rounded-[18px] bg-surface shadow-float ring-1 ring-line" />
        <div className="absolute left-1/2 top-[47%] h-8 w-20 -translate-x-1/2 rounded-full bg-brand-soft/80" />
        <span
          ref={watermarkRef}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updateCustomPosition(event);
          }}
          onPointerMove={handlePointerMove}
          className="absolute max-w-[72%] cursor-grab select-none rounded-full bg-ink px-2.5 py-1 text-[11px] font-semibold text-white shadow-soft active:cursor-grabbing"
          style={{ opacity: Math.max(0.1, params.opacity / 100) }}
        >
          {previewText}
        </span>
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function OutpaintStepParams({
  params,
  onChange,
}: {
  params: OutpaintParams;
  onChange: (_patch: Partial<OutpaintParams>) => void;
}) {
  return (
    <>
      <section className="flex flex-col gap-2">
        <FieldLabel>扩展方向</FieldLabel>
        <ChipGroup
          value={params.direction}
          onChange={(v) => onChange({ direction: v })}
          options={[
            { id: "all", label: "四周扩展" },
            { id: "horizontal", label: "左右" },
            { id: "vertical", label: "上下" },
          ]}
          cols={3}
        />
      </section>
      <SliderRow
        label="扩展比例"
        value={params.ratio}
        suffix="%"
        min={10}
        max={80}
        onChange={(ratio) => onChange({ ratio })}
      />
    </>
  );
}

/* ─── Collapsed sidebar rail ─────────────────────────────────────── */

function CollapsedRail({
  side,
  label,
  onExpand,
}: {
  side: "left" | "right";
  label: string;
  onExpand: () => void;
}) {
  const Chevron = side === "left" ? ChevronRight : ChevronLeft;
  return (
    <aside
      className={cn(
        "flex w-12 shrink-0 flex-col items-center gap-3 bg-surface-glass py-4 backdrop-blur-[20px] backdrop-saturate-150",
        side === "left" ? "border-r border-line" : "border-l border-line"
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className="rounded-md p-1.5 text-ink-2 hover:bg-surface-muted hover:text-ink"
        aria-label="展开"
      >
        <Chevron className="h-4 w-4" />
      </button>
      <div
        className="select-none text-[12px] font-semibold tracking-widest text-ink-3"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </div>
    </aside>
  );
}
