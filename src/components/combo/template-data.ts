import type { BottomSheetSelectOption } from "@/components/workbench/BottomSheetSelect";
import type { ExecutableStepType, WorkflowStep } from "@/components/combo/types";

export interface WorkflowTemplateType {
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
import { STEP_META } from "@/components/combo/step-meta";


export const SCENE_CATEGORIES = [
  { id: "daily", label: "日常" },
  { id: "marketing", label: "营销" },
  { id: "festival", label: "节日" },
  { id: "outdoor", label: "户外" },
  { id: "indoor", label: "室内" },
];

export const TEMPLATE_PREVIEWS: Record<string, string> = {
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

export const CATEGORY_FALLBACK_PREVIEWS: Record<string, string> = {
  daily: "/scene-presets/scene-elegant.webp",
  marketing: "/scene-presets/scene-business.webp",
  festival: "/scene-presets/scene-festival.webp",
  outdoor: "/scene-presets/scene-outdoor.webp",
  indoor: "/scene-presets/scene-lifestyle.webp",
};

export const SCENE_TEMPLATES: Record<string, { id: string; name: string }[]> = {
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

export function getTemplatePreview(templateId: string, categoryId: string) {
  return TEMPLATE_PREVIEWS[templateId] ?? CATEGORY_FALLBACK_PREVIEWS[categoryId] ?? "/scene-presets/scene-elegant.webp";
}

export const WORKFLOW_COVERS = [
  "from-neutral-700 to-neutral-900",
  "from-sky-500 to-cyan-400",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-indigo-500 to-blue-500",
];

export function getStepOptions(
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

