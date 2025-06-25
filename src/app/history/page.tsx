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
  Loader
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
    processedUrl: string;
  };
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

  // 重定向未登录用户
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // 获取任务列表
  const fetchTasks = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/tasks?limit=50');
      if (!response.ok) {
        throw new Error('获取任务列表失败');
      }
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      } else {
        throw new Error(data.error || '获取任务列表失败');
      }
    } catch (err) {
      console.error('获取任务失败:', err);
      setError(err instanceof Error ? err.message : '获取任务失败');
    }
  }, [session]);

  // 获取队列统计
  const fetchQueueStats = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/worker');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.status) {
          setQueueStats(data.status);
        }
      }
    } catch (err) {
      console.error('获取队列统计失败:', err);
    }
  }, []);

  // 初始化数据
  const initializeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchTasks(), fetchQueueStats()]);
    } finally {
      setLoading(false);
    }
  }, [fetchTasks, fetchQueueStats]);

  useEffect(() => {
    if (session) {
      initializeData();
    }
  }, [session, initializeData]);

  // 轮询任务状态（仅在有进行中任务时）
  useEffect(() => {
    const hasActiveTasks = tasks.some(task => 
      task.status === 'PENDING' || task.status === 'PROCESSING'
    );

    if (hasActiveTasks && !pollingInterval) {
      const interval = setInterval(async () => {
        await fetchTasks();
        await fetchQueueStats();
      }, 3000); // 每3秒更新一次
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
  }, [tasks, pollingInterval, fetchTasks, fetchQueueStats]);

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
        await fetchQueueStats();
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            任务中心
          </h1>
          <p className="text-gray-600">
            查看您的所有图像处理任务状态和历史记录
          </p>
        </div>

        {/* 简化的统计信息 */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <span>等待: <strong>{queueStats.pending}</strong></span>
              <span>处理中: <strong>{queueStats.processing}</strong></span>
              <span>已完成: <strong>{queueStats.completed}</strong></span>
              <span>失败: <strong>{queueStats.failed}</strong></span>
            </div>
            <span>总计: <strong>{queueStats.total}</strong></span>
          </div>
        </div>

        {/* 操作栏 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                {/* 搜索 */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索任务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* 筛选器 */}
                <div className="flex gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">所有类型</option>
                    <option value="ONE_CLICK_WORKFLOW">一键增强</option>
                    <option value="BACKGROUND_REMOVAL">背景替换</option>
                    <option value="IMAGE_EXPANSION">图像扩展</option>
                    <option value="IMAGE_UPSCALING">图像高清化</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">所有状态</option>
                    <option value="PENDING">等待中</option>
                    <option value="PROCESSING">处理中</option>
                    <option value="COMPLETED">已完成</option>
                    <option value="FAILED">失败</option>
                  </select>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  onClick={triggerWorker}
                  disabled={queueStats.pending === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  处理队列
                </Button>
                <Button
                  onClick={() => initializeData()}
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
                {selectedTasks.size > 0 && (
                  <Button
                    onClick={deleteSelectedTasks}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除选中 ({selectedTasks.size})
                  </Button>
                )}
                {tasks.length > 0 && (
                  <Button
                    onClick={deleteAllTasks}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    清空所有
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
          <Card>
            <CardContent className="p-12 text-center">
              <ListTodo className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无任务</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                  ? '没有找到符合条件的任务' 
                  : '开始您的第一次 AI 图像处理吧'
                }
              </p>
              <Button onClick={() => router.push('/workspace')} className="bg-blue-600 hover:bg-blue-700">
                前往工作台
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* 批量操作控制栏 */}
            {filteredTasks.length > 0 && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">
                        {selectedTasks.size === 0 
                          ? '全选' 
                          : selectedTasks.size === filteredTasks.length 
                            ? '取消全选' 
                            : `已选择 ${selectedTasks.size} 个任务`
                        }
                      </span>
                    </div>
                    {selectedTasks.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          共选择了 {selectedTasks.size} 个任务
                        </span>
                        <Button
                          onClick={deleteSelectedTasks}
                          variant="destructive"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除选中
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {filteredTasks.map((task) => {
              const TaskIcon = taskTypeIcons[task.type as keyof typeof taskTypeIcons] || ListTodo;
              const statusInfo = statusConfig[task.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo?.icon || Clock;
              const isExpanded = expandedTasks.has(task.id);

              return (
                <Card key={task.id} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedTasks.has(task.id)}
                          onChange={() => handleSelectTask(task.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <TaskIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getTaskTypeName(task.type)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              任务 ID: {task.id.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {/* 进度条 */}
                        {task.status === 'PROCESSING' && (
                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>{Math.round(task.progress)}%</span>
                              <span>{task.completedSteps}/{task.totalSteps}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(task.progress, 5)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* 状态标签 */}
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${statusInfo?.iconColor || 'text-gray-600'}`} />
                          <Badge className={statusInfo?.color || 'bg-gray-100 text-gray-800'}>
                            {statusInfo?.label || task.status}
                          </Badge>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTask(task.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTaskExpansion(task.id)}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 当前状态 */}
                    <div className="mt-4">
                      <p className="text-sm text-gray-700">{task.currentStep}</p>
                    </div>

                    {/* 展开的详细信息 */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">时间信息</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>创建时间: {formatTime(task.createdAt)}</div>
                              {task.startedAt && (
                                <div>开始时间: {formatTime(task.startedAt)}</div>
                              )}
                              {task.completedAt && (
                                <div>完成时间: {formatTime(task.completedAt)}</div>
                              )}
                              <div>处理时长: {getProcessingDuration(task)}</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">任务详情</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>优先级: {task.priority}</div>
                              <div>总步骤: {task.totalSteps}</div>
                              <div>已完成: {task.completedSteps}</div>
                              <div>进度: {Math.round(task.progress)}%</div>
                            </div>
                          </div>

                          {task.errorMessage && (
                            <div>
                              <h4 className="font-medium text-red-900 mb-2">错误信息</h4>
                              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                                {task.errorMessage}
                              </div>
                            </div>
                          )}

                          {task.processedImage && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">处理结果</h4>
                              <div className="flex items-center space-x-3">
                                <img
                                  src={task.processedImage.processedUrl}
                                  alt="处理结果"
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="text-sm text-gray-600">
                                  <div>{task.processedImage.filename}</div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    查看
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}