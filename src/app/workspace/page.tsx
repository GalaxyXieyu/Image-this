"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock,
  Sparkles,
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
  parameters?: any;
}

export default function WorkspacePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("one-click");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [referenceImage, setReferenceImage] = useState<UploadedImage | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0); // 用于大图预览的选中索引
  const [processedResults, setProcessedResults] = useState<ProcessedResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState<number | null>(null);
  const [processedCount, setProcessedCount] = useState(0); // 已处理的图片数量
  const [totalCount, setTotalCount] = useState(0); // 总图片数量
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

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
      color: "amber"
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
      color: "green"
    },
    {
      id: "upscaling" as ActiveTab,
      title: "图像高清化",
      icon: Zap,
      description: "AI提升分辨率 (演示模式)",
      color: "purple"
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file) => {
      if (isValidImageFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    // 显示无效文件警告
    if (invalidFiles.length > 0) {
      toast({
        title: "文件格式错误",
        description: `以下文件格式不支持或文件过大：${invalidFiles.join(', ')}。支持的格式：JPG, PNG, WebP, GIF, BMP, TIFF`,
        variant: "destructive",
      });
    }

    // 处理有效文件
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: UploadedImage = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: e.target?.result as string,
          name: file.name
        };
        setUploadedImages(prev => {
          const newImages = [...prev, newImage];
          // 如果这是第一张图片，设置为预览图片
          if (prev.length === 0) {
            setSelectedPreviewIndex(0);
          }
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    });

    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    // 过滤出有效的图片文件并按名称排序
    Array.from(files).forEach((file) => {
      if (isValidImageFile(file)) {
        validFiles.push(file);
      } else if (file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|gif|bmp|webp|tiff|tif)$/i)) {
        // 只对看起来像图片的文件报告错误
        invalidFiles.push(file.name);
      }
    });

    // 显示无效文件警告
    if (invalidFiles.length > 0) {
      toast({
        title: "文件格式错误",
        description: `以下文件格式不支持或文件过大：${invalidFiles.join(', ')}。支持的格式：JPG, PNG, WebP, GIF, BMP, TIFF`,
        variant: "destructive",
      });
    }

    // 按名称排序并处理有效文件
    validFiles.sort((a, b) => a.name.localeCompare(b.name)).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: UploadedImage = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview: e.target?.result as string,
          name: file.name
        };
        setUploadedImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });

    // 清空input值，允许重复选择
    event.target.value = '';
  };

  const handleReferenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "文件格式错误",
        description: `文件格式不支持或文件过大：${file.name}。支持的格式：JPG, PNG, WebP, GIF, BMP, TIFF`,
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newImage: UploadedImage = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: e.target?.result as string,
        name: file.name
      };
      setReferenceImage(newImage);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // 如果删除的是当前预览的图片，调整预览索引
      const removedIndex = prev.findIndex(img => img.id === id);
      if (removedIndex === selectedPreviewIndex) {
        if (newImages.length > 0) {
          setSelectedPreviewIndex(Math.min(selectedPreviewIndex, newImages.length - 1));
        }
      } else if (removedIndex < selectedPreviewIndex) {
        setSelectedPreviewIndex(selectedPreviewIndex - 1);
      }
      return newImages;
    });
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
  };

  const clearAllImages = () => {
    setUploadedImages([]);
    setSelectedPreviewIndex(0);
  };

  const openImageModal = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImageIndex === null) return;

    if (direction === 'prev' && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    } else if (direction === 'next' && selectedImageIndex < uploadedImages.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
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

    setIsProcessing(true);
    setProcessedCount(0);
    setTotalCount(uploadedImages.length);

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
      // console.error('处理失败:', error);
      toast({
        title: "处理失败",
        description: error instanceof Error ? error.message : '未知错误',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessedCount(0);
      setTotalCount(0);
    }
  };

  const handleExpansion = async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      try {
        // 调整图片尺寸以符合API要求
        // console.log(`正在调整图片 ${image.name} 的尺寸...`);
        const resizedImageUrl = await resizeImageForAPI(image.preview);
        // console.log(`图片 ${image.name} 尺寸调整完成`);

        const response = await fetch('/api/qwen/outpaint', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: resizedImageUrl,
            xScale,
            yScale,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`扩图失败: ${errorData.details || response.statusText}`);
        }

        const result = await response.json();
        // console.log('扩图成功:', result);

        // 保存处理结果
        const processedResult: ProcessedResult = {
          id: result.data.id, // 使用数据库记录ID
          originalImageId: image.id,
          originalName: image.name,
          processedImageUrl: result.data.imageData, // 用于即时显示
          processType: '图像扩展',
          timestamp: new Date().toLocaleString(),
          parameters: { xScale, yScale }
        };

        setProcessedResults(prev => [...prev, processedResult]);
        setProcessedCount(i + 1); // 更新已处理数量
        toast({
          title: "扩图成功",
          description: `图片 ${image.name} 扩图处理完成`,
        });
      } catch (error) {
        // console.error(`图片 ${image.name} 扩图失败:`, error);
        setProcessedCount(i + 1); // 即使失败也要更新计数
        toast({
          title: "扩图失败",
          description: `图片 ${image.name} 扩图失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  };

  const handleUpscaling = async () => {
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      try {
        // 调整图片尺寸以符合API要求
        // console.log(`正在调整图片 ${image.name} 的尺寸...`);
        const resizedImageUrl = await resizeImageForAPI(image.preview);
        // console.log(`图片 ${image.name} 尺寸调整完成`);

        const response = await fetch('/api/qwen/upscale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: resizedImageUrl,
            upscaleFactor,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`高清化失败: ${errorData.details || response.statusText}`);
        }

        const result = await response.json();
        // console.log('高清化成功:', result);

        // 保存处理结果
        const processedResult: ProcessedResult = {
          id: result.data.id, // 使用数据库记录ID
          originalImageId: image.id,
          originalName: image.name,
          processedImageUrl: result.data.imageData, // 用于即时显示
          processType: '图像高清化',
          timestamp: new Date().toLocaleString(),
          parameters: { upscaleFactor }
        };

        setProcessedResults(prev => [...prev, processedResult]);
        setProcessedCount(i + 1); // 更新已处理数量
        toast({
          title: "高清化成功",
          description: `图片 ${image.name} 高清化处理完成`,
        });
      } catch (error) {
        // console.error(`图片 ${image.name} 高清化失败:`, error);
        setProcessedCount(i + 1); // 即使失败也要更新计数
        toast({
          title: "高清化失败",
          description: `图片 ${image.name} 高清化失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  };

  const handleOneClick = async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      try {
        // 调整图片尺寸以符合API要求
        // console.log(`正在调整图片 ${image.name} 的尺寸...`);
        const resizedImageUrl = await resizeImageForAPI(image.preview);
        // console.log(`图片 ${image.name} 尺寸调整完成`);

        // 如果有参考图片，也需要调整尺寸
        let resizedReferenceUrl = undefined;
        if (referenceImage) {
          // console.log(`正在调整参考图片 ${referenceImage.name} 的尺寸...`);
          resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);
          // console.log(`参考图片 ${referenceImage.name} 尺寸调整完成`);
        }

        const response = await fetch('/api/workflow/one-click', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrl: resizedImageUrl,
            referenceImageUrl: resizedReferenceUrl,
            xScale,
            yScale,
            upscaleFactor,
            enableBackgroundReplace: !!referenceImage,
            enableOutpaint: true,
            enableUpscale: true, // 使用模拟高清化API
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`一键增强失败: ${errorData.details || response.statusText}`);
        }

        const result = await response.json();
        // console.log('一键增强成功:', result);

        // 保存处理结果
        const processedResult: ProcessedResult = {
          id: result.data.id, // 使用数据库记录ID
          originalImageId: image.id,
          originalName: image.name,
          processedImageUrl: result.data.imageData, // 用于即时显示
          processType: '一键增强',
          timestamp: new Date().toLocaleString(),
          parameters: { xScale, yScale, upscaleFactor }
        };

        setProcessedResults(prev => [...prev, processedResult]);
        setProcessedCount(i + 1); // 更新已处理数量
        toast({
          title: "一键增强成功",
          description: `图片 ${image.name} 一键增强处理完成`,
        });
      } catch (error) {
        // console.error(`图片 ${image.name} 一键增强失败:`, error);
        setProcessedCount(i + 1); // 即使失败也要更新计数
        toast({
          title: "一键增强失败",
          description: `图片 ${image.name} 一键增强失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  };

  const handleBackgroundReplace = async () => {
    if (!referenceImage) {
      throw new Error('背景替换需要参考图片');
    }

    // 获取自定义提示词
    const customPrompt = (document.getElementById('customPrompt') as HTMLTextAreaElement)?.value || '';

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      try {
        // 调整图片尺寸以符合API要求
        // console.log(`正在调整图片 ${image.name} 的尺寸...`);
        const resizedOriginalUrl = await resizeImageForAPI(image.preview);
        const resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);
        // console.log(`图片 ${image.name} 尺寸调整完成`);

        const response = await fetch('/api/gpt/background-replace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            originalImageUrl: resizedOriginalUrl,
            referenceImageUrl: resizedReferenceUrl,
            customPrompt: customPrompt
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`背景替换失败: ${errorData.details || response.statusText}`);
        }

        const result = await response.json();
        // console.log('背景替换成功:', result);

        // 保存处理结果
        const processedResult: ProcessedResult = {
          id: result.data.id, // 使用数据库记录ID
          originalImageId: image.id,
          originalName: image.name,
          processedImageUrl: result.data.imageData, // 用于即时显示
          processType: '背景替换',
          timestamp: new Date().toLocaleString(),
          parameters: {
            hasReferenceImage: true,
            prompt: result.data.prompt,
            customPrompt: customPrompt
          }
        };

        setProcessedResults(prev => [...prev, processedResult]);
        setProcessedCount(i + 1); // 更新已处理数量
        toast({
          title: "背景替换成功",
          description: `图片 ${image.name} 背景替换处理完成`,
        });
      } catch (error) {
        // console.error(`图片 ${image.name} 背景替换失败:`, error);
        setProcessedCount(i + 1); // 即使失败也要更新计数
        toast({
          title: "背景替换失败",
          description: `图片 ${image.name} 背景替换失败: ${error instanceof Error ? error.message : '未知错误'}`,
          variant: "destructive",
        });
        throw error;
      }
    }
  };

  const renderTabContent = () => {
    const commonUploadSection = (
      <div className="space-y-6">
        {/* 上传区域 - 左右布局 */}
        <div className={`grid gap-6 ${(activeTab === "background" || activeTab === "one-click") ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {/* 主要图片上传区域 */}
          <Card className={`border-2 border-dashed border-gray-300 hover:border-amber-400 transition-all duration-300 bg-gradient-to-br from-white to-gray-50 ${(activeTab === "background" || activeTab === "one-click") ? 'lg:col-span-2' : ''}`}>
          <CardContent className="p-6">
            {uploadedImages.length === 0 ? (
              // 空状态 - 显示上传提示
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-3">
                  <FileImage className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">上传图片</h3>
                <p className="text-gray-500 text-sm mb-3">
                  支持 JPG, PNG 格式，支持批量上传或文件夹上传
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    选择图片
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-600 hover:bg-amber-50"
                    onClick={() => folderInputRef.current?.click()}
                  >
                    <FileImage className="w-4 h-4 mr-2" />
                    选择文件夹
                  </Button>
                </div>
              </div>
            ) : (
              // 有图片时 - 显示预览网格
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
                      className="border-amber-300 text-amber-600 hover:bg-amber-50"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <FileImage className="w-4 h-4 mr-2" />
                      添加文件夹
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={clearAllImages}
                    >
                      <X className="w-4 h-4 mr-2" />
                      清空全部
                    </Button>
                  </div>
                </div>

                {/* 主图预览区域 */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
                  <div className="aspect-video bg-gray-50 rounded-lg overflow-hidden mb-3 relative">
                    <img
                      src={uploadedImages[selectedPreviewIndex]?.preview}
                      alt={uploadedImages[selectedPreviewIndex]?.name}
                      className="w-full h-full object-contain"
                    />
                    {/* 图片信息 */}
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                      {uploadedImages[selectedPreviewIndex]?.name}
                    </div>
                    {/* 图片计数 */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                      {selectedPreviewIndex + 1} / {uploadedImages.length}
                    </div>
                    {/* 放大查看按钮 */}
                    <button
                      onClick={() => openImageModal(selectedPreviewIndex)}
                      className="absolute top-2 left-2 w-8 h-8 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full flex items-center justify-center transition-all"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 缩略图导航 */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {uploadedImages.map((image, index) => (
                      <div key={image.id} className="relative group flex-shrink-0">
                        <div
                          className={`w-16 h-16 bg-white rounded-lg overflow-hidden cursor-pointer transition-all shadow-sm border-2 ${
                            index === selectedPreviewIndex
                              ? 'border-amber-400 ring-2 ring-amber-200'
                              : 'border-gray-200 hover:border-amber-300'
                          }`}
                          onClick={() => setSelectedPreviewIndex(index)}
                        >
                          <img
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* 隐藏的文件夹输入 */}
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: "" } as any)}
              multiple
              accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,image/*"
              onChange={handleFolderUpload}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* 参考图片上传区域（背景替换和一键增强需要） */}
        {(activeTab === "background" || activeTab === "one-click") && (
          <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2 text-blue-600" />
                参考图片
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">用于背景替换的参考图片（可选）</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!referenceImage ? (
                <div
                  className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => referenceInputRef.current?.click()}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">点击上传参考图片</p>
                  <p className="text-xs text-gray-500">支持 JPG, PNG 格式</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={referenceImage.preview}
                        alt={referenceImage.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={removeReferenceImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900 truncate">{referenceImage.name}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={() => referenceInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      更换图片
                    </Button>
                  </div>
                </div>
              )}

              {/* 隐藏的文件输入 */}
              <input
                ref={referenceInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.tif,image/*"
                onChange={handleReferenceUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    );

    const commonSettingsSection = (
      <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg mb-8">
        <CardHeader className="text-center pb-6">
          <CardTitle className="flex items-center justify-center text-2xl font-bold text-gray-900">
            <SettingsIcon className="w-6 h-6 mr-3 text-amber-600" />
            处理设置
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            调整参数以获得最佳处理效果
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeTab === "expansion" || activeTab === "one-click") && (
              <>
                <div className="space-y-3">
                  <Label htmlFor="xScale" className="text-sm font-semibold text-gray-700">X轴缩放倍数</Label>
                  <Input
                    id="xScale"
                    type="number"
                    defaultValue="2.0"
                    step="0.1"
                    min="1"
                    max="4"
                    className="text-center text-lg font-medium border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                  <p className="text-xs text-gray-500">建议范围：1.0 - 4.0</p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="yScale" className="text-sm font-semibold text-gray-700">Y轴缩放倍数</Label>
                  <Input
                    id="yScale"
                    type="number"
                    defaultValue="2.0"
                    step="0.1"
                    min="1"
                    max="4"
                    className="text-center text-lg font-medium border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                  <p className="text-xs text-gray-500">建议范围：1.0 - 4.0</p>
                </div>
              </>
            )}
            {(activeTab === "upscaling" || activeTab === "one-click") && (
              <div className="space-y-3">
                <Label htmlFor="upscaleFactor" className="text-sm font-semibold text-gray-700">高清化倍数</Label>
                <Input
                  id="upscaleFactor"
                  type="number"
                  defaultValue="2"
                  min="1"
                  max="4"
                  className="text-center text-lg font-medium border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                />
                <p className="text-xs text-gray-500">建议范围：1 - 4 倍</p>
              </div>
            )}
            {activeTab === "background" && (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customPrompt" className="text-sm font-semibold text-gray-700">
                    自定义提示词 (可选)
                  </Label>
                  <textarea
                    id="customPrompt"
                    rows={4}
                    placeholder="留空使用默认提示词，或输入自定义提示词来精确控制背景替换效果..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-blue-400 focus:ring-blue-400 text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500">
                    默认提示词会保持产品形状、材质、比例和摆放角度完全一致，仅替换背景
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <details className="cursor-pointer">
                    <summary className="text-sm font-medium text-gray-700 mb-2">
                      查看默认提示词模板
                    </summary>
                    <div className="text-xs text-gray-600 bg-white p-3 rounded border mt-2">
                      <p className="font-medium mb-2">默认提示词：</p>
                      <p className="whitespace-pre-line">
                        请将第二张图片中的所有产品替换为第一张图片的产品，要求：
                        <br />
                        1. 保持原图产品的形状、材质、特征比例、摆放角度及数量完全一致
                        <br />
                        2. 仅保留产品包装外壳，不得出现任何成品材质（如口红壳中不得显示口红）
                        <br />
                        3. 禁用背景虚化效果，确保画面清晰呈现所有产品
                        <br />
                        4. 产品的比例一定要保持，相对瘦长就瘦长，相对粗就相对粗
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-6">
        {commonUploadSection}
        {commonSettingsSection}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
            AI图像处理工作区
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            选择处理类型，上传图片，开始你的AI图像处理之旅
          </p>
        </div>

        {/* 功能选择标签 */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 rounded-2xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl'
                    : 'bg-white/70 backdrop-blur-sm text-gray-700 hover:bg-white/90 shadow-lg hover:shadow-xl'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                <div className="text-left">
                  <div className="font-semibold">{tab.title}</div>
                  <div className={`text-sm ${isActive ? 'text-amber-100' : 'text-gray-500'}`}>
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 主内容区域 */}
        <div className="max-w-6xl mx-auto">
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-2xl">
            <CardHeader className="text-center pb-6">
              <div className="flex items-center justify-center mb-6">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || Wand2, {
                  className: `w-10 h-10 mr-3 text-amber-600`
                })}
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    {tabs.find(t => t.id === activeTab)?.title}
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-1">
                    {tabs.find(t => t.id === activeTab)?.description}
                  </CardDescription>
                </div>
              </div>

              {/* 处理按钮移到顶部 */}
              <div className="mb-8">
                <Button
                  onClick={handleProcess}
                  disabled={isProcessing}
                  size="lg"
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3 text-lg font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      开始处理
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="mt-4 max-w-xs mx-auto">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                        style={{width: `${totalCount > 0 ? (processedCount / totalCount) * 100 : 0}%`}}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      已处理 {processedCount} / {totalCount} 张图片
                    </p>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {renderTabContent()}
            </CardContent>
          </Card>
        </div>

        {/* 处理结果区域 */}
        {processedResults.length > 0 && (
          <div className="max-w-6xl mx-auto mt-8">
            <Card className="bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
              <CardHeader className="text-center pb-6">
                <CardTitle className="flex items-center justify-center text-2xl font-bold text-gray-900">
                  <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                  处理结果
                </CardTitle>
                <CardDescription className="text-gray-600 mt-2">
                  查看已完成的图像处理结果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {processedResults.map((result, index) => (
                    <div key={result.id} className="relative group">
                      <div
                        className="aspect-square bg-white rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-400 transition-all shadow-sm border border-gray-200"
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
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg">
                        <div className="font-medium truncate">{result.originalName}</div>
                        <div className="text-gray-300">{result.processType}</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProcessedResults(prev => prev.filter(r => r.id !== result.id));
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setProcessedResults([])}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空所有结果
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 图片放大查看模态框 */}
        {showImageModal && selectedImageIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 左右导航按钮 */}
              {uploadedImages.length > 1 && (
                <>
                  <button
                    onClick={() => navigateImage('prev')}
                    disabled={selectedImageIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => navigateImage('next')}
                    disabled={selectedImageIndex === uploadedImages.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* 图片显示 */}
              <div className="relative max-w-full max-h-full">
                <img
                  src={uploadedImages[selectedImageIndex].preview}
                  alt={uploadedImages[selectedImageIndex].name}
                  className="max-w-full max-h-full object-contain"
                />

                {/* 图片信息 */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                  <p className="text-sm font-medium">{uploadedImages[selectedImageIndex].name}</p>
                  <p className="text-xs opacity-75">
                    {selectedImageIndex + 1} / {uploadedImages.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 处理结果放大查看模态框 */}
        {showResultModal && selectedResultIndex !== null && processedResults[selectedResultIndex] && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowResultModal(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 左右导航按钮 */}
              {processedResults.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedResultIndex(Math.max(0, selectedResultIndex - 1))}
                    disabled={selectedResultIndex === 0}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setSelectedResultIndex(Math.min(processedResults.length - 1, selectedResultIndex + 1))}
                    disabled={selectedResultIndex === processedResults.length - 1}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* 图片显示 */}
              <div className="relative max-w-full max-h-full">
                <img
                  src={processedResults[selectedResultIndex].processedImageUrl}
                  alt={`${processedResults[selectedResultIndex].originalName} - ${processedResults[selectedResultIndex].processType}`}
                  className="max-w-full max-h-full object-contain"
                />

                {/* 图片信息 */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                  <p className="text-sm font-medium">{processedResults[selectedResultIndex].originalName}</p>
                  <p className="text-xs opacity-75">{processedResults[selectedResultIndex].processType}</p>
                  <p className="text-xs opacity-75">{processedResults[selectedResultIndex].timestamp}</p>
                  <p className="text-xs opacity-75">
                    {selectedResultIndex + 1} / {processedResults.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}