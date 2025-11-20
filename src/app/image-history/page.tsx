'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import HistorySidebar from '@/components/history-sidebar';
import { useToast } from '@/components/ui/use-toast';

// 统一的图片类型定义
interface HistoryImage {
  id: string;
  filename: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  originalUrl?: string;
  createdAt: string;
  status: string;
  processType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

export default function ImageHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [images, setImages] = useState<HistoryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<HistoryImage | null>(null);

  // 重定向未登录用户
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 获取图片列表
  const fetchImages = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/images?limit=100');
      if (!response.ok) {
        throw new Error('获取图片列表失败');
      }
      const data = await response.json();
      if (data.success) {
        // 只显示已完成的图片
        const completedImages = data.images.filter((img: HistoryImage) => 
          img.status === 'COMPLETED' && (img.processedUrl || img.thumbnailUrl || img.originalUrl)
        );
        setImages(completedImages);
      } else {
        throw new Error(data.error || '获取图片列表失败');
      }
    } catch (err) {
      console.error('获取图片失败:', err);
      setError(err instanceof Error ? err.message : '获取图片失败');
    }
  }, [session]);

  // 下载图片
  const downloadImage = useCallback(async (image: HistoryImage) => {
    try {
      const imageUrl = image.processedUrl || image.originalUrl;
      if (!imageUrl) {
        toast({
          title: "下载失败",
          description: "图片链接无效",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('下载图片失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "下载成功",
        description: `已下载 ${image.filename}`,
      });
    } catch (err) {
      console.error('下载图片失败:', err);
      toast({
        title: "下载失败",
        description: err instanceof Error ? err.message : '下载图片失败',
        variant: "destructive",
      });
    }
  }, [toast]);

  // 删除图片
  const deleteImage = useCallback(async (imageId: string) => {
    try {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除图片失败');
      }

      const data = await response.json();
      if (data.success) {
        setImages(prev => prev.filter(img => img.id !== imageId));
        if (selectedImage?.id === imageId) {
          setSelectedImage(null);
        }
        toast({
          title: "删除成功",
          description: "图片已删除",
        });
      } else {
        throw new Error(data.error || '删除图片失败');
      }
    } catch (err) {
      console.error('删除图片失败:', err);
      toast({
        title: "删除失败",
        description: err instanceof Error ? err.message : '删除图片失败',
        variant: "destructive",
      });
    }
  }, [toast, selectedImage]);

  // 初始化数据
  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchImages();
    } finally {
      setLoading(false);
    }
  }, [fetchImages]);

  useEffect(() => {
    if (session) {
      initializeData();
    }
  }, [session, initializeData]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={initializeData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="h-[calc(100vh-64px)] p-4">
        <HistorySidebar
          images={images}
          selectedImage={selectedImage}
          onImageSelect={setSelectedImage}
          onImageDownload={downloadImage}
          onImageDelete={deleteImage}
          className="h-full"
        />
      </div>
    </div>
  );
}
