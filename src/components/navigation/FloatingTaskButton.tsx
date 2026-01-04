'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, Loader, CheckCircle, XCircle, Wand2, Image as ImageIcon, Expand, Zap, ImagePlus, Video } from 'lucide-react';

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
  status: string;
  progress: number;
  currentStep: string;
  inputData: string;
  outputData?: string;
  createdAt: string;
  processedImage?: {
    processedUrl: string;
  };
}

// 任务类型映射
const taskTypeMap: Record<string, string> = {
  'ONE_CLICK_WORKFLOW': '一键增强',
  'BACKGROUND_REMOVAL': '背景替换',
  'IMAGE_EXPANSION': '图像扩展',
  'IMAGE_UPSCALING': '图像高清化',
  'GPT_GENERATION': '图像生成',
  'VIDEO_GENERATION': '视频生成'
};

// 任务类型图标
const taskTypeIcons: Record<string, React.ElementType> = {
  'ONE_CLICK_WORKFLOW': Wand2,
  'BACKGROUND_REMOVAL': ImageIcon,
  'IMAGE_EXPANSION': Expand,
  'IMAGE_UPSCALING': Zap,
  'GPT_GENERATION': ImageIcon,
  'VIDEO_GENERATION': Video
};

export default function FloatingTaskButton() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取统计
        const statsRes = await fetch('/api/tasks/worker', {
          signal: AbortSignal.timeout(3000)
        });
        if (statsRes.ok) {
          const data = await statsRes.json();
          if (data.success && data.status) {
            setStats(data.status);
          }
        }
        
        // 获取最近任务列表
        const tasksRes = await fetch('/api/tasks?limit=5&offset=0', {
          signal: AbortSignal.timeout(3000)
        });
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          if (data.success && data.tasks) {
            setTasks(data.tasks);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('获取任务数据失败:', err);
        }
      }
    };

    // 初次加载时获取一次
    fetchData();

    // 只在打开弹窗时才轮询
    if (isOpen) {
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const hasActiveTasks = stats.pending > 0 || stats.processing > 0;

  // 获取原图URL
  const getOriginalImageUrl = (task: Task): string | null => {
    try {
      const inputData = JSON.parse(task.inputData);
      return inputData.imageUrl || null;
    } catch {
      return null;
    }
  };

  // 获取结果图URL
  const getResultImageUrl = (task: Task): string | null => {
    if (task.processedImage?.processedUrl) {
      return task.processedImage.processedUrl;
    }
    if (task.outputData) {
      try {
        const outputData = JSON.parse(task.outputData);
        return outputData.processedImageUrl || outputData.processedUrl || outputData.imageUrl || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // 获取视频URL
  const getVideoUrl = (task: Task): string | null => {
    if (task.type !== 'VIDEO_GENERATION') return null;
    if (task.outputData) {
      try {
        const outputData = JSON.parse(task.outputData);
        return outputData.videoUrl || null;
      } catch {
        return null;
      }
    }
    return null;
  };

  // 只在登录状态下显示
  if (!session) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            className="h-14 w-14 rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white relative"
            size="icon"
          >
            <ListTodo className="w-6 h-6" />
            {hasActiveTasks && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-6 w-6 bg-red-500 items-center justify-center text-xs text-white font-bold">
                  {stats.pending + stats.processing}
                </span>
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end" side="top">
          <div className="space-y-3">
            {/* 统计摘要 */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">任务队列</h3>
              <div className="flex items-center gap-2 text-xs">
                {stats.processing > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                    {stats.processing} 处理中
                  </Badge>
                )}
                {stats.pending > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    <Clock className="w-3 h-3 mr-1" />
                    {stats.pending} 等待
                  </Badge>
                )}
              </div>
            </div>
            
            {/* 任务列表 */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <ListTodo className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">暂无任务</p>
                </div>
              ) : (
                tasks.map((task) => {
                  const TaskIcon = taskTypeIcons[task.type] || ListTodo;
                  const originalUrl = getOriginalImageUrl(task);
                  const resultUrl = getResultImageUrl(task);
                  const videoUrl = getVideoUrl(task);
                  const isVideoTask = task.type === 'VIDEO_GENERATION';
                  const displayUrl = isVideoTask ? (videoUrl || originalUrl) : (resultUrl || originalUrl);

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    >
                      {/* 缩略图 */}
                      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border">
                        {isVideoTask && videoUrl ? (
                          <video src={videoUrl} className="w-full h-full object-cover" muted />
                        ) : displayUrl ? (
                          <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImagePlus className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                        {/* 状态指示器 */}
                        {task.status === 'PROCESSING' && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                        {task.status === 'COMPLETED' && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-tl-md flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {task.status === 'FAILED' && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 rounded-tl-md flex items-center justify-center">
                            <XCircle className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {task.status === 'PENDING' && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-tl-md flex items-center justify-center">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      
                      {/* 任务信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TaskIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {taskTypeMap[task.type] || task.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {task.status === 'PROCESSING' ? task.currentStep : 
                           task.status === 'COMPLETED' ? '已完成' :
                           task.status === 'FAILED' ? '处理失败' :
                           task.status === 'PENDING' ? '等待处理' : task.currentStep}
                        </p>
                        {task.status === 'PROCESSING' && task.progress > 0 && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <div className="flex-1 bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(task.progress, 5)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 w-7 text-right">{Math.round(task.progress)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 底部操作 */}
            <div className="pt-2 border-t flex gap-2">
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600" 
                size="sm"
                onClick={() => {
                  window.location.href = '/history';
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
