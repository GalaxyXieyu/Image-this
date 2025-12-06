'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LazyImage } from '@/components/ui/lazy-image';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  Folder,
  FolderPlus,
  Image,
  Grid3X3,
  List,
  Search,
  Upload,
  Trash2,
  Download,
  Eye,
  MoreHorizontal,
  Check,
  X,
  Edit,
  Zap,
  Sparkles,
  Maximize2,
  RefreshCw,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Navbar from '@/components/navigation/Navbar';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    processedImages: number;
  };
}

interface ProcessedImage {
  id: string;
  filename: string;
  originalUrl: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  processType: string;
  status: string;
  fileSize?: number;
  width?: number;
  height?: number;
  createdAt: string;
  project?: {
    id: string;
    name: string;
  };
}



export default function GalleryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all'); // 新增：分类筛选
  const [projects, setProjects] = useState<Project[]>([]);
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const [contextMenuProject, setContextMenuProject] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showOriginalInModal, setShowOriginalInModal] = useState(false); // 模态框中是否显示原图
  
  // 分页状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20; // 每页20张图片
  
  // 请求去重
  const loadingRef = useRef(false);
  
  // 无限滚动
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: () => loadImages(false),
    threshold: 300, // 距离底部300px时开始加载
  });

  // 认证检查
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // 加载项目和图片
  useEffect(() => {
    if (session?.user && !loadingRef.current) {
      loadProjects();
      loadCategoryStats();
      loadImages(true); // 重置加载
    }
  }, [session]); // 只在 session 变化时加载
  
  // 分类或项目变化时重新加载
  useEffect(() => {
    if (session?.user && !loadingRef.current) {
      setPage(1);
      setImages([]);
      loadImages(true);
      loadCategoryStats();
    }
  }, [selectedCategory, selectedProject]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch {
      // console.error('Failed to load projects:', error);
    }
  };

  const loadImages = async (reset = false) => {
    // 防止重复请求
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      if (reset) {
        setIsLoading(true);
        setPage(1);
      } else {
        setIsLoadingMore(true);
      }
      
      const currentPage = reset ? 1 : page;
      
      // 根据分类筛选构建查询参数
      // 需要返回完整图片 URL 用于显示
      let url = `/api/images?status=COMPLETED&limit=${pageSize}&offset=${(currentPage - 1) * pageSize}&includeFullSize=true`;
      
      if (selectedCategory !== 'all') {
        url += `&type=${selectedCategory}`;
      }
      
      if (selectedProject) {
        url += `&projectId=${selectedProject}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const newImages = data.images || [];
        
        if (reset) {
          setImages(newImages);
        } else {
          // 使用 Map 去重，确保不会有重复的图片 ID
          setImages(prev => {
            const imageMap = new Map(prev.map(img => [img.id, img]));
            newImages.forEach((img: ProcessedImage) => {
              imageMap.set(img.id, img);
            });
            return Array.from(imageMap.values());
          });
        }
        
        // 判断是否还有更多数据
        setHasMore(newImages.length === pageSize);
        
        if (!reset) {
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  };

  // 加载分类统计数据
  const loadCategoryStats = async () => {
    try {
      const response = await fetch('/api/images?status=COMPLETED&limit=1000');
      if (response.ok) {
        const data = await response.json();
        const allImages = data.images || [];
        
        const stats: Record<string, number> = {
          all: allImages.length
        };
        
        allImages.forEach((img: ProcessedImage) => {
          stats[img.processType] = (stats[img.processType] || 0) + 1;
        });
        
        setCategoryStats(stats);
      }
    } catch (error) {
      console.error('Failed to load category stats:', error);
    }
  };



  const createProject = async () => {
    const name = prompt('请输入项目名称:');
    if (!name) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (response.ok) {
        loadProjects();
        toast({
          title: "创建成功",
          description: `文件夹 "${name}" 创建成功`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "创建失败",
          description: errorData.error || "创建文件夹失败",
          variant: "destructive",
        });
      }
    } catch {
      // console.error('Failed to create project:', error);
      toast({
        title: "创建失败",
        description: "创建文件夹时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  const renameProject = async (projectId: string, currentName: string) => {
    const newName = prompt('请输入新的文件夹名称:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        loadProjects();
        toast({
          title: "重命名成功",
          description: `文件夹已重命名为 "${newName}"`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "重命名失败",
          description: errorData.error || "重命名文件夹失败",
          variant: "destructive",
        });
      }
    } catch {
      // console.error('Failed to rename project:', error);
      toast({
        title: "重命名失败",
        description: "重命名文件夹时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string, projectName: string, imageCount: number) => {
    let confirmMessage = `确定要删除文件夹 "${projectName}" 吗？`;
    if (imageCount > 0) {
      confirmMessage += `\n\n该文件夹包含 ${imageCount} 张图片，删除后图片将移动到"所有图片"中。`;
    }

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(`/api/projects/${projectId}?force=true`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadProjects();
        loadImages(); // 重新加载图片以更新项目关联
        if (selectedProject === projectId) {
          setSelectedProject(null); // 如果删除的是当前选中的项目，切换到所有图片
        }
        toast({
          title: "删除成功",
          description: `文件夹 "${projectName}" 删除成功`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "删除失败",
          description: errorData.error || "删除文件夹失败",
          variant: "destructive",
        });
      }
    } catch {
      // console.error('Failed to delete project:', error);
      toast({
        title: "删除失败",
        description: "删除文件夹时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  const handleProjectContextMenu = (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuProject(projectId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenuProject(null);
    setContextMenuPosition(null);
  };

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    if (contextMenuProject) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenuProject]);

  // 批量操作函数
  const toggleImageSelection = (imageId: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(imageId)) {
      newSelected.delete(imageId);
    } else {
      newSelected.add(imageId);
    }
    setSelectedImages(newSelected);
  };

  const selectAllImages = () => {
    setSelectedImages(new Set(filteredImages.map(img => img.id)));
  };

  const clearSelection = () => {
    setSelectedImages(new Set());
    setIsSelectionMode(false);
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // console.error('Download failed:', error);
    }
  };

  const batchDownload = async () => {
    const selectedImagesList = images.filter(img => selectedImages.has(img.id));

    toast({
      title: "开始下载",
      description: `正在下载 ${selectedImagesList.length} 张图片...`,
    });

    try {
      for (const image of selectedImagesList) {
        const imageUrl = image.processedUrl || image.originalUrl;
        await downloadImage(imageUrl, image.filename);
        // 添加延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "下载完成",
        description: `成功下载 ${selectedImagesList.length} 张图片`,
      });
    } catch {
      toast({
        title: "下载失败",
        description: "部分图片下载失败，请重试",
        variant: "destructive",
      });
    }
  };

  const batchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedImages.size} 张图片吗？`)) {
      return;
    }

    try {
      toast({
        title: "正在删除",
        description: `正在删除 ${selectedImages.size} 张图片...`,
      });

      const deletePromises = Array.from(selectedImages).map(imageId =>
        fetch(`/api/images/${imageId}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      loadImages();
      clearSelection();

      toast({
        title: "删除成功",
        description: `成功删除 ${selectedImages.size} 张图片`,
      });
    } catch {
      // console.error('Batch delete failed:', error);
      toast({
        title: "删除失败",
        description: "删除图片时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  const moveToProject = async (projectId: string | null) => {
    const targetProject = projectId ? projects.find(p => p.id === projectId)?.name : '所有图片';

    try {
      toast({
        title: "正在移动",
        description: `正在将 ${selectedImages.size} 张图片移动到 ${targetProject}...`,
      });

      const movePromises = Array.from(selectedImages).map(imageId =>
        fetch(`/api/images/${imageId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        })
      );

      await Promise.all(movePromises);
      loadImages();
      clearSelection();

      toast({
        title: "移动成功",
        description: `成功将 ${selectedImages.size} 张图片移动到 ${targetProject}`,
      });
    } catch {
      // console.error('Move to project failed:', error);
      toast({
        title: "移动失败",
        description: "移动图片时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    // 如果拖拽的图片不在选中列表中，则只选中这一张
    let imagesToDrag: string[];
    if (selectedImages.has(imageId)) {
      imagesToDrag = Array.from(selectedImages);
    } else {
      imagesToDrag = [imageId];
      setSelectedImages(new Set([imageId]));
    }

    e.dataTransfer.setData('application/json', JSON.stringify(imagesToDrag));
    e.dataTransfer.effectAllowed = 'move';

    // 添加拖拽样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // 恢复样式
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, projectId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProject(projectId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只有当鼠标真正离开目标区域时才清除高亮
    if (e.currentTarget === e.target) {
      setDragOverProject(null);
    }
  };

  const handleDrop = (e: React.DragEvent, projectId: string | null) => {
    e.preventDefault();
    setDragOverProject(null);

    try {
      const draggedImageIds = JSON.parse(e.dataTransfer.getData('application/json'));
      if (draggedImageIds && draggedImageIds.length > 0) {
        setSelectedImages(new Set(draggedImageIds));
        moveToProject(projectId);
      }
    } catch {
      // console.error('Drop failed:', error);
    }
  };

  const filteredImages = images.filter(image => {
    const matchesSearch = image.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = selectedProject ? image.project?.id === selectedProject : true;
    // 只显示状态为 COMPLETED 的图片，排除 FAILED、PENDING、PROCESSING 状态
    const isSuccessful = image.status === 'COMPLETED';
    return matchesSearch && matchesProject && isSuccessful;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600';
      case 'PROCESSING': return 'text-blue-600';
      case 'FAILED': return 'text-red-600';
      case 'PENDING': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ONE_CLICK_WORKFLOW': return '一键增强';
      case 'BACKGROUND_REMOVAL': return '背景替换';
      case 'IMAGE_OUTPAINTING': return '智能扩图';
      case 'IMAGE_UPSCALING': return '高清化';
      case 'IMAGE_ENHANCEMENT': return '画质增强';
      case 'WATERMARK': return '叠加水印';
      case 'IMAGE_GENERATION': return '图片生成';
      default: return type;
    }
  };

  // 打开图片查看器
  const openImageViewer = (imageIndex: number) => {
    setSelectedImageIndex(imageIndex);
    setShowOriginalInModal(false); // 默认显示结果图
    setShowImageModal(true);
  };

  // 图片导航
  const navigateImage = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : filteredImages.length - 1));
    } else {
      setSelectedImageIndex((prev) => (prev < filteredImages.length - 1 ? prev + 1 : 0));
    }
  };

  if (status === 'loading' || isLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 图片管理工具栏 */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">图片管理</h1>
            <div className="text-sm text-gray-500">
              {filteredImages.length} 张图片
              {selectedImages.size > 0 && (
                <span className="ml-2 text-blue-600">
                  已选择 {selectedImages.size} 张
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedImages.size > 0 ? (
              // 批量操作模式
              <>
                <Button onClick={selectAllImages} variant="outline" size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  全选
                </Button>
                <Button onClick={batchDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  下载选中
                </Button>
                <Button onClick={batchDelete} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除选中
                </Button>
                <Button onClick={clearSelection} variant="outline" size="sm">
                  <X className="w-4 h-4 mr-2" />
                  取消选择
                </Button>
              </>
            ) : (
              // 正常模式
              <>
                <Button onClick={() => setIsSelectionMode(true)} variant="outline" size="sm">
                  <Check className="w-4 h-4 mr-2" />
                  选择
                </Button>
                <Button onClick={createProject} variant="outline" size="sm">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  新建文件夹
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  上传图片
                </Button>
              </>
            )}

            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索图片..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value || null)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">所有文件夹</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex">
        {/* 侧边栏 */}
        <div className="w-64 bg-white border-r h-screen overflow-y-auto">
          {/* 图片分类 */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">图片分类</h3>
            </div>
            <div className="space-y-1">
              {[
                { id: 'all', label: '全部图片', icon: Image },
                { id: 'ONE_CLICK_WORKFLOW', label: '一键增强', icon: Zap },
                { id: 'IMAGE_ENHANCEMENT', label: '画质增强', icon: Sparkles },
                { id: 'IMAGE_OUTPAINTING', label: '智能扩图', icon: Maximize2 },
                { id: 'IMAGE_UPSCALING', label: '图像高清化', icon: Sparkles },
                { id: 'BACKGROUND_REMOVAL', label: '背景替换', icon: RefreshCw },
                { id: 'WATERMARK', label: '叠加水印', icon: Wand2 },
                { id: 'IMAGE_GENERATION', label: '图片生成', icon: Wand2 },
              ].map(category => {
                const Icon = category.icon;
                const count = categoryStats[category.id] || 0;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors ${
                      selectedCategory === category.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span className="truncate">{category.label}</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-[24px] text-center">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 文件夹列表 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">文件夹</h3>
            </div>
            <div className="space-y-1">
              <div
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
              >
                <div
                  onClick={() => setSelectedProject(null)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
                    selectedProject === null ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  } ${dragOverProject === null ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''}`}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <Image className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="truncate">所有图片</span>
                  </div>
                  <div className="flex items-center ml-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-[24px] text-center">
                      {images.length}
                    </span>
                  </div>
                </div>
              </div>
              
              {projects.map(project => (
                <div
                  key={project.id}
                  className="relative group"
                  onDragOver={(e) => handleDragOver(e, project.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, project.id)}
                >
                  <div
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors cursor-pointer ${
                      selectedProject === project.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    } ${dragOverProject === project.id ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : ''}`}
                    onClick={() => setSelectedProject(project.id)}
                    onContextMenu={(e) => handleProjectContextMenu(e, project.id)}
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <Folder className="w-4 h-4 mr-3 flex-shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </div>
                    <div className="flex items-center ml-2 space-x-1">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full min-w-[24px] text-center">
                        {project._count.processedImages}
                      </span>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProjectContextMenu(e, project.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity cursor-pointer"
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* 主内容区 */}
        <div className="flex-1 p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredImages.map((image, index) => (
                <Card
                  key={image.id}
                  className={`hover:shadow-lg transition-all cursor-pointer group ${
                    selectedImages.has(image.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, image.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    if (isSelectionMode || selectedImages.size > 0) {
                      toggleImageSelection(image.id);
                    } else {
                      openImageViewer(index);
                    }
                  }}
                >
                  <CardContent className="p-2">
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 relative overflow-hidden">
                      <LazyImage
                        src={image.processedUrl || image.originalUrl || image.thumbnailUrl || ''}
                        thumbnailSrc={image.thumbnailUrl}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                        containerClassName="w-full h-full"
                        rootMargin="200px"
                      />
                      <div className="absolute top-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(image.status)} bg-white`}>
                          {image.status}
                        </span>
                      </div>
                      {(isSelectionMode || selectedImages.size > 0) && (
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 transition-all duration-200 ${
                          selectedImages.has(image.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {selectedImages.has(image.id) && <Check className="w-4 h-4" />}
                        </div>
                      )}
                      {!isSelectionMode && selectedImages.size === 0 && (
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="w-8 h-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadImage(image.processedUrl || image.originalUrl, image.filename);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium truncate">{image.filename}</p>
                      <p className="text-xs text-gray-500">{getTypeLabel(image.processType)}</p>
                      {image.project && (
                        <p className="text-xs text-blue-600">{image.project.name}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    {(isSelectionMode || selectedImages.size > 0) && (
                      <th className="text-left p-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedImages.size === filteredImages.length && filteredImages.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllImages();
                            } else {
                              clearSelection();
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="text-left p-4">名称</th>
                    <th className="text-left p-4">类型</th>
                    <th className="text-left p-4">状态</th>
                    <th className="text-left p-4">文件夹</th>
                    <th className="text-left p-4">大小</th>
                    <th className="text-left p-4">创建时间</th>
                    <th className="text-left p-4">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map(image => (
                    <tr
                      key={image.id}
                      className={`border-b hover:bg-gray-50 cursor-pointer ${
                        selectedImages.has(image.id) ? 'bg-blue-50' : ''
                      }`}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, image.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (isSelectionMode || selectedImages.size > 0) {
                          toggleImageSelection(image.id);
                        }
                      }}
                    >
                      {(isSelectionMode || selectedImages.size > 0) && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedImages.has(image.id)}
                            onChange={() => toggleImageSelection(image.id)}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                            <LazyImage
                              src={image.thumbnailUrl || image.processedUrl || image.originalUrl || ''}
                              alt={image.filename}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                              showLoadingAnimation={false}
                            />
                          </div>
                          <span className="font-medium">{image.filename}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {getTypeLabel(image.processType)}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(image.status)}`}>
                          {image.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {image.project?.name || '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {image.fileSize ? `${(image.fileSize / 1024 / 1024).toFixed(1)} MB` : '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // 预览功能
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadImage(image.processedUrl || image.originalUrl, image.filename);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 无限滚动加载触发器 */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-8 text-center">
              {isLoadingMore && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">加载更多...</span>
                </div>
              )}
            </div>
          )}

          {!hasMore && filteredImages.length > 0 && (
            <div className="text-center py-8 text-gray-500">
              已加载全部图片
            </div>
          )}

          {filteredImages.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无图片</h3>
              <p className="text-gray-600 mb-4">开始上传您的第一张图片吧</p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                上传图片
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 文件夹右键菜单 */}
      {contextMenuProject && contextMenuPosition && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const project = projects.find(p => p.id === contextMenuProject);
              if (project) {
                renameProject(contextMenuProject, project.name);
              }
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            重命名
          </button>
          <button
            onClick={() => {
              const project = projects.find(p => p.id === contextMenuProject);
              if (project) {
                deleteProject(contextMenuProject, project.name, project._count.processedImages);
              }
              closeContextMenu();
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除
          </button>
        </div>
      )}

      {/* 图片查看模态框 */}
      {showImageModal && filteredImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-6xl max-h-full w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            {filteredImages.length > 1 && (
              <>
                <button
                  onClick={() => {
                    navigateImage('prev');
                    setShowOriginalInModal(false);
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 z-10"
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    navigateImage('next');
                    setShowOriginalInModal(false);
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 z-10"
                >
                  →
                </button>
              </>
            )}

            {/* 原图/结果图切换按钮 */}
            {filteredImages[selectedImageIndex]?.originalUrl && filteredImages[selectedImageIndex]?.processedUrl && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex bg-black bg-opacity-60 rounded-lg overflow-hidden z-10">
                <button
                  onClick={() => setShowOriginalInModal(true)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    showOriginalInModal
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white hover:bg-opacity-20'
                  }`}
                >
                  原图
                </button>
                <button
                  onClick={() => setShowOriginalInModal(false)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    !showOriginalInModal
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white hover:bg-opacity-20'
                  }`}
                >
                  结果图
                </button>
              </div>
            )}
            
            <img
              src={
                showOriginalInModal
                  ? filteredImages[selectedImageIndex]?.originalUrl
                  : (filteredImages[selectedImageIndex]?.processedUrl || filteredImages[selectedImageIndex]?.originalUrl)
              }
              alt={filteredImages[selectedImageIndex]?.filename}
              className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto"
            />
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg">
              <p className="text-center font-medium">
                {filteredImages[selectedImageIndex]?.filename}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="opacity-75">
                  {getTypeLabel(filteredImages[selectedImageIndex]?.processType)}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  showOriginalInModal ? 'bg-gray-600' : 'bg-green-600'
                }`}>
                  {showOriginalInModal ? '原图' : '结果图'}
                </span>
              </div>
              {filteredImages.length > 1 && (
                <p className="text-center text-sm opacity-75">
                  {selectedImageIndex + 1} / {filteredImages.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}