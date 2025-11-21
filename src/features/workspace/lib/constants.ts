import { Wand2, ImageIcon, Expand, Zap } from "lucide-react";
import { ActiveTab } from "@/components/workspace/WorkspaceSidebar";

export const tabs: Array<{
  id: ActiveTab;
  title: string;
  icon: typeof Wand2;
  description: string;
}> = [
  {
    id: "one-click",
    title: "一键增强",
    icon: Wand2,
    description: "智能扩图 + AI高清化"
  },
  {
    id: "background",
    title: "背景替换",
    icon: ImageIcon,
    description: "智能更换图片背景"
  },
  {
    id: "expansion",
    title: "图像扩展",
    icon: Expand,
    description: "智能扩展图片边界"
  },
  {
    id: "upscaling",
    title: "AI高清化",
    icon: Zap,
    description: "提升图片分辨率"
  }
];

export const PROCESS_TYPE_NAMES: Record<string, string> = {
  'ONE_CLICK_WORKFLOW': '一键增强',
  'BACKGROUND_REMOVAL': '背景替换',
  'IMAGE_EXPANSION': '图像扩展',
  'IMAGE_UPSCALING': '图像高清化',
  'GPT_GENERATION': '图像生成'
};

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff'
];
