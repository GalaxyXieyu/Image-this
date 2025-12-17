 'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navigation/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  Search,
  ListTodo,
  Image as ImageIcon,
  Wand2,
  Expand,
  Zap,
  Trash2,
  X,
  MoreHorizontal,
  Eye,
  AlertCircle,
  Loader,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ImagePlus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

// 任务类型映射
const taskTypeMap = {
  'ONE_CLICK_WORKFLOW': '一键增强',
  'BACKGROUND_REMOVAL': '背景替换', 
  'IMAGE_EXPANSION': '图像扩展',
  'IMAGE_UPSCALING': '图像高清化',
  'GPT_GENERATION': '图像生成'
};

// 任务类型图标
const taskTypeIcons = {
  'ONE_CLICK_WORKFLOW': Wand2,
  'BACKGROUND_REMOVAL': ImageIcon,
  'IMAGE_EXPANSION': Expand,
  'IMAGE_UPSCALING': Zap,
  'GPT_GENERATION': ImageIcon
};

// 状态配置
const statusConfig = {
  'PENDING': {
    label: '等待处理',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    iconColor: 'text-yellow-600'
  },
  'PROCESSING': {
    label: '处理中',
    color: 'bg-blue-100 text-blue-600 border-blue-300',
    bgColor: 'bg-blue-50',
    icon: Loader,
    iconColor: 'text-blue-600'
  },
  'COMPLETED': {
    label: '已完成',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600'
  },
  'FAILED': {
    label: '失败',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600'
  },
  'CANCELLED': {
    label: '已取消',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: X,
    iconColor: 'text-gray-600'
  }
};

interface Task {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep: string;
  priority: number;
  totalSteps: number;
  completedSteps: number;
  inputData: string;
  outputData?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  processedImage?: {
    id: string;
    filename: string;
    originalUrl: string;
    processedUrl: string;
  };
}

interface ImagePreviewState {
  isOpen: boolean;
  imageUrl: string;
  title: string;
}

export default function TaskCenterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [queueStats, setQueueStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);
  const [imagePreview, setImagePreview] = useState<ImagePreviewState>({
    isOpen: false,
    imageUrl: '',
    title: ''
  });
  const [isRetrying, setIsRetrying] = useState(false);

  // 重定向未登录用户
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 获取任务列表（包含统计数据，一次请求器全部数据）
  const fetchTasks = useCallback(async (page = currentPage) => {
    if (!session) return;

    try {
      const offset = (page - 1) * pageSize;
      const response = await fetch(`/api/tasks?limit=${pageSize}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('获取任务列表失败');
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
        if (data.pagination) {
          setTotalPages(Math.ceil(data.pagination.total / pageSize));
        }
        // 从同一个 API 响应中获取统计数据，减少一次网络请求
        if (data.stats) {
          setQueueStats(data.stats);
        }
      } else {
        throw new Error(data.error || '获取任务列表失败');
      }
    } catch (err) {
      console.error('获取任务失败:', err);
      setError(err instanceof Error ? err.message : '获取任务失败');
    }
  }, [session, currentPage, pageSize]);

  // 初始化数据 - 现在只需要一次请求
  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchTasks();
    } finally {
      setLoading(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    if (session) {
      initializeData();
    }
  }, [session, initializeData]);

  // 轮询任务状态（仅在有进行中任务时）- 优化为 5 秒，减少数据库压力
  useEffect(() => {
    const hasActiveTasks = tasks.some(task => 
      task.status === 'PENDING' || task.status === 'PROCESSING'
    );

    if (hasActiveTasks && !pollingInterval) {
      const interval = setInterval(async () => {
        await fetchTasks();
      }, 5000); // 每5秒更新一次，减少数据库压力
      setPollingInterval(interval);
    } else if (!hasActiveTasks && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [tasks, pollingInterval, fetchTasks]);

  // 确保组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // 触发任务处理器
  const triggerWorker = async () => {
    try {
      const response = await fetch('/api/tasks/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch: true }),
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('触发任务处理器失败:', err);
    }
  };

  // 过滤任务
  const filteredTasks = tasks.filter(task => {
    const taskTypeName = taskTypeMap[task.type as keyof typeof taskTypeMap] || task.type;
    
    const matchesSearch = taskTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.currentStep.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || task.type === filterType;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 切换任务展开状态
  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // 选择任务
  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // 获取任务类型显示名称
  const getTaskTypeName = (type: string): string => {
    return taskTypeMap[type as keyof typeof taskTypeMap] || type;
  };

  // 格式化时间
  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  // 计算处理时长
  const getProcessingDuration = (task: Task): string => {
    if (!task.startedAt) return '-';
    
    const start = new Date(task.startedAt);
    const end = task.completedAt ? new Date(task.completedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}秒`;
    if (duration < 3600) return `${Math.floor(duration / 60)}分${duration % 60}秒`;
    return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分`;
  };

  // 删除任务
  const deleteTask = async (taskId: string) => {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        setSelectedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        toast({
          title: "删除成功",
          description: "任务已删除",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "删除失败", 
          description: errorData.error || "删除任务失败",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "删除失败",
        description: "删除任务时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 批量删除选中的任务
  const deleteSelectedTasks = async () => {
    if (selectedTasks.size === 0) {
      toast({
        title: "提示",
        description: "请先选择要删除的任务",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedTasks.size} 个任务吗？`)) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds: Array.from(selectedTasks)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => prev.filter(task => !selectedTasks.has(task.id)));
        setSelectedTasks(new Set());
        toast({
          title: "删除成功",
          description: `已删除 ${data.deletedCount} 个任务`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "删除失败",
          description: errorData.error || "批量删除任务失败",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "删除失败",
        description: "删除任务时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 重试单个任务
  const retryTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [taskId] })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "重新运行成功",
          description: data.message,
        });
        // 切换到第一页显示新创建的任务
        setCurrentPage(1);
        await fetchTasks(1);
      } else {
        const errorData = await response.json();
        toast({
          title: "重新运行失败",
          description: errorData.error || "重新运行任务失败",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "重试失败",
        description: "重试任务时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 批量重试选中的任务
  const retrySelectedTasks = async () => {
    const retryableSelectedTasks = Array.from(selectedTasks).filter(taskId => {
      const task = tasks.find(t => t.id === taskId);
      return task && (task.status === 'FAILED' || task.status === 'CANCELLED' || task.status === 'COMPLETED');
    });

    if (retryableSelectedTasks.length === 0) {
      toast({
        title: "提示",
        description: "选中的任务中没有可重新运行的任务",
        variant: "destructive",
      });
      return;
    }

    setIsRetrying(true);
    try {
      const response = await fetch('/api/tasks/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: retryableSelectedTasks })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "重新运行成功",
          description: data.message,
        });
        setSelectedTasks(new Set());
        // 切换到第一页显示新创建的任务
        setCurrentPage(1);
        await fetchTasks(1);
      } else {
        const errorData = await response.json();
        toast({
          title: "重新运行失败",
          description: errorData.error || "批量重新运行任务失败",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "重试失败",
        description: "批量重试任务时出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // 打开图片预览
  const openImagePreview = (imageUrl: string, title: string) => {
    setImagePreview({ isOpen: true, imageUrl, title });
  };

  // 关闭图片预览
  const closeImagePreview = () => {
    setImagePreview({ isOpen: false, imageUrl: '', title: '' });
  };

  // 解析任务输入数据获取原图 URL
  const getOriginalImageUrl = (task: Task): string | null => {
    // 1. 优先从 processedImage 获取原图 URL（API 已返回此字段）
    if (task.processedImage?.originalUrl) {
      return task.processedImage.originalUrl;
    }
    // 2. 回退到从 inputData 解析
    if (task.inputData) {
      try {
        const inputData = JSON.parse(task.inputData);
        return inputData.imageUrl || inputData.originalUrl || inputData.sourceUrl || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // 获取任务结果图 URL
  const getResultImageUrl = (task: Task): string | null => {
    // 1. 优先从关联的 processedImage 获取
    if (task.processedImage?.processedUrl) {
      return task.processedImage.processedUrl;
    }
    // 2. 从 outputData 中解析获取
    if (task.outputData) {
      try {
        const outputData = JSON.parse(task.outputData);
        // 尝试多种可能的字段名
        const url = outputData.processedImageUrl 
          || outputData.processedUrl 
          || outputData.imageUrl 
          || outputData.result?.processedUrl
          || outputData.result?.processedImageUrl
          || null;
        if (url) return url;
      } catch {
        // 解析失败，继续尝试其他方式
      }
    }
    return null;
  };

  // 检查选中任务中是否有可重新运行的（包括已完成的）
  const hasRetryableTasks = Array.from(selectedTasks).some(taskId => {
    const task = tasks.find(t => t.id === taskId);
    return task && (task.status === 'FAILED' || task.status === 'CANCELLED' || task.status === 'COMPLETED');
  });

  // 删除所有任务
  const deleteAllTasks = async () => {
    if (tasks.length === 0) {
      toast({
        title: "提示",
        description: "没有任务可以删除",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`确定要删除所有 ${tasks.length} 个任务吗？此操作不可撤销！`)) return;

    try {
      const response = await fetch('/api/tasks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deleteAll: true
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTasks([]);
        setSelectedTasks(new Set());
        toast({
          title: "删除成功",
          description: `已删除所有 ${data.deletedCount} 个任务`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "删除失败",
          description: errorData.error || "删除所有任务失败",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "删除失败",
        description: "删除任务时出现错误，请重试",
        variant: "destructive",
      });
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(task => task.id)));
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">任务中心</h1>
          <p className="text-sm text-gray-600 mt-1">管理和查看所有图像处理任务</p>
        </div>

        {/* 操作栏 */}
        <div className="bg-white rounded-lg border shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 搜索 */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索任务..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>

            {/* 筛选器 */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md h-9 bg-white hover:bg-gray-50 transition-colors"
            >
              <option value="all" className="text-gray-900">所有类型</option>
              <option value="ONE_CLICK_WORKFLOW" className="text-gray-900">一键增强</option>
              <option value="BACKGROUND_REMOVAL" className="text-gray-900">背景替换</option>
              <option value="IMAGE_EXPANSION" className="text-gray-900">图像扩展</option>
              <option value="IMAGE_UPSCALING" className="text-gray-900">图像高清化</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md h-9 bg-white hover:bg-gray-50 transition-colors"
            >
              <option value="all" className="text-gray-900">所有状态</option>
              <option value="PENDING" className="text-gray-900">等待中</option>
              <option value="PROCESSING" className="text-gray-900">处理中</option>
              <option value="COMPLETED" className="text-gray-900">已完成</option>
              <option value="FAILED" className="text-gray-900">失败</option>
            </select>

            <div className="flex-1"></div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                onClick={() => initializeData()}
                variant="outline"
                size="sm"
                className="h-9"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                刷新
              </Button>
              {selectedTasks.size > 0 && hasRetryableTasks && (
                <Button
                  onClick={retrySelectedTasks}
                  variant="outline"
                  size="sm"
                  className="h-9 text-orange-600 border-orange-300 hover:bg-orange-50"
                  disabled={isRetrying}
                >
                  {isRetrying ? (
                    <Loader className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                  )}
                  重跑 ({Array.from(selectedTasks).filter(id => {
                    const t = tasks.find(task => task.id === id);
                    return t && (t.status === 'FAILED' || t.status === 'CANCELLED' || t.status === 'COMPLETED');
                  }).length})
                </Button>
              )}
              {selectedTasks.size > 0 && (
                <Button
                  onClick={deleteSelectedTasks}
                  variant="destructive"
                  size="sm"
                  className="h-9"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  删除 ({selectedTasks.size})
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 任务列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">加载任务列表...</p>
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
              <p className="text-red-800 mb-4">{error}</p>
              <Button onClick={() => initializeData()} variant="outline">
                重试
              </Button>
            </CardContent>
          </Card>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
            <ListTodo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? '没有找到符合条件的任务' 
                : '开始您的第一次 AI 图像处理吧'
              }
            </p>
            <Button onClick={() => router.push('/workspace')} className="bg-orange-500 hover:bg-orange-600">
              前往工作台
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            {/* 表格容器 - 限制最大高度 */}
            <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
              {/* 表头 */}
              <div className="sticky top-0 bg-gray-50 border-b z-10">
                <div className="flex items-center px-4 py-3 text-xs font-medium text-gray-700">
                  <div className="w-10 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-orange-600 rounded border-gray-300"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-36">预览</div>
                    <div className="w-36">任务类型</div>
                    <div className="flex-1 min-w-0">当前步骤</div>
                    <div className="w-24">状态</div>
                    <div className="w-20 text-center">进度</div>
                    <div className="w-28">创建时间</div>
                    <div className="w-28 text-right">操作</div>
                  </div>
                </div>
              </div>

              {/* 任务列表 */}
              {filteredTasks.map((task) => {
                const TaskIcon = taskTypeIcons[task.type as keyof typeof taskTypeIcons] || ListTodo;
                const statusInfo = statusConfig[task.status as keyof typeof statusConfig];
                const isExpanded = expandedTasks.has(task.id);
                const originalImageUrl = getOriginalImageUrl(task);
                const resultImageUrl = getResultImageUrl(task);
                const canRetry = task.status === 'FAILED' || task.status === 'CANCELLED' || task.status === 'COMPLETED';

                return (
                  <div key={task.id}>
                    {/* 任务行 */}
                    <div className="flex items-center px-4 py-4 border-b hover:bg-gray-50 transition-colors">
                      <div className="w-10 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          className="w-4 h-4 text-orange-600 rounded border-gray-300"
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0 flex items-center gap-4">
                        {/* 预览图 */}
                        <div className="w-36 flex items-center gap-2">
                          {/* 原图缩略图 */}
                          {originalImageUrl ? (
                            <div
                              className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all flex-shrink-0 shadow-sm"
                              onClick={() => openImagePreview(originalImageUrl, '原图')}
                              title="点击查看原图"
                            >
                              <img
                                src={originalImageUrl}
                                alt="原图"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement?.classList.add('bg-gray-100', 'flex', 'items-center', 'justify-center');
                                  const placeholder = document.createElement('span');
                                  placeholder.className = 'text-gray-400 text-xs text-center px-1';
                                  placeholder.textContent = '加载失败';
                                  target.parentElement?.appendChild(placeholder);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                          {/* 结果图缩略图 */}
                          {task.status === 'COMPLETED' && resultImageUrl ? (
                            <div
                              className="w-16 h-16 rounded-lg border-2 border-green-400 overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-500 transition-all flex-shrink-0 shadow-sm"
                              onClick={() => openImagePreview(resultImageUrl, '结果图')}
                              title="点击查看结果图"
                            >
                              <img
                                src={resultImageUrl}
                                alt="结果"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement?.classList.add('bg-green-50', 'flex', 'items-center', 'justify-center');
                                  const placeholder = document.createElement('span');
                                  placeholder.className = 'text-green-500 text-xs text-center px-1';
                                  placeholder.textContent = '加载失败';
                                  target.parentElement?.appendChild(placeholder);
                                }}
                              />
                            </div>
                          ) : task.status === 'PROCESSING' ? (
                            <div className="w-16 h-16 rounded-lg border border-blue-300 bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
                            </div>
                          ) : task.status === 'FAILED' ? (
                            <div className="w-16 h-16 rounded-lg border border-red-300 bg-red-50 flex items-center justify-center flex-shrink-0" title={task.errorMessage}>
                              <XCircle className="w-6 h-6 text-red-500" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0">
                              <ImagePlus className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* 任务类型 */}
                        <div className="w-36 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <TaskIcon className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {getTaskTypeName(task.type)}
                          </span>
                        </div>

                        {/* 当前步骤 */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">
                            {task.currentStep}
                          </p>
                        </div>

                        {/* 状态 */}
                        <div className="w-24">
                          <Badge className={`${statusInfo?.color || 'bg-gray-100 text-gray-800'} text-xs`}>
                            {statusInfo?.label || task.status}
                          </Badge>
                        </div>

                        {/* 进度 */}
                        <div className="w-20 text-center">
                          {task.status === 'PROCESSING' ? (
                            <div className="flex items-center gap-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.max(task.progress, 5)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 w-8 text-right">
                                {Math.round(task.progress)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </div>

                        {/* 创建时间 */}
                        <div className="w-28">
                          <span className="text-xs text-gray-600">
                            {new Date(task.createdAt).toLocaleDateString('zh-CN', { 
                              month: '2-digit', 
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* 操作 */}
                        <div className="w-28 flex items-center justify-end gap-1">
                          {canRetry && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => retryTask(task.id)}
                              className="h-7 w-7 p-0 hover:bg-orange-50 text-orange-600"
                              title="重新运行任务"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpansion(task.id)}
                            className="h-7 w-7 p-0 hover:bg-gray-100"
                            title="查看详情"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="h-7 w-7 p-0 hover:bg-red-50 text-gray-600 hover:text-red-600"
                            title="删除任务"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 展开的详细信息 */}
                    {isExpanded && (
                      <div className="px-4 py-4 bg-gray-50 border-b">
                        <div className="grid grid-cols-3 gap-6 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 text-xs">时间信息</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>创建: {formatTime(task.createdAt)}</div>
                              {task.startedAt && <div>开始: {formatTime(task.startedAt)}</div>}
                              {task.completedAt && <div>完成: {formatTime(task.completedAt)}</div>}
                              <div>时长: {getProcessingDuration(task)}</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 text-xs">任务详情</h4>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>优先级: {task.priority}</div>
                              <div>步骤: {task.completedSteps}/{task.totalSteps}</div>
                              <div>进度: {Math.round(task.progress)}%</div>
                            </div>
                          </div>

                          {task.errorMessage && (
                            <div>
                              <h4 className="font-medium text-red-900 mb-2 text-xs">错误信息</h4>
                              <div className="text-xs text-red-600 bg-red-100 p-2 rounded">
                                {task.errorMessage}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-4 border-t bg-gray-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.max(1, currentPage - 1);
                    setCurrentPage(newPage);
                    fetchTasks(newPage);
                  }}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          fetchTasks(pageNum);
                        }}
                        className={`h-8 w-8 ${currentPage === pageNum ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = Math.min(totalPages, currentPage + 1);
                    setCurrentPage(newPage);
                    fetchTasks(newPage);
                  }}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 图片预览模态框 */}
      {imagePreview.isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImagePreview}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeImagePreview}
              className="absolute -top-10 right-0 w-8 h-8 bg-white bg-opacity-20 text-white rounded-full flex items-center justify-center hover:bg-opacity-40 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="p-3 border-b bg-gray-50">
                <span className="text-sm font-medium text-gray-700">{imagePreview.title}</span>
              </div>
              <div className="p-2 bg-gray-100">
                <img
                  src={imagePreview.imageUrl}
                  alt={imagePreview.title}
                  className="max-w-full max-h-[70vh] object-contain mx-auto rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}