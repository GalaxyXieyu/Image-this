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
  Video,
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
import QualityReviewResultModal from '@/components/workspace/QualityReviewResult';
import BatchWarningDialog from '@/components/workspace/BatchWarningDialog';
import { VideoStyleSelector } from '@/components/workspace/VideoStyleSelector';
import { VideoResultModal } from '@/components/workspace/VideoResultModal';
import { VIDEO_STYLE_TEMPLATES } from '@/lib/video-style-templates';

// Custom Hooks
import { useImageUpload } from '@/hooks/useImageUpload';
import { useImageProcessing } from '@/hooks/useImageProcessing';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// Types
import type { QualityReviewResult } from '@/types/quality-review';

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
  processedImageId?: string;
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
    setEnableQualityReview,
    setCurrentReviewResult,
    setIsReviewing,
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
  const enableQualityReview = currentTabState.enableQualityReview;
  const currentReviewResult = currentTabState.currentReviewResult;
  const isReviewing = currentTabState.isReviewing;
  
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

  // 用户偏好
  const { preferences, updatePreference } = useUserPreferences();

  // 审核相关状态
  const [showReviewResult, setShowReviewResult] = useState(false);
  const [showBatchWarning, setShowBatchWarning] = useState(false);
  const [pendingBatchAction, setPendingBatchAction] = useState<(() => void) | null>(null);
  const [reviewImages, setReviewImages] = useState<{
    product: string;
    reference: string;
    result: string;
  } | null>(null);

  // 历史记录侧边栏状态
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyLoadingRef = useRef(false);

  // 视频生成相关状态
  const [videoStyle, setVideoStyle] = useState('product-showcase');
  const [videoCustomPrompt, setVideoCustomPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState<121 | 241>(121);
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [showVideoResult, setShowVideoResult] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState('');

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
        'watermark': ['WATERMARK'],
        'video': ['VIDEO_GENERATION']
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

  // 智能审核函数
  const performQualityReview = useCallback(async (
    productImageUrl: string,
    referenceImageUrl: string,
    resultImageUrl: string,
    processedImageId?: string
  ) => {
    setIsReviewing(true);
    try {
      const response = await fetch('/api/quality-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productImageBase64: productImageUrl,
          referenceImageBase64: referenceImageUrl,
          resultImageBase64: resultImageUrl,
          prompt: backgroundPrompt,
          processedImageId,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setCurrentReviewResult(data.data);
        setReviewImages({
          product: productImageUrl,
          reference: referenceImageUrl,
          result: resultImageUrl,
        });
        setShowReviewResult(true);
      } else {
        toast({
          title: '审核失败',
          description: data.error || '未知错误',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Quality review error:', error);
      toast({
        title: '审核失败',
        description: '请检查网络连接',
        variant: 'destructive',
      });
    } finally {
      setIsReviewing(false);
    }
  }, [backgroundPrompt, setCurrentReviewResult, setIsReviewing, toast]);

  // 将图片 URL 转换为 base64
  const urlToBase64 = useCallback(async (url: string): Promise<string> => {
    // 如果已经是 base64，直接返回
    if (url.startsWith('data:')) return url;

    // 如果是 blob URL，需要 fetch 并转换
    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // 如果是相对路径或绝对 URL，需要 fetch
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const response = await fetch(fullUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  // 使用 ref 保持 enableQualityReview 的最新值
  const enableQualityReviewRef = useRef(enableQualityReview);
  useEffect(() => {
    enableQualityReviewRef.current = enableQualityReview;
  }, [enableQualityReview]);

  // 任务完成后触发审核的回调
  const handleTaskCompleteWithData = useCallback(async (task: Task) => {
    console.log('[TaskComplete] Task completed:', {
      taskId: task.id,
      type: task.type,
      hasOutputData: !!task.outputData,
    });

    // 视频生成任务完成
    if (task.type === 'VIDEO_GENERATION' && task.outputData) {
      try {
        const outputData = JSON.parse(task.outputData);
        if (outputData.videoUrl) {
          setGeneratedVideoUrl(outputData.videoUrl);
          setShowVideoResult(true);
        }
      } catch (error) {
        console.error('[VideoGeneration] Error parsing output:', error);
      }
      return;
    }

    // 只对背景替换任务且开启了审核的情况触发
    if (task.type !== 'BACKGROUND_REMOVAL') {
      console.log('[QualityReview] Skipped: not BACKGROUND_REMOVAL task');
      return;
    }
    if (!enableQualityReviewRef.current) {
      console.log('[QualityReview] Skipped: quality review disabled');
      return;
    }
    if (!task.outputData) {
      console.log('[QualityReview] Skipped: no outputData');
      return;
    }

    try {
      const outputData = JSON.parse(task.outputData);
      const resultImageUrl = outputData.processedImageUrl || outputData.processedUrl || outputData.imageUrl;
      console.log('[QualityReview] Parsed outputData:', { outputData, resultImageUrl, processedImageId: task.processedImageId });

      // 获取产品图和参考图
      const productImg = uploadedImagesRef.current[0]?.preview;
      const refImg = referenceImageRef.current?.preview;
      console.log('[QualityReview] Images:', { hasProduct: !!productImg, hasRef: !!refImg, hasResult: !!resultImageUrl });

      if (productImg && refImg && resultImageUrl) {
        console.log('[QualityReview] Starting quality review...');
        // 转换为 base64
        const [productBase64, refBase64, resultBase64] = await Promise.all([
          urlToBase64(productImg),
          urlToBase64(refImg),
          urlToBase64(resultImageUrl),
        ]);
        // 使用 outputData 中的 processedImageId 或 task 上的 processedImageId
        const imageId = outputData.processedImageId || task.processedImageId;
        await performQualityReview(productBase64, refBase64, resultBase64, imageId);
      } else {
        console.log('[QualityReview] Skipped: missing images');
      }
    } catch (error) {
      console.error('[QualityReview] Error:', error);
    }
  }, [performQualityReview, urlToBase64]);

  // 使用任务轮询 Hook
  useTaskPolling({
    isProcessing,
    activeTasks,
    setActiveTasks,
    setIsProcessing,
    onTaskComplete: loadProcessingHistory,
    onTaskCompleteWithData: handleTaskCompleteWithData,
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
      },
      {
        id: "video",
        title: "视频生成",
        icon: Video,
        description: "图生视频",
        color: "purple"
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

  // 视频生成处理
  const handleVideoGenerate = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "请先上传图片",
        description: "请选择要作为首帧的图片",
        variant: "destructive",
      });
      return;
    }

    const selectedImage = uploadedImages[selectedPreviewIndex];
    if (!selectedImage) return;

    toast({
      title: "正在启动",
      description: "视频生成任务正在准备中...",
    });

    try {
      setIsProcessing(true);

      // 获取提示词
      let prompt = videoCustomPrompt;
      if (!prompt && videoStyle !== 'custom') {
        const template = VIDEO_STYLE_TEMPLATES.find(t => t.id === videoStyle);
        prompt = template?.prompt || '';
      }

      // 转换图片为 base64
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedImage.file);
      });

      // 创建任务
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VIDEO_GENERATION',
          inputData: JSON.stringify({
            imageUrl: imageBase64,
            prompt,
            frames: videoDuration,
            aspectRatio: videoAspectRatio,
          }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '创建任务失败');
      }

      const { task } = await response.json();

      setActiveTasks(prev => [...prev, {
        ...task,
        originalImageId: selectedImage.id,
        originalName: selectedImage.name,
      }]);

      toast({
        title: "任务创建成功",
        description: "视频生成任务已创建，正在处理中...",
      });

      // 触发 worker
      fetch('/api/tasks/worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true }),
      });

    } catch (error) {
      console.error('视频生成失败:', error);
      toast({
        title: "视频生成失败",
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

    // 视频生成模式
    if (activeTab === "video") {
      return (
        <div className="flex flex-col h-full overflow-hidden">
          {/* 左右布局：宽屏左右，窄屏上下 */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto min-h-0 pb-4">
            {/* 左侧：图片上传区域 */}
            <div className="min-h-[400px]">
              <ImageUploadArea
                uploadedImages={uploadedImages}
                onUpload={handleFileUpload}
                onFolderUpload={handleFolderUpload}
                onClear={clearAllImages}
                onRemove={(id) => removeImage(id)}
                onPreview={() => setShowImageModal(true)}
                fileInputRef={fileInputRef}
                folderInputRef={folderInputRef}
                selectedIndex={selectedPreviewIndex}
                onSelectIndex={setSelectedPreviewIndex}
                isFullWidth={true}
              />
            </div>

            {/* 右侧：视频设置 */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">视频风格</CardTitle>
                </CardHeader>
                <CardContent>
                  <VideoStyleSelector
                    selectedStyle={videoStyle}
                    onStyleChange={setVideoStyle}
                    customPrompt={videoCustomPrompt}
                    onCustomPromptChange={setVideoCustomPrompt}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">视频参数</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">视频时长</Label>
                      <select
                        value={videoDuration}
                        onChange={(e) => setVideoDuration(Number(e.target.value) as 121 | 241)}
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      >
                        <option value={121}>5秒</option>
                        <option value={241}>10秒</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">宽高比</Label>
                      <select
                        value={videoAspectRatio}
                        onChange={(e) => setVideoAspectRatio(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="16:9">16:9 横屏</option>
                        <option value="9:16">9:16 竖屏</option>
                        <option value="1:1">1:1 方形</option>
                        <option value="4:3">4:3</option>
                        <option value="3:4">3:4</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 底部操作区域 */}
          <div className="flex-shrink-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 space-y-4 border-t border-gray-200 mt-4">
            {(activeTasks.length > 0 || isReviewing) && (
              <TaskProgress tasks={activeTasks} isProcessing={isProcessing} getProcessTypeName={getProcessTypeName} isReviewing={isReviewing} />
            )}
            <ActionButtons
              isProcessing={isProcessing}
              disabled={uploadedImages.length === 0}
              onProcess={handleVideoGenerate}
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
        </div>
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
          {/* 任务进度显示 - 如果有任务或正在审核则显示 */}
          {(activeTasks.length > 0 || isReviewing) && (
            <TaskProgress
              tasks={activeTasks}
              isProcessing={isProcessing}
              getProcessTypeName={getProcessTypeName}
              isReviewing={isReviewing}
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
            enableQualityReview={enableQualityReview}
            setEnableQualityReview={setEnableQualityReview}
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
                'watermark': '水印处理历史',
                'video': '视频生成历史'
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

      {/* 智能审核结果弹窗 */}
      {currentReviewResult && reviewImages && (
        <QualityReviewResultModal
          isOpen={showReviewResult}
          onClose={() => {
            setShowReviewResult(false);
            setCurrentReviewResult(null);
          }}
          result={currentReviewResult}
          productImage={reviewImages.product}
          referenceImage={reviewImages.reference}
          resultImage={reviewImages.result}
          prompt={backgroundPrompt}
          onSaveAsTemplate={() => {
            toast({ title: '保存模板功能开发中' });
          }}
          onApplySuggestion={(suggestion) => {
            const newPrompt = backgroundPrompt + '\n' + suggestion;
            handleSetBackgroundPrompt(newPrompt);
            toast({ title: '已追加到提示词' });
          }}
          onRetryWithSuggestions={(newPrompt) => {
            handleSetBackgroundPrompt(newPrompt);
            toast({ title: '已更新提示词，正在重新处理...' });
            // 自动触发重新处理
            setTimeout(() => handleProcess(), 100);
          }}
        />
      )}

      {/* 批量处理警告对话框 */}
      <BatchWarningDialog
        isOpen={showBatchWarning}
        imageCount={uploadedImages.length}
        onConfirm={() => {
          setShowBatchWarning(false);
          pendingBatchAction?.();
          setPendingBatchAction(null);
        }}
        onCancel={() => {
          setShowBatchWarning(false);
          setPendingBatchAction(null);
        }}
        onDontShowAgain={(dontShow) => {
          updatePreference('hideBatchWarning', dontShow);
        }}
      />

      {/* 视频结果弹窗 */}
      <VideoResultModal
        isOpen={showVideoResult}
        onClose={() => {
          setShowVideoResult(false);
          setGeneratedVideoUrl('');
        }}
        videoUrl={generatedVideoUrl}
        originalImage={uploadedImages[selectedPreviewIndex]?.preview}
        prompt={videoCustomPrompt || VIDEO_STYLE_TEMPLATES.find(t => t.id === videoStyle)?.prompt}
      />
    </div>
  );
}