/**
 * System Preset Seed Data
 *
 * Static seed data for the template library.
 * Categories: 上架图, 白底图, 场景图, 海报设计, 短视频, 图片处理.
 * Combo presets: 淘宝全套素材, 抖音带货套装.
 *
 * Each preset carries realistic params mapping to existing provider capabilities.
 */

import {
  type TemplatePreset,
  type ComboPreset,
  type PresetCategory,
  type PresetType,
  type PresetToolType,
} from "@/types/workbench";

// ---------------------------------------------------------------------------
// Category Labels (for UI display)
// ---------------------------------------------------------------------------

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  all: "全部模板",
  listing: "上架图",
  whitebg: "白底图",
  scene: "场景图",
  poster: "海报设计",
  video: "短视频",
  "image-process": "图片处理",
};

// ---------------------------------------------------------------------------
// Listing Presets (上架图) - 5 presets
// ---------------------------------------------------------------------------

const listingPresets: TemplatePreset[] = [
  {
    id: "listing-main-full",
    name: "淘宝主图全套",
    description: "主图+白底图+详情页，一键生成全套上架素材",
    category: "listing",
    type: "combo",
    usageCount: 234,
    version: "2.3",
    tags: ["淘宝", "主图", "全套", "上架"],
    isSystem: true,
    isDefault: true,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "clean",
      },
      batchMode: true,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "800x800",
        candidateCount: 4,
      },
    },
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-05-20T00:00:00Z",
  },
  {
    id: "listing-detail-first",
    name: "详情页首图",
    description: "宽屏详情页首图，突出商品卖点",
    category: "listing",
    type: "scene",
    usageCount: 189,
    version: "1.8",
    tags: ["详情页", "首图", "卖点"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "lifestyle",
      },
      batchMode: false,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "1200x600",
        candidateCount: 3,
      },
    },
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-05-10T00:00:00Z",
  },
  {
    id: "listing-sku",
    name: "SKU图",
    description: "多规格SKU对比图，清晰展示颜色/尺寸差异",
    category: "listing",
    type: "scene",
    usageCount: 156,
    version: "1.5",
    tags: ["SKU", "多规格", "对比"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "clean",
      },
      batchMode: true,
      parameters: {
        aiModel: "gemini",
        outputResolution: "800x800",
        candidateCount: 6,
      },
    },
    createdAt: "2025-02-10T00:00:00Z",
    updatedAt: "2025-04-28T00:00:00Z",
  },
  {
    id: "listing-selling-point",
    name: "卖点图",
    description: "突出核心卖点，适合详情页中部展示",
    category: "listing",
    type: "scene",
    usageCount: 142,
    version: "1.4",
    tags: ["卖点", "详情页", "展示"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "minimal",
      },
      batchMode: false,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "800x800",
        candidateCount: 3,
      },
    },
    createdAt: "2025-02-20T00:00:00Z",
    updatedAt: "2025-04-15T00:00:00Z",
  },
  {
    id: "listing-compare",
    name: "对比图",
    description: "前后对比、竞品对比，增强说服力",
    category: "listing",
    type: "scene",
    usageCount: 98,
    version: "1.2",
    tags: ["对比", "前后", "竞品"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "comparison",
      },
      batchMode: false,
      parameters: {
        aiModel: "gemini",
        outputResolution: "800x800",
        candidateCount: 2,
      },
    },
    createdAt: "2025-03-01T00:00:00Z",
    updatedAt: "2025-04-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// White Background Presets (白底图) - 3 presets
// ---------------------------------------------------------------------------

const whitebgPresets: TemplatePreset[] = [
  {
    id: "whitebg-clean",
    name: "纯净白底",
    description: "标准白底图，适合电商平台主图",
    category: "whitebg",
    type: "tool",
    toolType: "background",
    usageCount: 312,
    version: "2.0",
    tags: ["白底", "纯净", "主图"],
    isSystem: true,
    isDefault: true,
    params: {
      toolType: "background_replace",
      parameters: {
        prompt: "pure white background, clean product photography, studio lighting",
        aiModel: "volcengine",
        outputResolution: "800x800",
      },
      batchMode: true,
    },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-05-15T00:00:00Z",
  },
  {
    id: "whitebg-shadow",
    name: "白底带阴影",
    description: "白底图加自然阴影，增加立体感",
    category: "whitebg",
    type: "tool",
    toolType: "background",
    usageCount: 198,
    version: "1.6",
    tags: ["白底", "阴影", "立体"],
    isSystem: true,
    isDefault: false,
    params: {
      toolType: "background_replace",
      parameters: {
        prompt: "white background with soft natural shadow, product photography",
        aiModel: "volcengine",
        outputResolution: "800x800",
      },
      batchMode: true,
    },
    createdAt: "2025-01-20T00:00:00Z",
    updatedAt: "2025-04-20T00:00:00Z",
  },
  {
    id: "whitebg-reflection",
    name: "白底带倒影",
    description: "高端白底图加倒影效果",
    category: "whitebg",
    type: "tool",
    toolType: "background",
    usageCount: 87,
    version: "1.1",
    tags: ["白底", "倒影", "高端"],
    isSystem: true,
    isDefault: false,
    params: {
      toolType: "background_replace",
      parameters: {
        prompt: "white background with product reflection, luxury product photography",
        aiModel: "gpt-4o",
        outputResolution: "800x800",
      },
      batchMode: false,
    },
    createdAt: "2025-03-10T00:00:00Z",
    updatedAt: "2025-04-10T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Scene Presets (场景图) - 4 presets
// ---------------------------------------------------------------------------

const scenePresets: TemplatePreset[] = [
  {
    id: "scene-indoor",
    name: "室内家居",
    description: "温馨室内家居场景，适合家具、家纺、日用品",
    category: "scene",
    type: "scene",
    usageCount: 267,
    version: "2.1",
    tags: ["室内", "家居", "温馨"],
    isSystem: true,
    isDefault: true,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "cozy indoor home scene, warm lighting",
      },
      batchMode: true,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "1024x1024",
        candidateCount: 4,
      },
    },
    createdAt: "2025-01-05T00:00:00Z",
    updatedAt: "2025-05-18T00:00:00Z",
  },
  {
    id: "scene-outdoor",
    name: "户外自然",
    description: "自然户外场景，适合运动、户外、旅行用品",
    category: "scene",
    type: "scene",
    usageCount: 189,
    version: "1.7",
    tags: ["户外", "自然", "运动"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "outdoor nature scene, bright daylight",
      },
      batchMode: true,
      parameters: {
        aiModel: "gemini",
        outputResolution: "1024x1024",
        candidateCount: 4,
      },
    },
    createdAt: "2025-01-25T00:00:00Z",
    updatedAt: "2025-05-05T00:00:00Z",
  },
  {
    id: "scene-business",
    name: "商业办公",
    description: "专业商业办公场景，适合数码、文具、商务用品",
    category: "scene",
    type: "scene",
    usageCount: 145,
    version: "1.5",
    tags: ["商业", "办公", "专业"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "modern office desk scene, professional lighting",
      },
      batchMode: false,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "1024x1024",
        candidateCount: 3,
      },
    },
    createdAt: "2025-02-15T00:00:00Z",
    updatedAt: "2025-04-25T00:00:00Z",
  },
  {
    id: "scene-festival",
    name: "节日氛围",
    description: "节日主题场景，适合礼品、食品、装饰品",
    category: "scene",
    type: "scene",
    usageCount: 123,
    version: "1.3",
    tags: ["节日", "氛围", "礼品"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "festive holiday scene, colorful decorations",
      },
      batchMode: false,
      parameters: {
        aiModel: "gemini",
        outputResolution: "1024x1024",
        candidateCount: 3,
      },
    },
    createdAt: "2025-03-05T00:00:00Z",
    updatedAt: "2025-04-20T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Poster Presets (海报设计) - 3 presets
// ---------------------------------------------------------------------------

const posterPresets: TemplatePreset[] = [
  {
    id: "poster-promo",
    name: "促销海报",
    description: "电商促销海报模板，突出折扣信息",
    category: "poster",
    type: "scene",
    usageCount: 178,
    version: "1.6",
    tags: ["促销", "海报", "折扣"],
    isSystem: true,
    isDefault: true,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "taobao",
        stylePreference: "promotional poster, bold text, vibrant colors",
      },
      batchMode: false,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "1080x1440",
        candidateCount: 3,
      },
    },
    createdAt: "2025-01-10T00:00:00Z",
    updatedAt: "2025-05-12T00:00:00Z",
  },
  {
    id: "poster-brand",
    name: "品牌海报",
    description: "品牌调性海报，高端大气",
    category: "poster",
    type: "scene",
    usageCount: 134,
    version: "1.4",
    tags: ["品牌", "海报", "高端"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "tmall",
        stylePreference: "luxury brand poster, minimalist design, elegant",
      },
      batchMode: false,
      parameters: {
        aiModel: "gemini",
        outputResolution: "1080x1440",
        candidateCount: 3,
      },
    },
    createdAt: "2025-02-05T00:00:00Z",
    updatedAt: "2025-04-30T00:00:00Z",
  },
  {
    id: "poster-social",
    name: "社交媒体海报",
    description: "适合小红书、抖音等社交平台分享",
    category: "poster",
    type: "scene",
    usageCount: 201,
    version: "1.8",
    tags: ["社交", "海报", "分享"],
    isSystem: true,
    isDefault: false,
    params: {
      productInfo: {
        name: "",
        category: "other",
        targetPlatform: "douyin",
        stylePreference: "social media poster, trendy, eye-catching",
      },
      batchMode: true,
      parameters: {
        aiModel: "gpt-4o",
        outputResolution: "1080x1920",
        candidateCount: 4,
      },
    },
    createdAt: "2025-02-20T00:00:00Z",
    updatedAt: "2025-05-15T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Video Presets (短视频) - 2 presets
// ---------------------------------------------------------------------------

const videoPresets: TemplatePreset[] = [
  {
    id: "video-product-show",
    name: "商品展示视频",
    description: "商品360度展示短视频，适合详情页",
    category: "video",
    type: "tool",
    toolType: "video",
    usageCount: 156,
    version: "1.5",
    tags: ["视频", "展示", "360度"],
    isSystem: true,
    isDefault: true,
    params: {
      toolType: "video_generation",
      parameters: {
        aiModel: "jimeng",
        outputResolution: "1080x1920",
      },
      batchMode: false,
    },
    createdAt: "2025-01-30T00:00:00Z",
    updatedAt: "2025-05-10T00:00:00Z",
  },
  {
    id: "video-lifestyle",
    name: "生活场景视频",
    description: "商品在生活场景中的动态展示",
    category: "video",
    type: "tool",
    toolType: "video",
    usageCount: 98,
    version: "1.2",
    tags: ["视频", "生活", "场景"],
    isSystem: true,
    isDefault: false,
    params: {
      toolType: "video_generation",
      parameters: {
        aiModel: "jimeng",
        outputResolution: "1080x1920",
      },
      batchMode: false,
    },
    createdAt: "2025-03-15T00:00:00Z",
    updatedAt: "2025-04-25T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Image Process Presets (图片处理) - 3 presets
// ---------------------------------------------------------------------------

const imageProcessPresets: TemplatePreset[] = [
  {
    id: "ip-background",
    name: "AI换背景",
    description: "智能替换商品背景，支持自定义提示词",
    category: "image-process",
    type: "tool",
    toolType: "background",
    usageCount: 423,
    version: "3.0",
    tags: ["换背景", "AI", "智能"],
    isSystem: true,
    isDefault: true,
    params: {
      toolType: "background_replace",
      parameters: {
        prompt: "beautiful scene background matching the product style",
        aiModel: "volcengine",
        outputResolution: "1024x1024",
      },
      batchMode: true,
    },
    createdAt: "2024-12-01T00:00:00Z",
    updatedAt: "2025-05-20T00:00:00Z",
  },
  {
    id: "ip-watermark",
    name: "加水印",
    description: "批量添加文字或Logo水印",
    category: "image-process",
    type: "tool",
    toolType: "watermark",
    usageCount: 312,
    version: "2.1",
    tags: ["水印", "批量", "品牌"],
    isSystem: true,
    isDefault: false,
    params: {
      toolType: "watermark",
      parameters: {
        watermarkType: "text",
        watermarkText: "品牌名称",
        watermarkOpacity: 0.3,
        watermarkPosition: "bottom-right",
        outputResolution: "1024x1024",
      },
      batchMode: true,
    },
    createdAt: "2024-12-15T00:00:00Z",
    updatedAt: "2025-05-15T00:00:00Z",
  },
  {
    id: "ip-upscale",
    name: "高清化",
    description: "AI智能提升图片分辨率，细节更清晰",
    category: "image-process",
    type: "tool",
    toolType: "upscale",
    usageCount: 278,
    version: "2.0",
    tags: ["高清", "放大", "细节"],
    isSystem: true,
    isDefault: false,
    params: {
      toolType: "upscale",
      parameters: {
        upscaleFactor: 2,
        aiModel: "volcengine",
        outputResolution: "2048x2048",
      },
      batchMode: true,
    },
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-05-10T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// All Presets
// ---------------------------------------------------------------------------

export const ALL_PRESETS: TemplatePreset[] = [
  ...listingPresets,
  ...whitebgPresets,
  ...scenePresets,
  ...posterPresets,
  ...videoPresets,
  ...imageProcessPresets,
];

// ---------------------------------------------------------------------------
// Combo Presets
// ---------------------------------------------------------------------------

export const COMBO_PRESETS: ComboPreset[] = [
  {
    id: "combo-taobao-full",
    name: "淘宝全套素材",
    description: "包含上架图+白底图+场景图，一站式生成淘宝店铺所需全部素材",
    presetIds: [
      "listing-main-full",
      "whitebg-clean",
      "scene-indoor",
      "scene-outdoor",
    ],
    usageCount: 89,
    version: "1.5",
    tags: ["淘宝", "全套", "店铺"],
    isSystem: true,
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-05-15T00:00:00Z",
  },
  {
    id: "combo-douyin-pack",
    name: "抖音带货套装",
    description: "包含视频+海报，适合抖音带货内容创作",
    presetIds: [
      "video-product-show",
      "poster-social",
      "scene-festival",
    ],
    usageCount: 67,
    version: "1.2",
    tags: ["抖音", "带货", "视频"],
    isSystem: true,
    createdAt: "2025-03-01T00:00:00Z",
    updatedAt: "2025-04-20T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get presets by category */
export function getPresetsByCategory(
  category: PresetCategory
): TemplatePreset[] {
  if (category === "all") return ALL_PRESETS;
  return ALL_PRESETS.filter((p) => p.category === category);
}

/** Search presets by name, description, or tags */
export function searchPresets(query: string): TemplatePreset[] {
  const q = query.toLowerCase().trim();
  if (!q) return ALL_PRESETS;
  return ALL_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

/** Get a single preset by ID */
export function getPresetById(id: string): TemplatePreset | undefined {
  return ALL_PRESETS.find((p) => p.id === id);
}

/** Get combo preset by ID */
export function getComboPresetById(id: string): ComboPreset | undefined {
  return COMBO_PRESETS.find((c) => c.id === id);
}

/** Get presets sorted by usage count (descending) */
export function getPresetsSortedByUsage(
  category?: PresetCategory
): TemplatePreset[] {
  const presets = category ? getPresetsByCategory(category) : [...ALL_PRESETS];
  return presets.sort((a, b) => b.usageCount - a.usageCount);
}

/** Get presets sorted by date (newest first) */
export function getPresetsSortedByDate(
  category?: PresetCategory
): TemplatePreset[] {
  const presets = category ? getPresetsByCategory(category) : [...ALL_PRESETS];
  return presets.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}
