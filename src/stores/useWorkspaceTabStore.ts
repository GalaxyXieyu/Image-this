import { create } from 'zustand';
import { ActiveTab } from '@/components/workspace/WorkspaceSidebar';

// 上传的图片类型
export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
}

// 水印设置类型
export interface WatermarkSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  editorWidth: number;
  editorHeight: number;
}

// 每个 Tab 的独立状态
export interface TabState {
  // 上传的图片
  uploadedImages: UploadedImage[];
  // 参考图片（背景替换、一键增强用）
  referenceImage: UploadedImage | null;
  // 选中的预览索引
  selectedPreviewIndex: number;
  // 输出分辨率
  outputResolution: string;
  // AI 模型
  aiModel: string;
  // 提示词
  prompt: string;
  // 一键增强专用：背景替换提示词
  backgroundPrompt: string;
  // 一键增强专用：扩图提示词
  outpaintPrompt: string;
  // 水印相关（一键增强、水印 tab 用）
  enableWatermark: boolean;
  watermarkType: 'text' | 'logo';
  watermarkText: string;
  watermarkLogo: UploadedImage | null;
  watermarkSettings: WatermarkSettings;
  // 扩展参数
  xScale: string;
  yScale: string;
  upscaleFactor: string;
}

// 默认的 Tab 状态
const createDefaultTabState = (): TabState => ({
  uploadedImages: [],
  referenceImage: null,
  selectedPreviewIndex: 0,
  outputResolution: 'original',
  aiModel: 'gemini',
  prompt: '',
  backgroundPrompt: '',
  outpaintPrompt: '',
  enableWatermark: false,
  watermarkType: 'logo',
  watermarkText: 'Sample Watermark',
  watermarkLogo: null,
  watermarkSettings: {
    x: 50,
    y: 50,
    width: 150,
    height: 150,
    editorWidth: 600,
    editorHeight: 400,
  },
  xScale: '2.0',
  yScale: '2.0',
  upscaleFactor: '2',
});

// Store 状态类型
interface WorkspaceTabStore {
  // 当前激活的 tab
  activeTab: ActiveTab;
  // 每个 tab 的状态缓存
  tabStates: Record<ActiveTab, TabState>;
  
  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  
  // 更新当前 tab 的状态
  setUploadedImages: (images: UploadedImage[]) => void;
  addUploadedImages: (images: UploadedImage[]) => void;
  removeUploadedImage: (id: string) => void;
  clearUploadedImages: () => void;
  
  setReferenceImage: (image: UploadedImage | null) => void;
  setSelectedPreviewIndex: (index: number) => void;
  setOutputResolution: (resolution: string) => void;
  setAiModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  setBackgroundPrompt: (prompt: string) => void;
  setOutpaintPrompt: (prompt: string) => void;
  
  // 水印相关
  setEnableWatermark: (enable: boolean) => void;
  setWatermarkType: (type: 'text' | 'logo') => void;
  setWatermarkText: (text: string) => void;
  setWatermarkLogo: (logo: UploadedImage | null) => void;
  setWatermarkSettings: (settings: WatermarkSettings) => void;
  
  // 扩展参数
  setXScale: (scale: string) => void;
  setYScale: (scale: string) => void;
  setUpscaleFactor: (factor: string) => void;
  
  // 获取当前 tab 的状态
  getCurrentTabState: () => TabState;
  
  // 清除指定 tab 的状态
  clearTabState: (tab: ActiveTab) => void;
}

// 所有 tab 的初始状态
const initialTabStates: Record<ActiveTab, TabState> = {
  'one-click': createDefaultTabState(),
  'background': createDefaultTabState(),
  'expansion': createDefaultTabState(),
  'upscaling': createDefaultTabState(),
  'watermark': createDefaultTabState(),
};

export const useWorkspaceTabStore = create<WorkspaceTabStore>((set, get) => ({
  activeTab: 'one-click',
  tabStates: initialTabStates,
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // 更新当前 tab 的上传图片
  setUploadedImages: (images) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        uploadedImages: images,
      },
    },
  })),
  
  addUploadedImages: (images) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        uploadedImages: [...state.tabStates[state.activeTab].uploadedImages, ...images],
      },
    },
  })),
  
  removeUploadedImage: (id) => set((state) => {
    const currentImages = state.tabStates[state.activeTab].uploadedImages;
    const imageToRemove = currentImages.find(img => img.id === id);
    
    // 释放 Blob URL
    if (imageToRemove && imageToRemove.preview && typeof window !== 'undefined') {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    const newImages = currentImages.filter(img => img.id !== id);
    const currentIndex = state.tabStates[state.activeTab].selectedPreviewIndex;
    const newIndex = currentIndex >= newImages.length ? Math.max(0, newImages.length - 1) : currentIndex;
    
    return {
      tabStates: {
        ...state.tabStates,
        [state.activeTab]: {
          ...state.tabStates[state.activeTab],
          uploadedImages: newImages,
          selectedPreviewIndex: newIndex,
        },
      },
    };
  }),
  
  clearUploadedImages: () => set((state) => {
    const currentImages = state.tabStates[state.activeTab].uploadedImages;
    
    // 释放所有 Blob URL
    if (typeof window !== 'undefined') {
      currentImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
    }

    return {
      tabStates: {
        ...state.tabStates,
        [state.activeTab]: {
          ...state.tabStates[state.activeTab],
          uploadedImages: [],
          selectedPreviewIndex: 0,
        },
      },
    };
  }),
  
  setReferenceImage: (image) => set((state) => {
    const oldImage = state.tabStates[state.activeTab].referenceImage;
    
    // 如果有旧图片且与新图片不同，释放旧图片的 Blob URL
    if (oldImage && oldImage.preview && (!image || oldImage.preview !== image.preview) && typeof window !== 'undefined') {
      URL.revokeObjectURL(oldImage.preview);
    }

    return {
      tabStates: {
        ...state.tabStates,
        [state.activeTab]: {
          ...state.tabStates[state.activeTab],
          referenceImage: image,
        },
      },
    };
  }),
  
  setSelectedPreviewIndex: (index) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        selectedPreviewIndex: index,
      },
    },
  })),
  
  setOutputResolution: (resolution) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        outputResolution: resolution,
      },
    },
  })),
  
  setAiModel: (model) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        aiModel: model,
      },
    },
  })),
  
  setPrompt: (prompt) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        prompt: prompt,
      },
    },
  })),
  
  setBackgroundPrompt: (prompt) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        backgroundPrompt: prompt,
      },
    },
  })),
  
  setOutpaintPrompt: (prompt) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        outpaintPrompt: prompt,
      },
    },
  })),
  
  // 水印相关
  setEnableWatermark: (enable) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        enableWatermark: enable,
      },
    },
  })),
  
  setWatermarkType: (type) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        watermarkType: type,
      },
    },
  })),
  
  setWatermarkText: (text) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        watermarkText: text,
      },
    },
  })),
  
  setWatermarkLogo: (logo) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        watermarkLogo: logo,
      },
    },
  })),
  
  setWatermarkSettings: (settings) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        watermarkSettings: settings,
      },
    },
  })),
  
  // 扩展参数
  setXScale: (scale) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        xScale: scale,
      },
    },
  })),
  
  setYScale: (scale) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        yScale: scale,
      },
    },
  })),
  
  setUpscaleFactor: (factor) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [state.activeTab]: {
        ...state.tabStates[state.activeTab],
        upscaleFactor: factor,
      },
    },
  })),
  
  getCurrentTabState: () => {
    const state = get();
    return state.tabStates[state.activeTab];
  },
  
  clearTabState: (tab) => set((state) => ({
    tabStates: {
      ...state.tabStates,
      [tab]: createDefaultTabState(),
    },
  })),
}));
