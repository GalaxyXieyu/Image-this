"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import React from "react";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/navigation/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wand2,
  ImageIcon,
  Expand,
  Zap,
  FileImage,
  Upload,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  RefreshCw,
  Play,
  Loader2,
  Settings as SettingsIcon,
} from "lucide-react";
import WatermarkEditor from '@/components/watermark/WatermarkEditor';

import CollapsibleHistorySidebar from '@/components/CollapsibleHistorySidebar';
import WorkspaceSidebar, { ActiveTab } from '@/components/workspace/WorkspaceSidebar';
import ImageUploadArea from '@/components/workspace/ImageUploadArea';
import ReferenceImageUpload from '@/components/workspace/ReferenceImageUpload';
import WatermarkSettingsPanel from '@/components/workspace/WatermarkSettingsPanel';
import ParameterSettings from '@/components/workspace/ParameterSettings';
import TaskProgress from '@/components/workspace/TaskProgress';
import ActionButtons from '@/components/workspace/ActionButtons';
import ImagePreviewModal from '@/components/workspace/ImagePreviewModal';
import ResultModal from '@/components/workspace/ResultModal';
import WatermarkEditorView from '@/components/workspace/WatermarkEditorView';
import OneClickWatermarkSettings from '@/components/workspace/OneClickWatermarkSettings';

// Custom Hooks
import { useImageUpload } from '@/hooks/useImageUpload';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { useTaskPolling } from '@/hooks/useTaskPolling';

// Zustand Store
import { useWorkspaceTabStore, UploadedImage as StoreUploadedImage } from '@/stores/useWorkspaceTabStore';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
}

interface ProcessedResult {
  id: string;
  originalImageId: string;
  originalName: string;
  processedImageUrl: string;
  processType: string;
  timestamp: string;
  parameters?: Record<string, unknown>;
}

interface Task {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep: string;
  createdAt: string;
  originalImageId?: string;
  originalName?: string;
  outputData?: string;
  errorMessage?: string;
}

export default function WorkspacePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // 使用 Zustand store 管理每个 tab 的独立状态
  const {
    activeTab,
    setActiveTab,
    tabStates,
    setUploadedImages,
    addUploadedImages,
    removeUploadedImage,
    clearUploadedImages,
    setReferenceImage,
    setSelectedPreviewIndex,
    setOutputResolution,
    setAiModel,
    setPrompt,
    setBackgroundPrompt,
    setOutpaintPrompt,
    setEnableWatermark,
    setWatermarkType,
    setWatermarkText,
    setWatermarkLogo,
    setWatermarkSettings,
    setXScale,
    setYScale,
    getCurrentTabState,
  } = useWorkspaceTabStore();
  
  // 从当前 tab 状态中获取值
  const currentTabState = tabStates[activeTab];
  const uploadedImages = currentTabState.uploadedImages;
  const referenceImage = currentTabState.referenceImage;
  const selectedPreviewIndex = currentTabState.selectedPreviewIndex;
  const outputResolution = currentTabState.outputResolution;
  const aiModel = currentTabState.aiModel;
  const enableWatermark = currentTabState.enableWatermark;
  const watermarkType = currentTabState.watermarkType;
  const watermarkText = currentTabState.watermarkText;
  const watermarkLogo = currentTabState.watermarkLogo;
  const watermarkSettings = currentTabState.watermarkSettings;
  const xScale = parseFloat(currentTabState.xScale) || 2.0;
  const yScale = parseFloat(currentTabState.yScale) || 2.0;
  
  // 提示词根据 tab 类型获取
  const backgroundPrompt = activeTab === 'background' ? currentTabState.prompt : '';
  const outpaintPrompt = activeTab === 'expansion' ? currentTabState.prompt : '';
  // 一键增强专用：独立的背景替换和扩图提示词
  const oneClickBackgroundPrompt = currentTabState.backgroundPrompt;
  const oneClickOutpaintPrompt = currentTabState.outpaintPrompt;
  
  // 本地状态（不需要跨 tab 保持）
  const [isProcessing, setIsProcessing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [watermarkOpacity, setWatermarkOpacity] = useState(1.0);
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [showWatermarkPreview, setShowWatermarkPreview] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  // 历史记录侧边栏状态
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyLoadingRef = useRef(false);

  const watermarkLogoInputRef = useRef<HTMLInputElement>(null);

  // 新增：任务管理状态
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTasksRef = useRef<Task[]>([]);
  const processedResultsRef = useRef<ProcessedResult[]>([]);
  const uploadedImagesRef = useRef<UploadedImage[]>([]);
  const referenceImageRef = useRef<UploadedImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // 使用自定义 Hooks
  const imageUploadHook = useImageUpload();
  const imageProcessingHook = useImageProcessing({
    uploadedImages,
    referenceImage,
    watermarkLogo,
    watermarkSettings,
    outputResolution,
    aiModel
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 加载用户配置并设置默认 AI 模型
  useEffect(() => {
    const loadUserConfig = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            const providers: string[] = [];
            
            // 检查哪些提供商已配置
            if (data.config.gemini?.enabled) providers.push('gemini');
            if (data.config.gpt?.enabled) providers.push('gpt');
            if (data.config.volcengine?.enabled) {
              providers.push('jimeng'); // jimeng 使用火山引擎配置
              providers.push('volcengine');
            }
            if (data.config.qwen?.enabled) providers.push('qwen');
            
            setAvailableProviders(providers);
            
            // 自动选择第一个可用的提供商
            if (providers.length > 0 && !providers.includes(aiModel)) {
              setAiModel(providers[0]);
            }
          }
        }
      } catch (error) {
        console.error('加载用户配置失败:', error);
      }
    };

    if (status === 'authenticated') {
      loadUserConfig();
    }
  }, [status]);

  // 加载处理历史 - 根据当前标签页筛选
  const loadProcessingHistory = useCallback(async () => {
    // 防止重复请求
    if (historyLoadingRef.current) return;
    
    try {
      historyLoadingRef.current = true;
      
      // 根据当前标签页映射到对应的处理类型
      const processTypeMap: Record<ActiveTab, string[]> = {
        'one-click': ['ONE_CLICK_WORKFLOW'],
        'background': ['BACKGROUND_REMOVAL'],
        'expansion': ['IMAGE_OUTPAINTING'],
        'upscaling': ['IMAGE_UPSCALING'],
        'watermark': ['WATERMARK']
      };

      const allowedTypes = processTypeMap[activeTab] || [];
      const typeQuery = allowedTypes.map(t => `type=${t}`).join('&');
      
      const response = await fetch(`/api/images?status=COMPLETED&limit=30&sortBy=createdAt&order=desc&${typeQuery}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.images && Array.isArray(data.images)) {
        const historyResults: ProcessedResult[] = data.images
          .filter((img: any) => img.processedUrl)
          .map((img: any) => ({
            id: img.id,
            processedImageUrl: img.processedUrl,
            originalName: img.filename || '未命名',
            processType: img.processType || 'UNKNOWN',
            timestamp: new Date(img.createdAt).toLocaleString('zh-CN')
          }));

        setProcessedResults(historyResults);
        setHistoryLoaded(true);
      }
    } catch (error) {
      console.error('加载处理历史失败:', error);
    } finally {
      historyLoadingRef.current = false;
    }
  }, [activeTab]);

  // 只在打开历史侧边栏时加载历史记录
  useEffect(() => {
    if (status === "authenticated" && isHistorySidebarOpen && !historyLoaded) {
      loadProcessingHistory();
    }
  }, [status, isHistorySidebarOpen, historyLoaded, loadProcessingHistory]);
  
  // 标签页变化时重置历史加载状态
  useEffect(() => {
    setHistoryLoaded(false);
    setProcessedResults([]);
  }, [activeTab]);

  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  useEffect(() => {
    processedResultsRef.current = processedResults;
  }, [processedResults]);

  useEffect(() => {
    uploadedImagesRef.current = uploadedImages;
  }, [uploadedImages]);

  useEffect(() => {
    referenceImageRef.current = referenceImage;
  }, [referenceImage]);

  // 稳定的水印位置变化回调
  const handleWatermarkPositionChange = useCallback((position: { x: number; y: number; width: number; height: number; editorWidth: number; editorHeight: number }) => {
    setWatermarkSettings(position);
  }, []);

  // 组件卸载时清理所有资源 - 移除，防止切换页面图片失效
  // useEffect(() => {
  //   return () => {
  //     uploadedImagesRef.current.forEach(img => {
  //       if (img.preview) {
  //         URL.revokeObjectURL(img.preview);
  //       }
  //     });
  //     if (referenceImageRef.current?.preview) {
  //       URL.revokeObjectURL(referenceImageRef.current.preview);
  //     }
  //   };
  // }, []);

  // 获取处理类型显示名称
  const getProcessTypeName = (type: string): string => {
    switch (type) {
      case 'ONE_CLICK_WORKFLOW': return '一键增强';
      case 'BACKGROUND_REMOVAL': return '背景替换';
      case 'IMAGE_EXPANSION': return '图像扩展';
      case 'IMAGE_UPSCALING': return '图像高清化';
      case 'WATERMARK': return '叠加水印';
      default: return type;
    }
  };

  // 使用任务轮询 Hook
  useTaskPolling({
    isProcessing,
    activeTasks,
    setActiveTasks,
    setIsProcessing,
    onTaskComplete: loadProcessingHistory,
    getProcessTypeName
  });

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const tabs: Array<{
    id: ActiveTab;
    title: string;
    icon: typeof Wand2;
    description: string;
    color: string;
  }> = [
      {
        id: "one-click",
        title: "一键增强",
        icon: Wand2,
        description: "背景替换 + 扩图 + 高清化 + 水印",
        color: "orange"
      },
      {
        id: "background",
        title: "背景替换",
        icon: ImageIcon,
        description: "智能换背景",
        color: "blue"
      },
      {
        id: "expansion",
        title: "图像扩展",
        icon: Expand,
        description: "智能扩图",
        color: "blue"
      },
      {
        id: "upscaling",
        title: "图像高清化",
        icon: Zap,
        description: "AI超分辨率",
        color: "orange"
      },
      {
        id: "watermark",
        title: "叠加水印",
        icon: FileImage,
        description: "添加文字水印",
        color: "blue"
      }
    ];

  // 提示词 setter 函数（根据当前 tab 设置对应的 prompt）
  const handleSetBackgroundPrompt = (value: string) => {
    if (activeTab === 'background') setPrompt(value);
  };
  const handleSetOutpaintPrompt = (value: string) => {
    if (activeTab === 'expansion') setPrompt(value);
  };
  // 一键增强专用：独立的背景替换和扩图提示词 setter
  const handleSetOneClickBackgroundPrompt = (value: string) => {
    setBackgroundPrompt(value);
  };
  const handleSetOneClickOutpaintPrompt = (value: string) => {
    setOutpaintPrompt(value);
  };

  // 使用 Hook 中的上传方法
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    imageUploadHook.handleFileUpload(event, (images) => {
      addUploadedImages(images);
    });
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    imageUploadHook.handleFolderUpload(event, (images) => {
      addUploadedImages(images);
    });
  };

  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    imageUploadHook.handleSingleImageUpload(event, setReferenceImage, "参考图片上传成功");
  };

  const handleWatermarkLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    imageUploadHook.handleSingleImageUpload(event, setWatermarkLogo, "水印Logo上传成功");
  };

  const removeImage = (id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    imageUploadHook.removeImage(imageToRemove || null);
    removeUploadedImage(id);
  };

  const removeReferenceImage = () => {
    imageUploadHook.removeImage(referenceImage);
    setReferenceImage(null);
  };

  const removeWatermarkLogo = () => {
    imageUploadHook.removeImage(watermarkLogo);
    setWatermarkLogo(null);
  };

  const clearAllImages = () => {
    imageUploadHook.clearAllImages(uploadedImages);
    clearUploadedImages();
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPreviewIndex(selectedPreviewIndex > 0 ? selectedPreviewIndex - 1 : uploadedImages.length - 1);
    } else {
      setSelectedPreviewIndex(selectedPreviewIndex < uploadedImages.length - 1 ? selectedPreviewIndex + 1 : 0);
    }
  };

  const handleProcess = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "请先上传图片",
        description: "请选择要处理的图片文件",
        variant: "destructive",
      });
      return;
    }

    // 立即显示点击反馈
    const getTabName = () => {
      switch (activeTab) {
        case 'one-click': return '一键增强';
        case 'background': return '背景替换';
        case 'expansion': return '图像扩展';
        case 'upscaling': return '图像高清化';
        case 'watermark': return '叠加水印';
        default: return '处理';
      }
    };

    toast({
      title: "正在启动",
      description: `${getTabName()}任务正在准备中...`,
    });

    try {
      let tasks;
      // 根据当前标签页选择不同的处理方式
      if (activeTab === 'expansion') {
        tasks = await imageProcessingHook.handleExpansion();
      } else if (activeTab === 'upscaling') {
        tasks = await imageProcessingHook.handleUpscaling();
      } else if (activeTab === 'one-click') {
        tasks = await imageProcessingHook.handleOneClick(
          enableWatermark,
          watermarkText,
          watermarkOpacity,
          watermarkPosition,
          watermarkType
        );
      } else if (activeTab === 'background') {
        tasks = await imageProcessingHook.handleBackgroundReplace();
      } else if (activeTab === 'watermark') {
        tasks = await imageProcessingHook.handleWatermark();
      }

      if (tasks) {
        const mappedTasks = tasks.map((task: any, index: number) => ({
          ...task,
          originalImageId: uploadedImages[index]?.id || '',
          originalName: uploadedImages[index]?.name || 'Unknown'
        }));
        setActiveTasks(prev => [...prev, ...mappedTasks]);
        setIsProcessing(true);

        const getProcessTypeName = (type: string): string => {
          switch (type) {
            case 'ONE_CLICK_WORKFLOW': return '一键增强';
            case 'BACKGROUND_REMOVAL': return '背景替换';
            case 'IMAGE_EXPANSION': return '图像扩展';
            case 'IMAGE_UPSCALING': return '图像高清化';
            case 'WATERMARK': return '叠加水印';
            default: return type;
          }
        };

        toast({
          title: "任务创建成功",
          description: `已创建 ${mappedTasks.length} 个${getProcessTypeName(mappedTasks[0]?.type || '')}任务，正在处理中...`,
        });
      }
    } catch (error) {
      console.error('处理失败:', error);
      toast({
        title: "处理失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const renderTabContent = () => {
    // 水印模式：始终显示编辑器视图
    if (activeTab === "watermark") {
      return (
        <WatermarkEditorView
          uploadedImages={uploadedImages}
          watermarkLogo={watermarkLogo}
          selectedPreviewIndex={selectedPreviewIndex}
          onSelectIndex={setSelectedPreviewIndex}
          onPositionChange={handleWatermarkPositionChange}
          onChangeBackground={() => fileInputRef.current?.click()}
          onChangeLogo={() => watermarkLogoInputRef.current?.click()}
          outputResolution={outputResolution}
          setOutputResolution={setOutputResolution}
          isProcessing={isProcessing}
          onProcess={handleProcess}
          fileInputRef={fileInputRef}
          watermarkLogoInputRef={watermarkLogoInputRef}
          onFileUpload={handleFileUpload}
          onLogoUpload={handleWatermarkLogoUpload}
          onFolderUpload={handleFolderUpload}
          folderInputRef={folderInputRef}
          onRemoveImage={(id: string) => {
            const imageToRemove = uploadedImages.find(img => img.id === id);
            if (imageToRemove) {
              imageUploadHook.removeImage(imageToRemove);
              removeUploadedImage(id);
            }
          }}
        />
      );
    }

    // 其他模式：显示常规上传界面
    const showReferenceUpload = activeTab === "background" || activeTab === "one-click";
    const isFullWidthUpload = showReferenceUpload;

    const commonUploadSection = (
      <div className="flex flex-col h-full overflow-hidden">
        {/* 上传区域 - 自动撑满，可滚动 */}
        <div className={`flex-1 grid gap-6 ${isFullWidthUpload ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'} overflow-y-auto min-h-0 pb-4`}>
          {/* 主要图片上传区域 */}
          <ImageUploadArea
            uploadedImages={uploadedImages}
            onUpload={handleFileUpload}
            onFolderUpload={handleFolderUpload}
            onClear={clearAllImages}
            onRemove={(id) => {
              removeImage(id);
            }}
            onPreview={() => setShowImageModal(true)}
            fileInputRef={fileInputRef}
            folderInputRef={folderInputRef}
            selectedIndex={selectedPreviewIndex}
            onSelectIndex={setSelectedPreviewIndex}
            isFullWidth={isFullWidthUpload}
          />

          {/* 参考图片上传区域 - 仅在背景替换和一键增强模式显示 */}
          {showReferenceUpload && (
            <ReferenceImageUpload
              referenceImage={referenceImage}
              onUpload={handleReferenceUpload}
              onRemove={removeReferenceImage}
              inputRef={referenceInputRef}
              title="参考图片"
              description={activeTab === "background" ? "选择背景参考图片" : "选择背景参考图片（可选）"}
            />
          )}
        </div>

        {/* 底部固定区域 - 参数设置和操作按钮 */}
        <div className="flex-shrink-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 space-y-4 border-t border-gray-200 mt-4">
          {/* 任务进度显示 - 如果有任务则显示 */}
          {activeTasks.length > 0 && (
            <TaskProgress
              tasks={activeTasks}
              isProcessing={isProcessing}
              getProcessTypeName={getProcessTypeName}
            />
          )}
          {/* 参数设置区域 */}
          <ParameterSettings
            activeTab={activeTab}
            outputResolution={outputResolution}
            setOutputResolution={setOutputResolution}
            aiModel={aiModel}
            setAiModel={setAiModel}
            availableProviders={availableProviders}
            backgroundPrompt={backgroundPrompt}
            setBackgroundPrompt={handleSetBackgroundPrompt}
            outpaintPrompt={outpaintPrompt}
            setOutpaintPrompt={handleSetOutpaintPrompt}
            oneClickBackgroundPrompt={oneClickBackgroundPrompt}
            setOneClickBackgroundPrompt={handleSetOneClickBackgroundPrompt}
            oneClickOutpaintPrompt={oneClickOutpaintPrompt}
            setOneClickOutpaintPrompt={handleSetOneClickOutpaintPrompt}
            xScale={currentTabState.xScale}
            setXScale={setXScale}
            yScale={currentTabState.yScale}
            setYScale={setYScale}
          />

          {/* One-click 水印设置 */}
          {activeTab === "one-click" && (
            <OneClickWatermarkSettings
              enableWatermark={enableWatermark}
              setEnableWatermark={setEnableWatermark}
              watermarkType={watermarkType}
              setWatermarkType={setWatermarkType}
              watermarkText={watermarkText}
              setWatermarkText={setWatermarkText}
              watermarkLogo={watermarkLogo}
              removeWatermarkLogo={removeWatermarkLogo}
              watermarkLogoInputRef={watermarkLogoInputRef}
              uploadedImages={uploadedImages}
              selectedPreviewIndex={selectedPreviewIndex}
              onPositionChange={handleWatermarkPositionChange}
              xScale={xScale}
              yScale={yScale}
            />
          )}

          {/* 处理按钮 */}
          <ActionButtons
            isProcessing={isProcessing}
            onProcess={handleProcess}
            disabled={
              uploadedImages.length === 0 || 
              (activeTab === "background" && !referenceImage)
            }
            activeTab={activeTab}
            tabs={tabs}
          />
        </div>


        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
          className="hidden"
          onChange={handleFolderUpload}
        />
        <input
          ref={referenceInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleReferenceUpload}
        />
        <input
          ref={watermarkLogoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleWatermarkLogoUpload}
        />
      </div>
    );

    return (
      <div className="h-full">
        {commonUploadSection}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 - 功能导航 */}
        <WorkspaceSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabs}
        />

        {/* 右侧内容区域 - 左右布局 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧 - 当前处理区域 */}
          <div className="flex-1 overflow-hidden border-r border-gray-200 flex flex-col">
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-end px-6 py-3 border-b border-gray-200 bg-white">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
                className="flex items-center gap-2"
              >
                <ChevronLeft className={`w-4 h-4 transition-transform ${isHistorySidebarOpen ? 'rotate-0' : 'rotate-180'}`} />
                {isHistorySidebarOpen ? '隐藏历史' : '显示历史'}
              </Button>
            </div>
            
            {/* 主内容区域 - 可滚动 */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {renderTabContent()}
            </div>
          </div>

          {/* 右侧 - 历史记录 */}
          <CollapsibleHistorySidebar
            isOpen={isHistorySidebarOpen}
            onToggle={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)}
            title={(() => {
              const titleMap: Record<ActiveTab, string> = {
                'one-click': '一键增强历史',
                'background': '背景替换历史',
                'expansion': '图像扩展历史',
                'upscaling': '图像放大历史',
                'watermark': '水印处理历史'
              };
              return titleMap[activeTab];
            })()}
            subtitle={`共 ${processedResults.length} 条记录`}
            items={processedResults.map(result => ({
              id: result.id,
              filename: result.originalName,
              thumbnailUrl: result.processedImageUrl,
              processedUrl: result.processedImageUrl,
              originalUrl: result.processedImageUrl,
              createdAt: new Date().toISOString(),
              status: 'COMPLETED',
              processType: result.processType
            }))}
            onItemClick={(item) => {
              const index = processedResults.findIndex(r => r.id === item.id);
              if (index !== -1) {
                setSelectedResultIndex(index);
                setShowResultModal(true);
              }
            }}
            onItemDelete={async (itemId) => {
              try {
                const response = await fetch(`/api/images/${itemId}`, {
                  method: 'DELETE',
                });
                
                if (response.ok) {
                  setProcessedResults(prev => prev.filter(r => r.id !== itemId));
                  toast({
                    title: "删除成功",
                    description: "历史记录已删除",
                  });
                } else {
                  throw new Error('删除失败');
                }
              } catch (error) {
                console.error('删除历史记录失败:', error);
                toast({
                  title: "删除失败",
                  description: error instanceof Error ? error.message : '未知错误',
                  variant: "destructive",
                });
              }
            }}
          />
        </div>
      </div>

      {/* 图片预览模态框 */}
      <ImagePreviewModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        images={uploadedImages}
        selectedIndex={selectedPreviewIndex}
        onNavigate={(direction) => navigateImage(direction)}
      />

      {/* 结果预览模态框 */}
      <ResultModal
        isOpen={showResultModal && selectedResultIndex !== null}
        onClose={() => setShowResultModal(false)}
        result={selectedResultIndex !== null ? processedResults[selectedResultIndex] : null}
      />
    </div>
  );
}