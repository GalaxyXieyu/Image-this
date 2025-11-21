"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/navigation/Navbar";
import {
  Wand2,
  ImageIcon,
  Expand,
  Zap,
  Upload,
  FileImage,
  Settings as SettingsIcon,
  Play,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  CheckCircle,
  Trash2,
  Image as ImageLucide
} from "lucide-react";

import WatermarkEditor from '@/components/watermark/WatermarkEditor';
import CollapsibleHistorySidebar from '@/components/CollapsibleHistorySidebar';

type ActiveTab = "one-click" | "background" | "expansion" | "upscaling" | "watermark";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("one-click");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [referenceImage, setReferenceImage] = useState<UploadedImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0); // 用于大图预览的选中索引
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  
  // 水印相关状态
  const [enableWatermark, setEnableWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('Sample Watermark');
  const [watermarkOpacity, setWatermarkOpacity] = useState(1.0); // 改为 1.0，保持 Logo 原色
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkType, setWatermarkType] = useState<'text' | 'logo'>('logo');
  const [watermarkLogo, setWatermarkLogo] = useState<UploadedImage | null>(null);
  const [showWatermarkPreview, setShowWatermarkPreview] = useState(false);
  const [watermarkSettings, setWatermarkSettings] = useState({ x: 50, y: 50, scale: 1, editorWidth: 600, editorHeight: 400 });
  
  // 输出分辨率
  const [outputResolution, setOutputResolution] = useState('original');
  
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 加载处理历史 - 根据当前标签页筛选
  const loadProcessingHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/images?limit=100&sortBy=createdAt&order=desc');
      if (!response.ok) return;
      
      const data = await response.json();
      if (data.images && Array.isArray(data.images)) {
        // 根据当前标签页映射到对应的处理类型
        const processTypeMap: Record<ActiveTab, string[]> = {
          'one-click': ['ONE_CLICK_WORKFLOW'],
          'background': ['BACKGROUND_REMOVAL'],
          'expansion': ['IMAGE_OUTPAINTING'],
          'upscaling': ['IMAGE_UPSCALING'],
          'watermark': ['WATERMARK']
        };
        
        const allowedTypes = processTypeMap[activeTab] || [];
        
        const historyResults: ProcessedResult[] = data.images
          .filter((img: any) => 
            img.status === 'COMPLETED' && 
            img.processedUrl &&
            allowedTypes.includes(img.processType)
          )
          .map((img: any) => ({
            id: img.id,
            processedImageUrl: img.processedUrl,
            originalName: img.filename || '未命名',
            processType: img.processType || 'UNKNOWN',
            timestamp: new Date(img.createdAt).toLocaleString('zh-CN')
          }))
          .slice(0, 50); // 限制显示50条
        
        setProcessedResults(historyResults);
      }
    } catch (error) {
      console.error('加载处理历史失败:', error);
    }
  }, [activeTab]);

  // 组件加载时获取历史记录
  useEffect(() => {
    if (status === "authenticated") {
      loadProcessingHistory();
    }
  }, [status, loadProcessingHistory]);

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

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // 稳定的水印位置变化回调
  const handleWatermarkPositionChange = useCallback((position: { x: number; y: number; scale: number; editorWidth: number; editorHeight: number }) => {
    setWatermarkSettings(position);
  }, []);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async () => {
    const tasksSnapshot = activeTasksRef.current;
    if (tasksSnapshot.length === 0) return;

    try {
      const taskIds = tasksSnapshot.map(task => task.id).join(',');
      const response = await fetch(`/api/tasks?ids=${taskIds}`);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const updatedTasks: Task[] = data.tasks || [];
      const originalTaskMap = new Map(tasksSnapshot.map(task => [task.id, task]));
      const processedResultIds = new Set(processedResultsRef.current.map(result => result.id));

      // 检查是否有任务完成
      const completedTasks = updatedTasks.filter(task => task.status === 'COMPLETED');
      let hasNewCompletedTasks = false;

      for (const task of completedTasks) {
        if (!task.outputData || processedResultIds.has(task.id)) continue;

        try {
          const outputData = JSON.parse(task.outputData);
          const originalTask = originalTaskMap.get(task.id);
          
          processedResultIds.add(task.id);
          hasNewCompletedTasks = true;
          
          toast({
            title: "任务完成",
            description: `${originalTask?.originalName || '图片'} ${getProcessTypeName(task.type)}处理完成`,
          });
        } catch (error) {
          console.error('解析任务输出数据失败:', error);
        }
      }

      // 如果有新完成的任务，重新加载历史记录
      if (hasNewCompletedTasks) {
        loadProcessingHistory();
      }

      // 检查失败的任务
      const failedTasks = updatedTasks.filter(task => task.status === 'FAILED');

      for (const task of failedTasks) {
        const originalTask = originalTaskMap.get(task.id);
        toast({
          title: "任务失败",
          description: `${originalTask?.originalName || '图片'} ${getProcessTypeName(task.type)}处理失败`,
          variant: "destructive",
        });
      }

      // 更新仍在处理的任务
      const remainingActiveTasks = updatedTasks
        .filter(task => task.status === 'PENDING' || task.status === 'PROCESSING')
        .map(task => ({
          ...task,
          originalImageId: originalTaskMap.get(task.id)?.originalImageId || task.originalImageId,
          originalName: originalTaskMap.get(task.id)?.originalName || task.originalName,
        }));

      setActiveTasks(remainingActiveTasks);

      if (remainingActiveTasks.length === 0) {
        setIsProcessing(false);
        stopPolling();
      }

    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  }, [stopPolling, toast, loadProcessingHistory]);

  // 启动轮询
  useEffect(() => {
    if (isProcessing && activeTasks.length > 0 && !pollingIntervalRef.current) {
      pollTaskStatus();
      pollingIntervalRef.current = setInterval(pollTaskStatus, 2000); // 每2秒轮询一次
    }

    if ((!isProcessing || activeTasks.length === 0) && pollingIntervalRef.current) {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isProcessing, activeTasks.length, pollTaskStatus, stopPolling]);

  // 组件卸载时清理所有资源 - 修复：移除uploadedImages和referenceImage依赖
  useEffect(() => {
    return () => {
      stopPolling();
      uploadedImagesRef.current.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
      if (referenceImageRef.current?.preview) {
        URL.revokeObjectURL(referenceImageRef.current.preview);
      }
    };
  }, [stopPolling]);

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

  // 支持的图片格式
  const supportedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];

  const isValidImageFile = (file: File): boolean => {
    // 检查MIME类型
    if (!supportedImageTypes.includes(file.type.toLowerCase())) {
      return false;
    }

    // 检查文件扩展名
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return false;
    }

    // 检查文件大小 (最大50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return false;
    }

    return true;
  };

  // 调整图片尺寸以符合API要求
  const resizeImageForAPI = (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        // 通义千问扩图API的尺寸要求：
        // 最小尺寸：512x512
        // 最大尺寸：2048x2048
        // 建议尺寸：1024x1024
        const minSize = 512;
        const maxSize = 2048;
        const targetSize = 1024;

        let { width, height } = img;

        // 如果图片太小，放大到目标尺寸
        if (width < minSize || height < minSize) {
          const scale = targetSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // 如果图片太大，缩小到最大尺寸
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // 确保尺寸是8的倍数（AI模型通常要求）
        width = Math.round(width / 8) * 8;
        height = Math.round(height / 8) * 8;

        canvas.width = width;
        canvas.height = height;

        // 绘制调整后的图片
        ctx.drawImage(img, 0, 0, width, height);

        // 转换为base64
        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(resizedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = imageDataUrl;
    });
  };

  const tabs = [
    {
      id: "one-click" as ActiveTab,
      title: "一键增强",
      icon: Wand2,
      description: "背景替换 + 扩图 + 高清化 + 水印",
      color: "orange"
    },
    {
      id: "background" as ActiveTab,
      title: "背景替换",
      icon: ImageIcon,
      description: "智能换背景",
      color: "blue"
    },
    {
      id: "expansion" as ActiveTab,
      title: "图像扩展",
      icon: Expand,
      description: "智能扩图",
      color: "blue"
    },
    {
      id: "upscaling" as ActiveTab,
      title: "图像高清化",
      icon: Zap,
      description: "AI超分辨率",
      color: "orange"
    },
    {
      id: "watermark" as ActiveTab,
      title: "叠加水印",
      icon: FileImage,
      description: "添加文字水印",
      color: "blue"
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (isValidImageFile(file)) {
        const id = `${Date.now()}-${index}`;
        const preview = URL.createObjectURL(file);
        validFiles.push({
          id,
          file,
          preview,
          name: file.name
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
      toast({
        title: "图片上传成功",
        description: `成功上传 ${validFiles.length} 张图片`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "部分文件上传失败",
        description: `${invalidFiles.length} 个文件格式不支持或文件过大`,
        variant: "destructive",
      });
    }

    // 清空input的值，以便重复选择同一文件
    event.target.value = '';
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (isValidImageFile(file)) {
        const id = `${Date.now()}-${index}`;
        const preview = URL.createObjectURL(file);
        validFiles.push({
          id,
          file,
          preview,
          name: file.name
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      setUploadedImages(prev => [...prev, ...validFiles]);
      toast({
        title: "文件夹上传成功",
        description: `从文件夹中成功上传 ${validFiles.length} 张图片`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "部分文件上传失败",
        description: `${invalidFiles.length} 个文件格式不支持或文件过大`,
        variant: "destructive",
      });
    }

    // 清空input的值
    event.target.value = '';
  };

  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "文件格式错误",
        description: "请选择有效的图片文件（JPG、PNG、WebP等）",
        variant: "destructive",
      });
      return;
    }

    const id = `ref-${Date.now()}`;
    const preview = URL.createObjectURL(file);
    setReferenceImage({
      id,
      file,
      preview,
      name: file.name
    });

    toast({
      title: "参考图片上传成功",
      description: file.name,
    });

    // 清空input的值
    event.target.value = '';
  };

  const removeImage = (id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
      setUploadedImages(prev => prev.filter(img => img.id !== id));
    }
  };

  const removeReferenceImage = () => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.preview);
      setReferenceImage(null);
    }
  };

  const handleWatermarkLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "文件格式错误",
        description: "请选择有效的图片文件（JPG、PNG等）",
        variant: "destructive",
      });
      return;
    }

    const id = `logo-${Date.now()}`;
    const preview = URL.createObjectURL(file);
    setWatermarkLogo({
      id,
      file,
      preview,
      name: file.name
    });

    toast({
      title: "水印Logo上传成功",
      description: file.name,
    });

    event.target.value = '';
  };

  const removeWatermarkLogo = () => {
    if (watermarkLogo) {
      URL.revokeObjectURL(watermarkLogo.preview);
      setWatermarkLogo(null);
    }
  };

  const clearAllImages = () => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedPreviewIndex(prev => prev > 0 ? prev - 1 : uploadedImages.length - 1);
    } else {
      setSelectedPreviewIndex(prev => prev < uploadedImages.length - 1 ? prev + 1 : 0);
    }
  };

  // 批量创建任务的通用函数
  const createBatchTasks = async (taskType: string, taskData: Record<string, unknown>[]) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData.map(data => ({
          type: taskType,
          inputData: JSON.stringify(data),
          priority: 1,
          totalSteps: taskType === 'ONE_CLICK_WORKFLOW' ? 3 : 1
        }))),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`创建任务失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();
      const createdTasks = result.tasks.map((task: Task, index: number) => {
        const data = taskData[index] as any;
        return {
          ...task,
          originalImageId: data.originalImageId || uploadedImages[index]?.id || '',
          originalName: data.originalImageName || uploadedImages[index]?.name || 'Unknown'
        };
      });

      setActiveTasks(prev => {
        const existingIds = new Set(prev.map(task => task.id));
        const mergedTasks = [...prev];
        createdTasks.forEach((task: Task) => {
          if (!existingIds.has(task.id)) {
            mergedTasks.push(task);
          }
        });
        return mergedTasks;
      });
      setIsProcessing(true);

      // 启动后台任务处理
      await triggerWorker();

      toast({
        title: "任务创建成功",
        description: `已创建 ${createdTasks.length} 个${getProcessTypeName(taskType)}任务`,
      });

      return createdTasks;

    } catch (error) {
      console.error('创建批量任务失败:', error);
      throw error;
    }
  };

  // 触发后台任务处理器
  const triggerWorker = async () => {
    try {
      console.log('[Worker] 触发后台任务处理器...');
      const response = await fetch('/api/tasks/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch: true }),
      });
      
      if (response.ok) {
        console.log('[Worker] 任务处理器已触发');
      } else {
        console.error('[Worker] 任务处理器触发失败:', response.status);
      }
    } catch (error) {
      console.error('[Worker] 触发任务处理器失败:', error);
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

    try {
      // 根据当前标签页选择不同的处理方式
      if (activeTab === 'expansion') {
        await handleExpansion();
      } else if (activeTab === 'upscaling') {
        await handleUpscaling();
      } else if (activeTab === 'one-click') {
        await handleOneClick();
      } else if (activeTab === 'background') {
        await handleBackgroundReplace();
      } else if (activeTab === 'watermark') {
        await handleWatermark();
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

  const handleExpansion = async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);
      
      taskData.push({
        imageUrl: resizedImageUrl,
        xScale,
        yScale,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    await createBatchTasks('IMAGE_EXPANSION', taskData);
  };

  const handleUpscaling = async () => {
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);
      
      taskData.push({
        imageUrl: resizedImageUrl,
        upscaleFactor,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    await createBatchTasks('IMAGE_UPSCALING', taskData);
  };

  const handleOneClick = async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    // 准备logo数据
    let watermarkLogoData: string | undefined;
    let watermarkPositionData: any = watermarkPosition;
    
    if (enableWatermark && watermarkType === 'logo' && watermarkLogo) {
      watermarkLogoData = await resizeImageForAPI(watermarkLogo.preview);
      watermarkPositionData = watermarkSettings; // 使用交互式设置的位置和缩放
    }

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);
      
      let resizedReferenceUrl = undefined;
      if (referenceImage) {
        resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);
      }

      taskData.push({
        imageUrl: resizedImageUrl,
        referenceImageUrl: resizedReferenceUrl,
        xScale,
        yScale,
        upscaleFactor,
        enableBackgroundReplace: !!referenceImage,
        enableOutpaint: true,
        enableUpscale: true,
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition: watermarkPositionData,
        watermarkType,
        watermarkLogoUrl: watermarkLogoData,
        outputResolution,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    await createBatchTasks('ONE_CLICK_WORKFLOW', taskData);
  };

  const handleBackgroundReplace = async () => {
    if (!referenceImage) {
      throw new Error('背景替换需要参考图片');
    }

    const customPrompt = (document.getElementById('customPrompt') as HTMLTextAreaElement)?.value || '';

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedOriginalUrl = await resizeImageForAPI(image.preview);
      const resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);

      taskData.push({
        imageUrl: resizedOriginalUrl,
        referenceImageUrl: resizedReferenceUrl,
        customPrompt: customPrompt,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    await createBatchTasks('BACKGROUND_REMOVAL', taskData);
  };

  const handleWatermark = async () => {
    if (!watermarkLogo) {
      throw new Error('请先上传Logo图片');
    }
    
    const taskData = [];
    
    // 准备logo数据
    const watermarkLogoData = await resizeImageForAPI(watermarkLogo.preview);
    
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);
      
      taskData.push({
        imageUrl: resizedImageUrl,
        watermarkType: 'logo',
        watermarkLogoUrl: watermarkLogoData,
        watermarkPosition: watermarkSettings, // 使用交互式设置的位置和缩放
        watermarkOpacity: 1.0, // 使用 100% 不透明度保持 Logo 原色
        outputResolution,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    await createBatchTasks('WATERMARK', taskData);
  };

  const renderTabContent = () => {
    const commonUploadSection = (
      <div className="space-y-6">
        {/* 上传区域 - 左右布局 */}
        <div className={`grid gap-6 ${(activeTab === "background" || activeTab === "one-click") ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* 主要图片上传区域 */}
          <Card className={`border-2 border-dashed border-gray-300 hover:border-orange-400 transition-all duration-300 bg-white ${(activeTab === "background" || activeTab === "one-click") ? 'lg:col-span-2' : ''}`}>
          <CardContent className="p-6">
            {uploadedImages.length === 0 ? (
              // 空状态 - 显示上传提示
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                  <FileImage className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">上传图片</h3>
                <p className="text-gray-500 text-sm mb-3">
                  支持 JPG, PNG 格式，支持批量上传或文件夹上传
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择图片
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-300 text-orange-600 hover:bg-orange-50"
                    onClick={() => folderInputRef.current?.click()}
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    选择文件夹
                  </Button>
                </div>
              </div>
            ) : (
              // 有图片时 - 显示大图预览和缩略图选择
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">已选择 {uploadedImages.length} 张图片</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      添加图片
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearAllImages}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      清空
                    </Button>
                  </div>
                </div>
                
                {/* 大图预览区域 */}
                <div className="mb-4">
                  <div 
                    className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-orange-300 transition-colors"
                    onClick={() => setShowImageModal(true)}
                  >
                    <img
                      src={uploadedImages[selectedPreviewIndex]?.preview}
                      alt={uploadedImages[selectedPreviewIndex]?.name}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* 放大按钮 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                      <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </div>
                    </div>
                    
                    {uploadedImages.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateImage('prev');
                          }}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 shadow-md"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateImage('next');
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 shadow-md"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <div className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 rounded px-3 py-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{uploadedImages[selectedPreviewIndex]?.name}</p>
                      {uploadedImages.length > 1 && (
                        <p className="text-xs text-gray-600">{selectedPreviewIndex + 1} / {uploadedImages.length}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 缩略图选择区域 */}
                {uploadedImages.length > 1 && (
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {uploadedImages.map((image, index) => (
                      <div
                        key={image.id}
                        className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                          index === selectedPreviewIndex 
                            ? 'ring-2 ring-orange-400 ring-offset-2' 
                            : 'hover:ring-2 hover:ring-gray-300'
                        }`}
                        onClick={() => setSelectedPreviewIndex(index)}
                      >
                        <img
                          src={image.preview}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                            // 如果删除的是当前选中的图片，调整选中索引
                            if (index === selectedPreviewIndex && uploadedImages.length > 1) {
                              setSelectedPreviewIndex(prev => prev > 0 ? prev - 1 : 0);
                            }
                          }}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

          {/* 参考图片上传区域 - 仅在背景替换和一键增强模式显示 */}
          {(activeTab === "background" || activeTab === "one-click") && (
            <Card className="border-2 border-dashed border-blue-300 hover:border-blue-300 transition-all duration-300 bg-white">
              <CardContent className="p-6">
                {!referenceImage ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                      <ImageIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">参考图片</h3>
                    <p className="text-gray-500 text-sm mb-3">
                      {activeTab === "background" ? "选择背景参考图片" : "选择背景参考图片（可选）"}
                    </p>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => referenceInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      选择图片
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={referenceImage.preview}
                        alt={referenceImage.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-700 mb-2 truncate">{referenceImage.name}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => referenceInputRef.current?.click()}
                      >
                        更换
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={removeReferenceImage}
                      >
                        <X className="w-4 h-4 mr-1" />
                        删除
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 任务进度显示 */}
        {isProcessing && activeTasks.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <h3 className="text-lg font-semibold text-gray-900">
                  正在处理 {activeTasks.length} 个任务
                </h3>
              </div>
              
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {task.originalName || 'Unknown'} - {getProcessTypeName(task.type)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {task.status === 'COMPLETED' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : task.status === 'FAILED' ? (
                          <X className="w-5 h-5 text-red-500" />
                        ) : (
                          `${Math.round(task.progress)}%`
                        )}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          task.status === 'COMPLETED' ? 'bg-green-500' :
                          task.status === 'FAILED' ? 'bg-red-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${Math.max(task.progress, 5)}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-sm text-gray-600">{task.currentStep}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 参数设置区域 */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <SettingsIcon className="w-5 h-5" />
              参数设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(activeTab === "expansion" || activeTab === "one-click") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="xScale">X轴扩展倍数</Label>
                  <Input
                    id="xScale"
                    type="number"
                    min="1.1"
                    max="4.0"
                    step="0.1"
                    defaultValue="2.0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="yScale">Y轴扩展倍数</Label>
                  <Input
                    id="yScale"
                    type="number"
                    min="1.1"
                    max="4.0"
                    step="0.1"
                    defaultValue="2.0"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {(activeTab === "upscaling" || activeTab === "one-click") && (
              <div>
                <Label htmlFor="upscaleFactor">高清化倍数</Label>
                <select
                  id="upscaleFactor"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                  defaultValue="2"
                >
                  <option value="2">2x</option>
                  <option value="4">4x</option>
                </select>
              </div>
            )}

            {activeTab === "background" && (
              <div>
                <Label htmlFor="customPrompt">自定义提示词（可选）</Label>
                <textarea
                  id="customPrompt"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="描述期望的背景效果..."
                />
              </div>
            )}

            {activeTab === "watermark" && (
              <div className="space-y-4">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-900 mb-1">📝 使用说明</h4>
                    <ol className="text-xs text-orange-800 space-y-1 list-decimal list-inside">
                      <li>在侧显示示已上传的<strong>目标图片</strong>，右侧上传透明背景的<strong>Logo图片</strong></li>
                      <li>上传Logo后，下方会显示编辑器，可拖拽调整Logo的位置和大小</li>
                      <li>点击"开始处理水印"批量应用到所有图片</li>
                    </ol>
                  </div>
                  
                  {/* Logo上传区域 */}
                  <div>
                    <Label className="mb-2 block">Logo图片（支持PNG透明背景）</Label>
                    {!watermarkLogo ? (
                      <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all">
                        <CardContent className="p-6 text-center">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                            <FileImage className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-base font-semibold text-gray-900 mb-1">上传Logo</h3>
                          <p className="text-gray-500 text-sm mb-3">支持PNG透明背景格式</p>
                          <Button
                            type="button"
                            className="bg-blue-500 hover:bg-blue-600"
                            onClick={() => watermarkLogoInputRef.current?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            选择图片
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 border border-gray-200 rounded overflow-hidden bg-gray-50">
                              <img src={watermarkLogo.preview} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{watermarkLogo.name}</p>
                              <p className="text-xs text-gray-500">透明背景Logo</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={removeWatermarkLogo}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* 水印编辑器 */}
                  {watermarkLogo && uploadedImages.length > 0 && (
                    <div className="space-y-4">
                      <div className="border-t pt-4">
                        <Label className="mb-2 block text-base font-medium">调整Logo位置和大小</Label>
                        <WatermarkEditor
                          imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                          logoUrl={watermarkLogo.preview}
                          onPositionChange={handleWatermarkPositionChange}
                          width={900}
                          height={600}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="outputResolution">输出分辨率</Label>
                        <select
                          id="outputResolution"
                          value={outputResolution}
                          onChange={(e) => setOutputResolution(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                        >
                          <option value="original">原始分辨率</option>
                          <option value="1920x1080">1920x1080 (Full HD)</option>
                          <option value="2560x1440">2560x1440 (2K)</option>
                          <option value="3840x2160">3840x2160 (4K)</option>
                          <option value="1080x1080">1080x1080 (正方形)</option>
                          <option value="1024x1024">1024x1024 (正方形)</option>
                          <option value="2048x2048">2048x2048 (正方形)</option>
                        </select>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {activeTab === "one-click" && (
              <>
                <div className="mt-4">
                  <Label htmlFor="oneClickOutputResolution" className="text-sm">输出分辨率</Label>
                  <select
                    id="oneClickOutputResolution"
                    value={outputResolution}
                    onChange={(e) => setOutputResolution(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                  >
                    <option value="original">原始分辨率</option>
                    <option value="1920x1080">1920x1080 (Full HD)</option>
                    <option value="2560x1440">2560x1440 (2K)</option>
                    <option value="3840x2160">3840x2160 (4K)</option>
                    <option value="1080x1080">1080x1080 (正方形)</option>
                    <option value="1024x1024">1024x1024 (正方形)</option>
                    <option value="2048x2048">2048x2048 (正方形)</option>
                  </select>
                </div>
                <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="enableWatermark"
                      checked={enableWatermark}
                      onChange={(e) => setEnableWatermark(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="enableWatermark" className="text-sm font-medium text-gray-900 cursor-pointer">
                      启用水印功能
                    </Label>
                  </div>
                  {enableWatermark && (
                    <div className="space-y-3 ml-6">
                      <div className="p-2 bg-blue-100 border border-blue-300 rounded text-xs text-blue-800 mb-2">
                        💡 启用水印后，上传Logo并在编辑器中调整位置和大小
                      </div>
                      <div>
                        <Label htmlFor="oneClickWatermarkType" className="text-sm">水印类型</Label>
                        <select
                          id="oneClickWatermarkType"
                          value={watermarkType}
                          onChange={(e) => setWatermarkType(e.target.value as 'text' | 'logo')}
                          className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 bg-white text-sm"
                        >
                          <option value="text">文字水印</option>
                          <option value="logo">Logo水印</option>
                        </select>
                      </div>
                      {watermarkType === 'text' ? (
                        <div>
                          <Label htmlFor="oneClickWatermarkText" className="text-sm">水印文字</Label>
                          <Input
                            id="oneClickWatermarkText"
                            type="text"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="输入水印文字..."
                            className="mt-1 text-sm"
                          />
                        </div>
                      ) : (
                        <div>
                          <Label className="text-sm">Logo图片</Label>
                          {watermarkLogo ? (
                            <div className="mt-1 p-2 border border-gray-300 rounded-md bg-white">
                              <div className="flex items-center gap-2">
                                <img src={watermarkLogo.preview} alt="Logo" className="w-8 h-8 object-contain" />
                                <span className="text-xs flex-1 truncate">{watermarkLogo.name}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={removeWatermarkLogo}
                                  className="h-6 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full mt-1"
                              onClick={() => watermarkLogoInputRef.current?.click()}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              上传Logo
                            </Button>
                          )}
                        </div>
                      )}
                      {watermarkType === 'logo' && watermarkLogo && uploadedImages.length > 0 && (
                        <div className="mt-3">
                          <Label className="text-sm mb-2 block">调整Logo位置和大小</Label>
                          <WatermarkEditor
                            imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                            logoUrl={watermarkLogo.preview}
                            onPositionChange={handleWatermarkPositionChange}
                            width={400}
                            height={300}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 处理按钮 */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleProcess}
            disabled={uploadedImages.length === 0 || isProcessing || (activeTab === "background" && !referenceImage)}
            className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                开始{tabs.find(tab => tab.id === activeTab)?.title}
              </>
            )}
          </Button>
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

    return commonUploadSection;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 - 功能导航 */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* 功能模块列表 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">功能模块</h2>
              <div className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all duration-200 text-left group ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive 
                          ? 'text-white' 
                          : 'text-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{tab.title}</div>
                        <div className={`text-xs mt-0.5 truncate ${
                          isActive ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧内容区域 - 左右布局 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧 - 当前处理区域 */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200">
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
          
          {/* 右侧 - 历史记录 */}
          <CollapsibleHistorySidebar
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
          />
        </div>
      </div>

        {/* 图片预览模态框 */}
        {showImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              {uploadedImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage('prev')}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
              
              <img
                src={uploadedImages[selectedPreviewIndex]?.preview}
                alt={uploadedImages[selectedPreviewIndex]?.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 text-gray-900 px-4 py-2 rounded-lg">
                <p className="text-center font-medium">
                  {uploadedImages[selectedPreviewIndex]?.name}
                </p>
                {uploadedImages.length > 1 && (
                  <p className="text-center text-sm text-gray-600">
                    {selectedPreviewIndex + 1} / {uploadedImages.length}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 结果预览模态框 - 优化版 */}
        {showResultModal && selectedResultIndex !== null && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResultModal(false)}
          >
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* 图片容器 - 自动适应屏幕 */}
              <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                <img
                  src={processedResults[selectedResultIndex]?.processedImageUrl}
                  alt={`${processedResults[selectedResultIndex]?.originalName} - ${processedResults[selectedResultIndex]?.processType}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}