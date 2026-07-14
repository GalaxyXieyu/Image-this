'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, Loader, CheckCircle, XCircle, Wand2, Image as ImageIcon, Expand, Zap, ImagePlus, Video, Trash2 } from 'lucide-react';
import { BrandEmptyState } from '@/components/brands/SpriteImage';
import { getWorkflowTypeLabel, normalizeTaskStatus } from '@/lib/workbench/task-compat';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface Task {
  id: string;
  type: string;
  workflowType?: string;
  status: string;
  progress: number;
  currentStep: string;
  createdAt: string;
  originalImageUrl?: string | null;
  resultImageUrl?: string | null;
  videoUrl?: string | null;
}

interface TaskSummaryResponse {
  success: boolean;
  status?: QueueStats;
  summary?: QueueStats;
}

function taskThumbnailUrl(src?: string | null, width = 96): string | null | undefined {
  if (!src) return src;
  if (src.startsWith('/api/files/') || src.startsWith('/uploads/')) {
    return `${src}${src.includes('?') ? '&' : '?'}w=${width}`;
  }
  return src;
}

// 任务类型映射
const taskTypeMap: Record<string, string> = {
  ONE_CLICK_WORKFLOW: '一键处理',
  BACKGROUND_REMOVAL: '背景替换',
  IMAGE_EXPANSION: '智能扩图',
  IMAGE_UPSCALING: '高清放大',
  GPT_GENERATION: '图像生成',
  VIDEO_GENERATION: '视频生成',
  SCENE_GENERATION: '场景图生成',
};

function getTaskDisplayName(task: Task): string {
  return task.workflowType ? getWorkflowTypeLabel(task.workflowType) : taskTypeMap[task.type] || getWorkflowTypeLabel(task.type);
}

function isTaskStatus(task: Task, status: string): boolean {
  return normalizeTaskStatus(task.status) === normalizeTaskStatus(status);
}

// 任务类型图标
const taskTypeIcons: Record<string, React.ElementType> = {
  SCENE_GENERATION: Wand2,
  ONE_CLICK_WORKFLOW: Wand2,
  BACKGROUND_REMOVAL: ImageIcon,
  IMAGE_EXPANSION: Expand,
  IMAGE_UPSCALING: Zap,
  GPT_GENERATION: ImageIcon,
  VIDEO_GENERATION: Video,
};

export default function FloatingTaskButton() {
  const { data: session, status: sessionStatus } = useSession();
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const updateDesktop = () => setIsDesktop(mediaQuery.matches);
    updateDesktop();
    mediaQuery.addEventListener('change', updateDesktop);
    return () => mediaQuery.removeEventListener('change', updateDesktop);
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/summary', {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const data = await response.json() as TaskSummaryResponse;
      const nextStats = data.status ?? data.summary;
      if (data.success && nextStats) setStats(nextStats);
    } catch {
      // 全局任务入口是增强项，失败时不打断当前页面。
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/recent', {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return;
      const data = await response.json() as { success: boolean; tasks?: Task[] };
      if (data.success && data.tasks) setTasks(data.tasks);
    } catch {
      // 弹窗仍可展示上一次成功加载的任务。
    }
  }, []);

  const fetchOpenData = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchRecent()]);
  }, [fetchRecent, fetchSummary]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isDesktop) return;
    void fetchSummary();
  }, [fetchSummary, isDesktop, sessionStatus]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !isDesktop || !isOpen) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchOpenData();
      }
    };
    refreshWhenVisible();
    const interval = window.setInterval(refreshWhenVisible, 10000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchOpenData, isDesktop, isOpen, sessionStatus]);

  const handleDeleteTask = async (task: Task) => {
    const isPending = isTaskStatus(task, 'pending');
    if (!confirm(isPending ? '删除这个排队中的任务？' : '取消并删除这个进行中的任务？')) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || '删除任务失败');
      }
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setStats((prev) => ({
        ...prev,
        pending: isPending ? Math.max(0, prev.pending - 1) : prev.pending,
        processing: isPending ? prev.processing : Math.max(0, prev.processing - 1),
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除任务失败');
    }
  };

  const hasActiveTasks = stats.pending > 0 || stats.processing > 0;

  // 移动端不挂载任务数据请求，避免隐藏组件与当前页面争抢资源。
  if (!session || !isDesktop) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-30 hidden md:block">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary-hover text-white relative"
            size="icon"
          >
            <ListTodo className="w-6 h-6" />
            {hasActiveTasks && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-caption text-white font-bold">
                  {stats.pending + stats.processing}
                </span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] max-w-[384px]" align="end" side="top">
          <div className="space-y-3">
            {/* 统计摘要 */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">任务队列</h3>
              <div className="flex items-center gap-2 text-caption">
                {stats.processing > 0 && (
                  <Badge className="border-[#BFDBFE] bg-[#DBEAFE] text-primary">
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                    {stats.processing} 处理中
                  </Badge>
                )}
                {stats.pending > 0 && (
                  <Badge className="bg-amber-50 text-amber-600 border-amber-200">
                    <Clock className="w-3 h-3 mr-1" />
                    {stats.pending} 等待
                  </Badge>
                )}
              </div>
            </div>
            
            {/* 任务列表 */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tasks.length === 0 ? (
                <BrandEmptyState
                  pose="sleep"
                  title="暂无任务"
                  description="新建任务后，最近进度会显示在这里。"
                  className="border-0 bg-transparent py-6"
                />
              ) : (
                tasks.map((task) => {
                  const TaskIcon = taskTypeIcons[task.type] || ListTodo;
                  const displayName = getTaskDisplayName(task);
                  const originalUrl = task.originalImageUrl || null;
                  const resultUrl = task.resultImageUrl || null;
                  const videoUrl = task.videoUrl || null;
                  const isVideoTask = task.workflowType === 'video_generation' || task.type === 'VIDEO_GENERATION';
                  const displayUrl = isVideoTask ? (videoUrl || originalUrl) : (resultUrl || originalUrl);
                  const thumbnailUrl = taskThumbnailUrl(displayUrl);

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    >
                      {/* 缩略图 */}
                      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border">
                        {isVideoTask && videoUrl ? (
                          <video src={videoUrl} className="w-full h-full object-cover" muted preload="none" />
                        ) : thumbnailUrl ? (
                          // 图片已通过 /api/files?w=96 输出小尺寸 WebP。
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImagePlus className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        {/* 状态指示器 */}
                        {isTaskStatus(task, 'processing') && (
                          <div className="absolute inset-0 bg-primary/15 flex items-center justify-center">
                            <Loader className="w-4 h-4 text-primary animate-spin" />
                          </div>
                        )}
                        {isTaskStatus(task, 'completed') && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-tl-md flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {isTaskStatus(task, 'failed') && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 rounded-tl-md flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {isTaskStatus(task, 'pending') && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-tl-md flex items-center justify-center">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* 任务信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TaskIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-data font-medium text-gray-900 truncate">
                            {displayName}
                          </span>
                        </div>
                        <p className="text-caption text-gray-500 truncate mt-0.5">
                          {isTaskStatus(task, 'processing') ? task.currentStep : 
                           isTaskStatus(task, 'completed') ? '已完成' :
                           isTaskStatus(task, 'failed') ? '处理失败' :
                           isTaskStatus(task, 'pending') ? '等待处理' : task.currentStep}
                        </p>
                        {isTaskStatus(task, 'processing') && task.progress > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-primary h-1 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(task.progress, 5)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 w-7 text-right">{Math.round(task.progress)}%</span>
                          </div>
                        )}
                      </div>

                      {/* 排队/进行中任务：删除以中断 */}
                      {(isTaskStatus(task, 'pending') || isTaskStatus(task, 'processing')) && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteTask(task)}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title={isTaskStatus(task, 'pending') ? '删除排队任务' : '取消并删除任务'}
                          aria-label={isTaskStatus(task, 'pending') ? '删除排队任务' : '取消并删除任务'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部操作 */}
            <div className="pt-2 border-t flex gap-2">
              <Button 
                variant="brand"
                className="flex-1"
                size="sm"
                onClick={() => {
                  window.location.href = '/tasks';
                  setIsOpen(false);
                }}
              >
                查看全部任务
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
