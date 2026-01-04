import { useCallback, useRef, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

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

interface UseTaskPollingProps {
  isProcessing: boolean;
  activeTasks: Task[];
  setActiveTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  setIsProcessing: (processing: boolean) => void;
  onTaskComplete?: () => void;
  onTaskCompleteWithData?: (task: Task) => void;
  getProcessTypeName: (type: string) => string;
}

export function useTaskPolling({
  isProcessing,
  activeTasks,
  setActiveTasks,
  setIsProcessing,
  onTaskComplete,
  onTaskCompleteWithData,
  getProcessTypeName
}: UseTaskPollingProps) {
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTasksRef = useRef<Task[]>([]);
  const processedResultIdsRef = useRef<Set<string>>(new Set());

  // 使用 ref 保持回调的最新引用
  const onTaskCompleteWithDataRef = useRef(onTaskCompleteWithData);
  useEffect(() => {
    onTaskCompleteWithDataRef.current = onTaskCompleteWithData;
  }, [onTaskCompleteWithData]);

  useEffect(() => {
    activeTasksRef.current = activeTasks;
  }, [activeTasks]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollTaskStatus = useCallback(async () => {
    const tasksSnapshot = activeTasksRef.current;
    if (tasksSnapshot.length === 0) return;

    try {
      const taskIds = tasksSnapshot.map(task => task.id).join(',');
      const response = await fetch(`/api/tasks?ids=${taskIds}`, {
        signal: AbortSignal.timeout(5000) // 5秒超时
      });

      if (!response.ok) {
        console.warn('轮询任务状态失败:', response.status);
        return;
      }

      const data = await response.json();
      const updatedTasks: Task[] = data.tasks || [];
      const originalTaskMap = new Map(tasksSnapshot.map(task => [task.id, task]));

      // 检查完成的任务
      const completedTasks = updatedTasks.filter(task => task.status === 'COMPLETED');
      let hasNewCompletedTasks = false;

      for (const task of completedTasks) {
        console.log('[TaskPolling] Completed task:', {
          id: task.id,
          type: task.type,
          hasOutputData: !!task.outputData,
          alreadyProcessed: processedResultIdsRef.current.has(task.id),
        });

        if (!task.outputData || processedResultIdsRef.current.has(task.id)) {
          console.log('[TaskPolling] Skipping task:', task.id, 'reason:', !task.outputData ? 'no outputData' : 'already processed');
          continue;
        }

        try {
          const originalTask = originalTaskMap.get(task.id);
          processedResultIdsRef.current.add(task.id);
          hasNewCompletedTasks = true;

          // 调用带数据的回调（使用 ref 获取最新引用）
          console.log('[TaskPolling] Calling onTaskCompleteWithData callback, hasCallback:', !!onTaskCompleteWithDataRef.current);
          if (onTaskCompleteWithDataRef.current) {
            onTaskCompleteWithDataRef.current({
              ...task,
              originalImageId: originalTask?.originalImageId,
              originalName: originalTask?.originalName,
            });
          }

          toast({
            title: "任务完成",
            description: `${originalTask?.originalName || '图片'} ${getProcessTypeName(task.type)}处理完成`,
          });
        } catch (error) {
          console.error('解析任务输出数据失败:', error);
        }
      }

      if (hasNewCompletedTasks && onTaskComplete) {
        onTaskComplete();
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
  }, [stopPolling, toast, getProcessTypeName, onTaskComplete, setActiveTasks, setIsProcessing]);

  // 启动轮询
  useEffect(() => {
    if (isProcessing && activeTasks.length > 0 && !pollingIntervalRef.current) {
      pollTaskStatus();
      // 调整轮询间隔为 5 秒，减少服务器压力
      pollingIntervalRef.current = setInterval(pollTaskStatus, 5000);
    }

    if ((!isProcessing || activeTasks.length === 0) && pollingIntervalRef.current) {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isProcessing, activeTasks.length, pollTaskStatus, stopPolling]);

  return {
    stopPolling,
  };
}
