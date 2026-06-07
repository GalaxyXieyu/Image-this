"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Dispatch } from "react";
import { apiGet } from "./api-client";
import { normalizeTaskStatus } from "@/lib/workbench/task-compat";
import type { WorkflowTaskStatus } from "@/types/workbench";

export type PollingTaskStatus = WorkflowTaskStatus | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface PollingTask {
  id: string;
  type: string;
  workflowType?: string;
  status: PollingTaskStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  usedModel?: string | null;
}

interface TasksStatusResponse {
  success: boolean;
  tasks: PollingTask[];
}

const ACTIVE_POLLING_STATUSES: WorkflowTaskStatus[] = ["pending", "processing"];

export interface UseTaskPollingResult {
  /** Whether the polling interval is currently active */
  isPolling: boolean;
  /** Number of tasks currently being polled */
  pollingCount: number;
}

type TaskPollingUpdater = Dispatch<PollingTask[]>;

/**
 * Poll `/api/tasks/status` every 3 seconds for running/pending tasks.
 * Updates tasks in-place via the provided `updateTasks` callback.
 * Stops polling when all watched tasks reach a terminal state.
 */
export function useTaskPolling(
  taskIds: string[],
  updateTasks: TaskPollingUpdater
): UseTaskPollingResult {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    if (taskIds.length === 0) return;

    try {
      const idsParam = taskIds.join(",");
      const data = await apiGet<TasksStatusResponse>(
        `/api/tasks/status?ids=${encodeURIComponent(idsParam)}`
      );

      if (data.success && data.tasks) {
        updateTasks(data.tasks);

        const stillActive = data.tasks.some((t) => ACTIVE_POLLING_STATUSES.includes(normalizeTaskStatus(t.status)));
        if (!stillActive) {
          // All tasks reached terminal state — stop polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPolling(false);
        }
      }
    } catch {
      // Silently ignore polling errors; next interval will retry
    }
  }, [taskIds, updateTasks]);

  useEffect(() => {
    // Only poll if there are active tasks
    const hasActive = taskIds.length > 0;

    if (hasActive) {
      setIsPolling(true);
      // Immediate first poll
      poll();
      intervalRef.current = setInterval(poll, 3000);
    } else {
      setIsPolling(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskIds, poll]);

  return {
    isPolling,
    pollingCount: taskIds.length,
  };
}
