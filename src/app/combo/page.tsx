"use client";

import { useMemo, useState, useEffect } from "react";
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
import { BottomSheetSelect } from "@/components/workbench/BottomSheetSelect";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { apiPost, apiGet } from "@/lib/api-client";
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

type StepType = "scene" | "background" | "upscale" | "watermark" | "outpaint";

interface SceneParams { sceneStyle: string; candidateCount: number }
interface BackgroundParams { bgType: string; featherEdge: number; keepShadow: boolean }
interface UpscaleParams { factor: number; denoise: number }
interface WatermarkParams { content: string; position: string; opacity: number }
interface OutpaintParams { direction: string; ratio: number }

type StepParams =
  | { type: "scene"; params: SceneParams }
  | { type: "background"; params: BackgroundParams }
  | { type: "upscale"; params: UpscaleParams }
  | { type: "watermark"; params: WatermarkParams }
  | { type: "outpaint"; params: OutpaintParams };

interface WorkflowStep {
  id: string;
  order: number;
  type: StepType;
  name: string;
  description: string;
  params: StepParams["params"];
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
};

function getStepOptions() {
  const types: StepType[] = ["scene", "background", "upscale", "watermark", "outpaint"];
  return types.map((type) => {
    const Icon = STEP_META[type].icon;
    return {
      id: type,
      label: STEP_META[type].name,
      description: STEP_META[type].description,
      icon: Icon,
    };
  });
}

const DEFAULT_PARAMS: Record<StepType, StepParams["params"]> = {
  scene: { sceneStyle: "natural", candidateCount: 4 } as SceneParams,
  background: { bgType: "studio", featherEdge: 8, keepShadow: true } as BackgroundParams,
  upscale: { factor: 2, denoise: 30 } as UpscaleParams,
  watermark: { content: "@品牌名", position: "bottom-right", opacity: 70 } as WatermarkParams,
  outpaint: { direction: "all", ratio: 25 } as OutpaintParams,
};

const TYPE_TO_API: Record<StepType, string> = {
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

export default function ComboPage() {
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplateType[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Runtime settings
  const [batchCount, setBatchCount] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("2k");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Add step drawer
  const [addStepOpen, setAddStepOpen] = useState(false);

  // Save template drawer
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateSaveData, setTemplateSaveData] = useState({ name: "", category: "" });

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

  const templates = workflowTemplates;
  const selectedStep = useMemo(
    () => steps.find((s) => s.id === selectedStepId) ?? null,
    [steps, selectedStepId]
  );

  const handleExecute = async () => {
    if (steps.length === 0) return;
    setExecuting(true);
    try {
      const tasks = steps.map((step) => ({
        type: TYPE_TO_API[step.type],
        inputData: JSON.stringify({
          stepType: step.type,
          stepName: step.name,
          stepParams: step.params,
          global: { batchCount, aspectRatio, resolution, watermarkEnabled, autoRetry },
        }),
        totalSteps: 1,
      }));
      await apiPost("/api/tasks", tasks);
      window.location.href = "/tasks";
    } catch {
      setExecuting(false);
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
  const addStep = (stepType: StepType) => {
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

  const updateStepParams = (id: string, patch: Partial<StepParams["params"]>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, params: { ...s.params, ...patch } } : s))
    );
  };

  return (
    <div className="relative h-full flex flex-col bg-background">
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+104px)] pt-3">
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
            <div className="mt-3 flex flex-col gap-2">
              {templates.length === 0 ? (
                <p className="text-[13px] text-ink-3">暂无工作流模板，开始新建吧</p>
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
                        "flex cursor-pointer items-center justify-between gap-2 rounded-[12px] border p-3 text-left transition-all",
                        active
                          ? "border-brand bg-brand-soft"
                          : "border-line bg-surface-muted hover:border-brand/40"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink">{tpl.name}</span>
                        {tpl.description && (
                          <span className="mt-0.5 block text-[11px] text-ink-3 line-clamp-1">
                            {tpl.description}
                          </span>
                        )}
                      </div>
                      {!tpl.isSystem && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tpl.id);
                          }}
                          className="shrink-0 text-ink-3 hover:text-danger"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="mt-4 glass-panel rounded-[20px] p-4">
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
              <Button className="h-11 shrink-0 rounded-[12px] bg-accent-gradient px-4 text-[13px] font-semibold text-white">
                选择
              </Button>
            </div>
          </section>

          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-ink">处理流水线</h2>
                <p className="hidden">
                  点击步骤可编辑参数，使用箭头调整顺序
                </p>
              </div>
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-2">
                {steps.length}/5
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => {
                const Icon = STEP_META[step.type].icon;
                const isSelected = selectedStepId === step.id;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "glass-panel flex min-h-[82px] w-full items-center gap-3 rounded-[18px] p-3 text-left transition-all",
                      isSelected && "ring-2 ring-brand"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedStepId(step.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-[12px] font-bold text-white">
                        {step.order}
                      </span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">{step.name}</span>
                        <span className="mt-0.5 hidden line-clamp-2 text-[12px] leading-4 text-ink-3 md:block">
                          {step.description}
                        </span>
                      </span>
                    </button>
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`上移 ${step.name}`}
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, -1);
                        }}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full text-ink-3 disabled:opacity-35",
                          index !== 0 && "bg-surface-muted"
                        )}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`下移 ${step.name}`}
                        disabled={index === steps.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveStep(index, 1);
                        }}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full text-ink-3 disabled:opacity-35",
                          index !== steps.length - 1 && "bg-surface-muted"
                        )}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                );
              })}
              <BottomSheetSelect
                options={getStepOptions()}
                value=""
                onChange={(value) => {
                  if (typeof value === "string") {
                    addStep(value as StepType);
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

          {!selectedStep && (
            <section className="mt-4 glass-panel rounded-[20px]">
              <MobileGlobalSettings
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
            </section>
          )}
        </div>

        {/* 移动端：步骤参数抽屉 */}
        {selectedStep && (
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
              <div className="glass-panel flex items-center gap-3 rounded-[18px] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
                  <Upload className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">上传商品图片</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    拖入或点击上传，支持批量 · 作为流水线输入
                  </p>
                </div>
                <Button className="h-8 rounded-[10px] bg-accent-gradient px-3.5 text-[13px] font-semibold text-white">
                  选择文件
                </Button>
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
                return (
                  <div key={step.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedStepId(step.id)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-[18px] border p-3.5 text-left transition-all",
                        isSelected
                          ? "glass-panel border-brand ring-2 ring-brand/40"
                          : "border-line bg-surface hover:border-brand/30 hover:shadow-soft"
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
                        <Icon className="h-5 w-5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">
                          {step.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                          {step.description}
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
                options={getStepOptions()}
                value=""
                onChange={(value) => {
                  if (typeof value === "string") {
                    addStep(value as StepType);
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
            {selectedStep ? (
              <StepParamPanel
                step={selectedStep}
                onClose={() => setSelectedStepId(null)}
                onCollapse={() => setRightCollapsed(true)}
                onChange={(patch) => updateStepParams(selectedStep.id, patch)}
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
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center gap-2">
        <Settings2 className="h-4 w-4 text-brand" />
        <span className="text-[15px] font-bold text-ink">全局执行设置</span>
      </div>

      <section className="flex flex-col gap-2">
        <FieldLabel>方案信息</FieldLabel>
        <div className="rounded-[14px] border border-line bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">
            {selectedTemplateName ?? "未选择模板"}
          </p>
          <p className="mt-0.5 hidden text-[12px] text-ink-3 md:block">
            {selectedTemplateName ? "已加载该模板的步骤和参数" : "可先从上方选择一个工作流模板"}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <FieldLabel>批量数量</FieldLabel>
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
        <ChipGroup
          value={aspectRatio}
          onChange={setAspectRatio}
          options={ASPECT_RATIOS}
          cols={5}
        />
      </section>

      <div className="grid gap-3">
        <div className="flex min-h-11 items-center justify-between rounded-[14px] border border-line bg-surface px-3">
          <Label className="cursor-pointer text-data text-ink">自动添加水印</Label>
          <Switch checked={watermarkEnabled} onCheckedChange={setWatermarkEnabled} />
        </div>
        <div className="flex min-h-11 items-center justify-between rounded-[14px] border border-line bg-surface px-3">
          <Label className="cursor-pointer text-data text-ink">失败自动重试</Label>
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
}: {
  step: WorkflowStep;
  onClose: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
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
        <WatermarkStepParams params={step.params as WatermarkParams} onChange={onChange} />
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
}: {
  step: WorkflowStep;
  onClose: () => void;
  onCollapse: () => void;
  onChange: (_patch: Partial<StepParams["params"]>) => void;
}) {
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
        <WatermarkStepParams params={step.params as WatermarkParams} onChange={onChange} />
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
  return (
    <>
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
  onChange,
}: {
  params: WatermarkParams;
  onChange: (_patch: Partial<WatermarkParams>) => void;
}) {
  return (
    <>
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
          onChange={(v) => onChange({ position: v })}
          options={[
            { id: "top-left", label: "左上" },
            { id: "top-right", label: "右上" },
            { id: "bottom-left", label: "左下" },
            { id: "bottom-right", label: "右下" },
            { id: "center", label: "居中" },
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
