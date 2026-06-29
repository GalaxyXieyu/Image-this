import { Home, Wand2, Layers, Wrench, Sparkles, Droplets, ZoomIn, Expand, Image as ImageIcon, Images, Settings as SettingsIcon } from "lucide-react";

export type PrimaryItem = {
  label: string;
  href: string;
  icon: typeof Home;
  match: (_path: string) => boolean;
};

export const PRIMARY_ITEMS: PrimaryItem[] = [
  { label: "首页", href: "/", icon: Home, match: (p) => p === "/" },
  {
    label: "工作台",
    href: "/workspace",
    icon: Wand2,
    match: (p) =>
      p.startsWith("/workspace") || p.startsWith("/combo") || p.startsWith("/tools"),
  },
  { label: "图库", href: "/results", icon: ImageIcon, match: (p) => p.startsWith("/results") },
  { label: "设置", href: "/settings", icon: SettingsIcon, match: (p) => p.startsWith("/settings") || p.startsWith("/templates") },
];

export const WORKSPACE_SEGMENTS = [
  { label: "商品套图", href: "/workspace/listing-set", icon: Images, match: (p: string) => p.startsWith("/workspace/listing-set") },
  { label: "换背景", href: "/workspace/scene", icon: Wand2, match: (p: string) => p.startsWith("/workspace/scene") },
  { label: "工作流", href: "/combo", icon: Layers, match: (p: string) => p.startsWith("/combo") },
  { label: "工具", href: "/tools", icon: Wrench, match: (p: string) => p.startsWith("/tools") },
];

export const TOOL_PILLS = [
  { label: "AI换背景", tool: "background_replace", icon: Sparkles },
  { label: "加水印", tool: "watermark", icon: Droplets },
  { label: "高清放大", tool: "upscale", icon: ZoomIn },
  { label: "智能扩图", tool: "outpaint", icon: Expand },
];

export const DEFAULT_TOOL = "background_replace";
