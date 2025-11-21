import { useCallback, useEffect, useRef } from 'react';
import { Task, ProcessedResult, UploadedImage } from './useWorkspaceState';

export function useTaskPolling(
  activeTasks: Task[],
  setActiveTasks: (tasks: Task[]) => void,
  processedResults: ProcessedResult[],
  setProcessedResults: (results: ProcessedResult[]) => void,
  uploadedImages: UploadedImage[],
  referenceImage: UploadedImage | null,
  onSuccess: (message: string) => void,
  onError: (message: string) => void
) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTasksRef = useRef<Task[]>([]);
  const processedResultsRef = useRef<ProcessedResult[]>([]);
  const uploadedImagesRef = useRef<UploadedImage[]>([]);
  const referenceImageRef = useRef<UploadedImage | null>(null);

  // 同步 refs
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

  const pollTaskStatus = useCallback(async () => {
    const tasksSnapshot = activeTasksRef.current;
    if (tasksSnapshot.length === 0) return;

    try {
      const taskIds = tasksSnapshot.map(t => t.id);
      const response = await fetch('/api/tasks/batch-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      });

      if (!response.ok) return;

      const updatedTasks: Task[] = await response.json();
      const newActiveTasks: Task[] = [];
      const completedTasks: Task[] = [];

      updatedTasks.forEach(task => {
        if (task.status === 'completed' || task.status === 'failed') {
          completedTasks.push(task);
        } else {
          newActiveTasks.push(task);
        }
      });

      if (completedTasks.length > 0) {
        const newResults: ProcessedResult[] = [];
        
        completedTasks.forEach(task => {
          if (task.status === 'completed' && task.outputData) {
            const originalImage = uploadedImagesRef.current.find(
              img => img.id === task.originalImageId
            );
            
            newResults.push({
              id: `result-${task.id}`,
              originalImageId: task.originalImageId || '',
              originalName: originalImage?.name || task.originalName || '未知',
              processedImageUrl: task.outputData,
              processType: task.type,
              timestamp: new Date().toISOString(),
            });
            
            onSuccess(`任务 "${task.originalName || '未知'}" 处理完成`);
          } else if (task.status === 'failed') {
            onError(`任务 "${task.originalName || '未知'}" 处理失败: ${task.errorMessage || '未知错误'}`);
          }
        });

        if (newResults.length > 0) {
          setProcessedResults([...processedResultsRef.current, ...newResults]);
        }
      }

      setActiveTasks(newActiveTasks);

      if (newActiveTasks.length === 0) {
        stopPolling();
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  }, [stopPolling, setActiveTasks, setProcessedResults, onSuccess, onError]);

  useEffect(() => {
    if (activeTasks.length > 0 && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeTasks.length, pollTaskStatus]);

  return {
    stopPolling,
    pollTaskStatus,
  };
}
