"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { BrandLogo, BrandImageFallback } from "@/components/brands/SpriteImage";
import {
  Settings,
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
  ChevronRight,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const SCENE_CATEGORIES = [
  { id: "daily", label: "日常场景" },
  { id: "marketing", label: "营销场景" },
  { id: "festival", label: "节日氛围" },
  { id: "outdoor", label: "户外场景" },
  { id: "indoor", label: "室内场景" },
];

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

type StepType = "scene" | "background" | "upscale" | "watermark" | "outpaint";

interface WorkflowStep {
  id: string;
  order: number;
  type: StepType;
  name: string;
  description: string;
}

const STEP_META: Record<StepType, { icon: React.ElementType; color: string }> = {
  scene: { icon: ImageIcon, color: "bg-primary-soft text-primary" },
  background: { icon: Wand2, color: "bg-primary-soft text-primary" },
  upscale: { icon: ZoomIn, color: "bg-primary-soft text-primary" },
  watermark: { icon: Droplets, color: "bg-primary-soft text-primary" },
  outpaint: { icon: Expand, color: "bg-primary-soft text-primary" },
};

const INITIAL_STEPS: WorkflowStep[] = [
  {
    id: "s1",
    order: 1,
    type: "scene",
    name: "生成场景图",
    description: "基于模板自动生成商品场景图",
  },
  {
    id: "s2",
    order: 2,
    type: "background",
    name: "AI换背景",
    description: "智能替换背景，融合光影",
  },
  {
    id: "s3",
    order: 3,
    type: "watermark",
    name: "水印与尺寸调整",
    description: "添加品牌水印，调整输出尺寸",
  },
];

/* ------------------------------------------------------------------ */
/*  TopNav (shared pattern)                                            */
/* ------------------------------------------------------------------ */

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <BrandLogo />
      </Link>
      <nav className="flex items-center gap-6">
        <Link
          href="/"
          className="text-data text-muted-foreground hover:text-foreground transition-colors"
         
        >
          首页
        </Link>
        <Link
          href="/templates"
          className="text-data text-muted-foreground hover:text-foreground transition-colors"
         
        >
          模板库
        </Link>
        <Link
          href="/tasks"
          className="text-data text-muted-foreground hover:text-foreground transition-colors"
         
        >
          任务中心
        </Link>
        <Link
          href="/results"
          className="text-data text-muted-foreground hover:text-foreground transition-colors"
         
        >
          结果管理
        </Link>
        <Link
          href="/settings"
          className="text-data text-muted-foreground hover:text-foreground transition-colors"
         
        >
          设置
        </Link>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ComboPage() {
  const [activeCategory, setActiveCategory] = useState("daily");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);
  const [batchCount, setBatchCount] = useState(10);
  const [resolution, setResolution] = useState("1024x1024");
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [executing, setExecuting] = useState(false);

  // Use legacy task type names that the worker recognizes
  const typeToApiType: Record<StepType, string> = {
    scene: "BACKGROUND_REMOVAL",
    background: "BACKGROUND_REMOVAL",
    upscale: "IMAGE_UPSCALING",
    watermark: "WATERMARK",
    outpaint: "IMAGE_EXPANSION",
  };

  const handleExecute = async () => {
    if (steps.length === 0) return;
    setExecuting(true);
    try {
      const tasks = steps.map((step) => ({
        type: typeToApiType[step.type],
        inputData: JSON.stringify({
          resolution,
          watermarkEnabled,
          autoRetry,
          batchCount,
          stepName: step.name,
        }),
        totalSteps: 1,
      }));
      await apiPost("/api/tasks", tasks);
      window.location.href = "/tasks";
    } catch {
      setExecuting(false);
    }
  };

  /* ---- step helpers ---- */
  const addStep = () => {
    const available: StepType[] = ["scene", "background", "upscale", "watermark", "outpaint"];
    const used = new Set(steps.map((s) => s.type));
    const nextType = available.find((t) => !used.has(t)) ?? "upscale";
    const nextOrder = steps.length + 1;
    const names: Record<StepType, string> = {
      scene: "生成场景图",
      background: "AI换背景",
      upscale: "高清放大",
      watermark: "水印与尺寸调整",
      outpaint: "智能扩图",
    };
    const descriptions: Record<StepType, string> = {
      scene: "基于模板自动生成商品场景图",
      background: "智能替换背景，融合光影",
      upscale: "AI 超分辨率放大，提升清晰度",
      watermark: "添加品牌水印，调整输出尺寸",
      outpaint: "智能扩展画布，补充画面内容",
    };
    setSteps((prev) => [
      ...prev,
      {
        id: `s${Date.now()}`,
        order: nextOrder,
        type: nextType,
        name: names[nextType],
        description: descriptions[nextType],
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, order: idx + 1 }))
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const copy = [...steps];
    const [removed] = copy.splice(index, 1);
    copy.splice(newIndex, 0, removed);
    setSteps(copy.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const templates = SCENE_TEMPLATES[activeCategory] ?? [];

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopNav />

      {/* Header */}
      <div className="px-8 py-5 flex items-center justify-between shrink-0 border-b border-border">
        <div>
          <h1
            className="text-h3 font-semibold text-foreground"
           
          >
            智能组合
          </h1>
          <p
            className="text-data text-muted-foreground mt-0.5"
           
          >
            拖拽编排处理流程，一键批量执行多个 AI 处理步骤
          </p>
        </div>
      </div>

      {/* Three-column workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* ---------- Left Sidebar (~260px) ---------- */}
        <aside className="w-[260px] border-r border-border bg-muted/30 flex flex-col shrink-0">
          {/* Category tabs */}
          <div className="px-3 pt-3 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {SCENE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedTemplate(null);
                  }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-caption font-medium transition-colors",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                 
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <div className="grid grid-cols-2 gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id)}
                  className={cn(
                    "group relative aspect-square rounded-lg border overflow-hidden transition-all",
                    selectedTemplate === tpl.id
                      ? "border-primary ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <BrandImageFallback
                    title={tpl.name}
                    description="组合模板"
                    pose={activeCategory === "marketing" ? "cheer" : "star"}
                    className="absolute inset-0"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <span
                      className="text-[11px] text-white font-medium leading-tight block truncate"
                     
                    >
                      {tpl.name}
                    </span>
                  </div>
                  {selectedTemplate === tpl.id && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ---------- Center Pipeline Editor ---------- */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-xl mx-auto space-y-4">
              {steps.map((step, index) => {
                const meta = STEP_META[step.type];
                const Icon = meta.icon;
                return (
                  <div
                    key={step.id}
                    className="group relative rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
                  >
                    {/* Order badge */}
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-caption font-bold shadow-sm">
                      {step.order}
                    </div>

                    <div className="flex items-center gap-4 pl-3">
                      {/* Drag handle */}
                      <button
                        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
                        title="拖拽排序"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>

                      {/* Icon */}
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          meta.color
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-data font-medium text-foreground"
                         
                        >
                          {step.name}
                        </h3>
                        <p
                          className="text-caption text-muted-foreground mt-0.5 truncate"
                         
                        >
                          {step.description}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {index > 0 && (
                          <button
                            onClick={() => moveStep(index, -1)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="上移"
                          >
                            <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg]" />
                          </button>
                        )}
                        {index < steps.length - 1 && (
                          <button
                            onClick={() => moveStep(index, 1)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="下移"
                          >
                            <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                          </button>
                        )}
                        <button
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                          title="设置"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeStep(step.id)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Connector line */}
                    {index < steps.length - 1 && (
                      <div className="absolute -bottom-3 left-6 w-px h-3 bg-primary" />
                    )}
                  </div>
                );
              })}

              {/* Add step button */}
              <button
                onClick={addStep}
                disabled={steps.length >= 5}
                className={cn(
                  "w-full rounded-xl border-2 border-dashed p-4 flex items-center justify-center gap-2 transition-colors",
                  steps.length >= 5
                    ? "border-border text-muted-foreground cursor-not-allowed"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary"
                )}
              >
                <Plus className="w-4 h-4" />
                <span
                  className="text-data font-medium"
                 
                >
                  添加处理步骤
                </span>
              </button>
            </div>
          </div>
        </main>

        {/* ---------- Right Sidebar (~320px) ---------- */}
        <aside className="w-[320px] border-l border-border bg-muted/30 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Section title */}
            <h2
              className="text-data font-semibold text-foreground"
             
            >
              方案信息
            </h2>

            {/* 生成场景模板 */}
            <section className="space-y-2.5">
              <Label
                className="text-caption font-medium text-muted-foreground"
               
              >
                生成场景模板
              </Label>
              <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                  <BrandImageFallback
                    title=""
                    description=""
                    pose={selectedTemplate ? "cheer" : "think"}
                    className="[&_p]:hidden"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-data font-medium text-foreground truncate"
                   
                  >
                    {selectedTemplate
                      ? templates.find((t) => t.id === selectedTemplate)?.name ?? "未选择"
                      : "未选择模板"}
                  </p>
                  <p
                    className="text-caption text-muted-foreground"
                   
                  >
                    {selectedTemplate
                      ? SCENE_CATEGORIES.find((c) => c.id === activeCategory)?.label ?? ""
                      : "从左侧面板选择一个模板"}
                  </p>
                </div>
              </div>
            </section>

            {/* 批量产品图片数量 */}
            <section className="space-y-2.5">
              <Label
                className="text-caption font-medium text-muted-foreground"
               
              >
                批量产品图片数量
              </Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={batchCount}
                onChange={(e) => setBatchCount(Number(e.target.value))}
                className="h-9"
              />
              <p
                className="text-caption text-muted-foreground"
               
              >
                单次最多处理 100 张图片
              </p>
            </section>

            {/* 执行设置 */}
            <section className="space-y-3">
              <Label
                className="text-caption font-medium text-muted-foreground"
               
              >
                执行设置
              </Label>

              {/* Resolution */}
              <div className="space-y-1.5">
                <Label
                  className="text-caption text-muted-foreground"
                 
                >
                  输出分辨率
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {["1024x1024", "1024x1536", "1536x1024"].map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={cn(
                        "px-2 py-1.5 rounded-md border text-caption font-medium transition-colors",
                        resolution === res
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                     
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label
                    className="text-data text-foreground cursor-pointer"
                   
                  >
                    自动添加水印
                  </Label>
                  <Switch
                    checked={watermarkEnabled}
                    onCheckedChange={setWatermarkEnabled}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    className="text-data text-foreground cursor-pointer"
                   
                  >
                    失败自动重试
                  </Label>
                  <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
                </div>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
               
              >
                <Bookmark className="w-4 h-4 mr-2" />
                保存为常用模板
              </Button>
              <Button
                variant="brand"
                className="w-full"
               
                onClick={handleExecute}
                disabled={executing || steps.length === 0}
              >
                {executing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {executing ? "提交中..." : "执行批量处理"}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
