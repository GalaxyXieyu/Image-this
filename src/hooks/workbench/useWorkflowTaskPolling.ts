/**
 * Centralized Workflow Task Polling Hook
 *
 * Replaces page-local polling assumptions with a reusable hook/service
 * that supports batch groups and individual items.
 * Preserves current task list API until the new response contract is implemented.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { mapProviderErrorMessage } from '@/lib/provider-error-utils';
import type { WorkflowTaskSummary, WorkflowTaskStatus } from '@/types/workbench';

interface PollingTask {
  id: string;
  originalName?: string;
  workflowType: string;
}

interface UseWorkflowTaskPollingOptions {
  /** Initial task IDs to poll */
  taskIds?: string[];
  /** Polling interval in ms (default: 5000) */
  interval?: number;
  /** Auto-start polling when taskIds change */
  autoStart?: boolean;
  /** Called when any task completes */
  onTaskComplete?: (task: WorkflowTaskSummary) => void;
  /** Called when any task fails */
  onTaskFail?: (task: WorkflowTaskSummary) => void;
  /** Called when task status changes (any change) */
  onStatusChange?: (tasks: WorkflowTaskSummary[]) => void;
  /** Called when all tracked tasks reach a terminal state */
  onAllComplete?: () => void;
}

interface UseWorkflowTaskPollingReturn {
  /** Currently tracked tasks with latest status */
  tasks: WorkflowTaskSummary[];
  /** Whether polling is active */
  isPolling: boolean;
  /** Start polling for the given task IDs */
  startPolling: (ids: string[]) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Add tasks to the polling set */
  addTasks: (ids: string[]) => void;
  /** Remove tasks from the polling set */
  removeTasks: (ids: string[]) => void;
  /** Manually refresh task statuses once */
  refresh: () => Promise<void>;
  /** Latest error message if polling failed */
  error: string | null;
}

const TERMINAL_STATUSES: WorkflowTaskStatus[] = ['completed', 'failed', 'cancelled'];

export function useWorkflowTaskPolling(
  options: UseWorkflowTaskPollingOptions = {}
): UseWorkflowTaskPollingReturn {
  const {
    taskIds: initialTaskIds = [],
    interval = 5000,
    autoStart = true,
    onTaskComplete,
    onTaskFail,
    onStatusChange,
    onAllComplete,
  } = options;

  const { toast } = useToast();
  const [tasks, setTasks] = useState<WorkflowTaskSummary[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingIdsRef = useRef<Set<string>>(new Set(initialTaskIds));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTasksRef = useRef<Map<string, WorkflowTaskSummary>>(new Map());
  const processedResultIdsRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef({ onTaskComplete, onTaskFail, onStatusChange, onAllComplete });

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = { onTaskComplete, onTaskFail, onStatusChange, onAllComplete };
  }, [onTaskComplete, onTaskFail, onStatusChange, onAllComplete]);

  // Keep tasks ref up to date
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const getProcessTypeName = useCallback((type: string): string => {
    const map: Record<string, string> = {
      scene_generation: '场景图生成',
      background_replace: '背景替换',
      watermark: '水印处理',
      upscale: '高清化',
      outpaint: '扩图',
      one_click: '一键增强',
      video_generation: '视频生成',
    };
    return map[type] || type;
  }, []);

  const fetchTaskStatuses = useCallback(async (): Promise<WorkflowTaskSummary[]> => {
    const ids = Array.from(pollingIdsRef.current);
    if (ids.length === 0) return [];

    const response = await fetch(`/api/tasks/status?ids=${ids.join(',')}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as { success?: boolean; tasks?: WorkflowTaskSummary[] };
    return data.tasks ?? [];
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const updatedTasks = await fetchTaskStatuses();
      setError(null);

      const prevMap = previousTasksRef.current;
      const newMap = new Map<string, WorkflowTaskSummary>();
      const callbacks = callbacksRef.current;

      let hasNewCompleted = false;
      let hasNewFailed = false;
      let hasStatusChange = false;

      for (const task of updatedTasks) {
        newMap.set(task.id, task);
        const prev = prevMap.get(task.id);

        if (!prev || prev.status !== task.status) {
          hasStatusChange = true;

          // PENDING -> PROCESSING
          if (prev?.status === 'pending' && task.status === 'processing') {
            toast({
              title: '任务开始处理',
              description: `${task.originalName || '图片'} ${getProcessTypeName(task.workflowType)}开始处理`,
            });
          }

          // -> COMPLETED
          if (task.status === 'completed' && !processedResultIdsRef.current.has(task.id)) {
            processedResultIdsRef.current.add(task.id);
            hasNewCompleted = true;
            callbacks.onTaskComplete?.(task);
            toast({
              title: '任务完成',
              description: `${task.originalName || '图片'} ${getProcessTypeName(task.workflowType)}处理完成`,
            });
          }

          // -> FAILED
          if (task.status === 'failed') {
            hasNewFailed = true;
            callbacks.onTaskFail?.(task);
            const errorMessage = mapProviderErrorMessage(task.errorMessage || '未知错误');
            toast({
              title: '任务失败',
              description: `${task.originalName || '图片'} ${getProcessTypeName(task.workflowType)}处理失败: ${errorMessage}`,
              variant: 'destructive',
            });
          }
        }
      }

      previousTasksRef.current = newMap;
      setTasks(updatedTasks);

      if (hasStatusChange) {
        callbacks.onStatusChange?.(updatedTasks);
      }

      // Check if all tasks are in terminal state
      const activeCount = updatedTasks.filter(
        (t) => !TERMINAL_STATUSES.includes(t.status)
      ).length;
      if (activeCount === 0 && pollingIdsRef.current.size > 0) {
        callbacks.onAllComplete?.();
        stopPollingInternal();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '轮询失败';
      setError(message);
      console.warn('Workflow task polling error:', message);
    }
  }, [fetchTaskStatuses, getProcessTypeName, toast]);

  const stopPollingInternal = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(
    (ids: string[]) => {
      pollingIdsRef.current = new Set(ids);
      processedResultIdsRef.current.clear();
      previousTasksRef.current.clear();

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Immediate first poll
      pollOnce();
      intervalRef.current = setInterval(pollOnce, interval);
      setIsPolling(true);
    },
    [interval, pollOnce]
  );

  const stopPolling = useCallback(() => {
    stopPollingInternal();
  }, [stopPollingInternal]);

  const addTasks = useCallback(
    (ids: string[]) => {
      let changed = false;
      for (const id of ids) {
        if (!pollingIdsRef.current.has(id)) {
          pollingIdsRef.current.add(id);
          changed = true;
        }
      }
      if (changed && !isPolling && autoStart) {
        startPolling(Array.from(pollingIdsRef.current));
      }
    },
    [autoStart, isPolling, startPolling]
  );

  const removeTasks = useCallback((ids: string[]) => {
    for (const id of ids) {
      pollingIdsRef.current.delete(id);
      previousTasksRef.current.delete(id);
      processedResultIdsRef.current.delete(id);
    }
    if (pollingIdsRef.current.size === 0) {
      stopPollingInternal();
    }
  }, [stopPollingInternal]);

  const refresh = useCallback(async () => {
    await pollOnce();
  }, [pollOnce]);

  // Auto-start on mount if initialTaskIds provided
  useEffect(() => {
    if (autoStart && initialTaskIds.length > 0) {
      startPolling(initialTaskIds);
    }
    return () => {
      stopPollingInternal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tasks,
    isPolling,
    startPolling,
    stopPolling,
    addTasks,
    removeTasks,
    refresh,
    error,
  };
}
