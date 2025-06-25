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
  Trash2
} from "lucide-react";

type ActiveTab = "one-click" | "background" | "expansion" | "upscaling";

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
  
  // 新增：任务管理状态
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 轮询任务状态
  const pollTaskStatus = useCallback(async () => {
    if (activeTasks.length === 0) return;

    try {
      const taskIds = activeTasks.map(task => task.id).join(',');
      const response = await fetch(`/api/tasks?ids=${taskIds}`);
      
      if (!response.ok) return;
      
      const data = await response.json();
      const updatedTasks = data.tasks;

      setActiveTasks(updatedTasks);

      // 检查是否有任务完成
      const completedTasks = updatedTasks.filter((task: Task) => 
        task.status === 'COMPLETED' && 
        !processedResults.find(result => result.id === task.id)
      );

      // 处理完成的任务
      for (const task of completedTasks) {
        if (task.outputData) {
          try {
            const outputData = JSON.parse(task.outputData);
            const processedResult: ProcessedResult = {
              id: task.id,
              originalImageId: task.originalImageId || '',
              originalName: task.originalName || 'Unknown',
              processedImageUrl: outputData.imageData || outputData.processedImageUrl,
              processType: getProcessTypeName(task.type),
              timestamp: new Date().toLocaleString(),
              parameters: outputData.settings || {}
            };
            
            setProcessedResults(prev => [...prev, processedResult]);
            
            toast({
              title: "任务完成",
              description: `${task.originalName} ${getProcessTypeName(task.type)}处理完成`,
            });
          } catch (error) {
            console.error('解析任务输出数据失败:', error);
          }
        }
      }

      // 检查失败的任务
      const failedTasks = updatedTasks.filter((task: Task) => 
        task.status === 'FAILED'
      );

      for (const task of failedTasks) {
        toast({
          title: "任务失败",
          description: `${task.originalName} ${getProcessTypeName(task.type)}处理失败`,
          variant: "destructive",
        });
      }

      // 如果所有任务都完成了，停止轮询
      const remainingActiveTasks = updatedTasks.filter((task: Task) => 
        task.status === 'PENDING' || task.status === 'PROCESSING'
      );

      if (remainingActiveTasks.length === 0) {
        setIsProcessing(false);
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }

    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  }, [activeTasks, processedResults, pollingInterval, toast]);

  // 启动轮询
  useEffect(() => {
    if (isProcessing && activeTasks.length > 0 && !pollingInterval) {
      const interval = setInterval(pollTaskStatus, 2000); // 每2秒轮询一次
      setPollingInterval(interval);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isProcessing, activeTasks.length, pollingInterval, pollTaskStatus]);

  // 组件卸载时清理所有资源 - 修复：移除uploadedImages和referenceImage依赖
  useEffect(() => {
    return () => {
      // 清理定时器
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      // 清理URL对象以防止内存泄露
      // 注意：这里使用闭包捕获当前的图片状态，避免在依赖数组中包含它们
      uploadedImages.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
      if (referenceImage && referenceImage.preview) {
        URL.revokeObjectURL(referenceImage.preview);
      }
    };
  }, [pollingInterval]); // ✅ 只依赖pollingInterval，避免过度清理

  // 获取处理类型显示名称
  const getProcessTypeName = (type: string): string => {
    switch (type) {
      case 'ONE_CLICK_WORKFLOW': return '一键增强';
      case 'BACKGROUND_REMOVAL': return '背景替换';
      case 'IMAGE_EXPANSION': return '图像扩展';
      case 'IMAGE_UPSCALING': return '图像高清化';
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
      description: "背景替换 + 扩图 + 高清化",
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
      const createdTasks = result.tasks.map((task: Task, index: number) => ({
        ...task,
        originalImageId: uploadedImages[index]?.id || '',
        originalName: uploadedImages[index]?.name || 'Unknown'
      }));

      setActiveTasks(createdTasks);
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
      await fetch('/api/tasks/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch: true }),
      });
    } catch (error) {
      console.error('触发任务处理器失败:', error);
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
      });
    }

    await createBatchTasks('IMAGE_UPSCALING', taskData);
  };

  const handleOneClick = async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

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
        customPrompt: customPrompt
      });
    }

    await createBatchTasks('BACKGROUND_REMOVAL', taskData);
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

        {/* 处理结果展示 */}
        {processedResults.length > 0 && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <CheckCircle className="w-5 h-5 text-green-500" />
                处理结果 ({processedResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedResults.map((result, index) => (
                  <div
                    key={result.id}
                    className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-200"
                    onClick={() => {
                      setSelectedResultIndex(index);
                      setShowResultModal(true);
                    }}
                  >
                    <img
                      src={result.processedImageUrl}
                      alt={`${result.originalName} - ${result.processType}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-90 p-2">
                      <p className="text-gray-900 text-xs truncate font-medium">{result.originalName}</p>
                      <p className="text-gray-600 text-xs">{result.processType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
      </div>
    );

    return commonUploadSection;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI 图像工作台
          </h1>
          <p className="text-gray-600">
            使用先进的 AI 技术进行图像处理和增强
          </p>
        </div>

        {/* 标签页导航 */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    isActive
                      ? tab.color === 'orange'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg scale-105'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg scale-105'
                      : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive 
                      ? 'text-white' 
                      : tab.color === 'orange' 
                        ? 'text-orange-500' 
                        : 'text-blue-600'
                  }`} />
                  <div className="text-left">
                    <div className="font-semibold">{tab.title}</div>
                    <div className={`text-xs ${isActive ? 'text-white text-opacity-90' : 'text-gray-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 标签页内容 */}
        {renderTabContent()}

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

        {/* 结果预览模态框 */}
        {showResultModal && selectedResultIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              
              <img
                src={processedResults[selectedResultIndex]?.processedImageUrl}
                alt={`${processedResults[selectedResultIndex]?.originalName} - ${processedResults[selectedResultIndex]?.processType}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 text-gray-900 px-4 py-2 rounded-lg">
                <p className="text-center font-medium">
                  {processedResults[selectedResultIndex]?.originalName} - {processedResults[selectedResultIndex]?.processType}
                </p>
                <p className="text-center text-sm text-gray-600">
                  处理时间: {processedResults[selectedResultIndex]?.timestamp}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}