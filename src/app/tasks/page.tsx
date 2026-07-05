"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiGet, apiDelete } from "@/lib/api-client";
import { useTaskPolling } from "@/lib/use-task-polling";
import { getWorkflowTypeLabel, normalizeTaskStatus } from "@/lib/workbench/task-compat";
import { BrandEmptyState } from "@/components/brands/SpriteImage";
import {
  RefreshCw,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Radio,
} from "lucide-react";

type TaskStatus = "pending" | "running" | "completed" | "failed";

interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  progress: number;
  total: number;
  completed: number;
  createdAt: string;
  type: string;
  usedModel?: string | null;
  originalImageUrl?: string | null;
  resultImageUrl?: string | null;
  setId?: string | null;
}

function mapBackendStatus(status: string): TaskStatus {
  switch (normalizeTaskStatus(status)) {
    case "pending": return "pending";
    case "processing": return "running";
    case "completed": return "completed";
    case "failed": return "failed";
    case "cancelled": return "failed";
    default: return "pending";
  }
}

function mapTaskType(type: string): string {
  return getWorkflowTypeLabel(type);
}

function formatDate(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const variantMap: Record<TaskStatus, "warning" | "processing" | "success" | "danger"> = {
    pending: "warning",
    running: "processing",
    completed: "success",
    failed: "danger",
  };

  const labels: Record<TaskStatus, string> = {
    pending: "等待中",
    running: "进行中",
    completed: "已完成",
    failed: "失败",
  };

  return (
    <Badge variant={variantMap[status]}>
      {labels[status]}
    </Badge>
  );
}

interface BackendTask {
  id: string;
  type: string;
  workflowType?: string;
  status: string;
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errorMessage: string | null;
  createdAt: string;
  usedModel?: string | null;
  originalImageUrl?: string | null;
  resultImageUrl?: string | null;
  setId?: string | null;
}

interface TasksApiResponse {
  success: boolean;
  tasks: BackendTask[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  stats: { pending: number; processing: number; completed: number; failed: number; total: number };
}

function TaskThumbnail({ src, isResult }: { src?: string | null; isResult: boolean }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] border border-line bg-surface-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={isResult ? "结果" : "原图"}
        className="h-full w-full object-cover"
        onError={() => setError(true)}
      />
      {!isResult && (
        <span className="absolute inset-x-0 bottom-0 bg-black/45 py-0.5 text-center text-[9px] font-medium text-white">
          原图
        </span>
      )}
    </div>
  );
}

function TaskActions({ task, onDelete }: { task: Task; onDelete: (_id: string) => void }) {
  return (
    <>
      {task.status === "failed" && (
        <Button variant="ghost" size="sm" className="min-h-10" onClick={() => alert("重试功能待实现")}>
          <RotateCcw className="w-4 h-4 mr-1.5" />
          重试
        </Button>
      )}
      {task.status === "completed" && (
        <Button variant="ghost" size="sm" className="min-h-10" asChild>
          {/* 套图按 setId 聚焦分组，其余按 taskId */}
          <Link href={task.setId ? `/results?set=${task.setId}` : `/results?task=${task.id}`}>查看结果</Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="min-h-10 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(task.id)}
      >
        <Trash2 className="w-4 h-4 md:mr-1.5" />
        <span className="hidden md:inline">删除</span>
      </Button>
    </>
  );
}

export default function TasksPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0, total: 0 });

  const fetchTasks = useCallback(async () => {
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        const statusMap: Record<string, string> = {
          running: "PROCESSING",
          completed: "COMPLETED",
          failed: "FAILED",
        };
        if (statusMap[activeTab]) params.append("status", statusMap[activeTab]);
      }
      params.append("limit", "50");

      const data = await apiGet<TasksApiResponse>(`/api/tasks?${params.toString()}`);
      const mapped = data.tasks.map((t) => ({
        id: t.id,
        name: `${mapTaskType(t.workflowType ?? t.type)} - ${t.currentStep || "处理中"}`,
        status: mapBackendStatus(t.status),
        progress: t.progress ?? 0,
        total: t.totalSteps ?? 1,
        completed: t.completedSteps ?? 0,
        createdAt: formatDate(t.createdAt),
        type: t.type,
        usedModel: t.usedModel,
        originalImageUrl: t.originalImageUrl,
        resultImageUrl: t.resultImageUrl,
        setId: t.setId,
      }));
      setTasks(mapped);
      setStats({
        pending: data.stats.pending,
        running: data.stats.processing,
        completed: data.stats.completed,
        failed: data.stats.failed,
        total: data.stats.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [activeTab, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/tasks");
    }
  }, [router, status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTasks();
    }
  }, [fetchTasks, status]);

  const handleDelete = async (taskId: string) => {
    if (!confirm("确定要删除这个任务吗？")) return;
    try {
      await apiDelete(`/api/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const activeTaskIds = tasks
    .filter((t) => t.status === "running" || t.status === "pending")
    .map((t) => t.id);

  const updateTasksFromPolling = useCallback((polledTasks: import("@/lib/use-task-polling").PollingTask[]) => {
    setTasks((prev) => {
      const updated = prev.map((task) => {
        const polled = polledTasks.find((p) => p.id === task.id);
        if (!polled) return task;
        return {
          ...task,
          status: mapBackendStatus(polled.status),
          progress: polled.progress ?? 0,
          name: `${mapTaskType(polled.workflowType ?? polled.type)} - ${polled.currentStep || "处理中"}`,
          usedModel: polled.usedModel,
        };
      });
      return updated;
    });
  }, []);

  const { isPolling } = useTaskPolling(activeTaskIds, updateTasksFromPolling);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-data text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "all") return true;
    if (activeTab === "running") return task.status === "running" || task.status === "pending";
    return task.status === activeTab;
  });

  const tabLabels = [
    { id: "all", label: `全部 (${stats.total})` },
    { id: "running", label: `进行中 (${stats.running + stats.pending})` },
    { id: "completed", label: `已完成 (${stats.completed})` },
    { id: "failed", label: `失败 (${stats.failed})` },
  ];

  return (
    <div className="h-full flex flex-col bg-background">

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 sm:px-8 md:py-5 md:flex-row">
        <div>
          <div className="md:hidden">
            {isPolling ? (
              <div className="flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[12px] font-medium text-processing">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                实时更新
              </div>
            ) : (
              <div className="min-h-9 rounded-full border border-line bg-surface px-3 py-2 text-[12px] font-medium text-muted-foreground">
                {stats.total} 个任务
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isPolling && (
            <div className="hidden items-center gap-1.5 text-caption text-processing md:flex">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              实时更新中
            </div>
          )}
	          <Button variant="outline" size="sm" className="min-h-10 rounded-full px-3 md:min-h-11" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 md:mr-2", loading && "animate-spin")} />
            <span className="hidden md:inline">刷新</span>
          </Button>
        </div>
      </div>

      {/* Tabs — 紫罗兰胶囊组（对齐 /tools） */}
      <div className="px-4 shrink-0 sm:px-8">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full glass-panel p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:inline-flex">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
	                "min-h-9 shrink-0 px-3 text-[12px] font-medium rounded-full transition-all md:min-h-0 md:py-1.5",
                activeTab === tab.id
                  ? "bg-accent-gradient text-white shadow-soft"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-3 md:space-y-4 lg:max-w-none">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="text-data text-destructive">{error}</p>
	              <Button variant="outline" size="sm" className="mt-3 min-h-11" onClick={fetchTasks}>
                重试
              </Button>
            </div>
          )}

          {!loading && !error && filteredTasks.length === 0 && (
            <div className="py-16">
              <BrandEmptyState
                pose="sleep"
                title="暂无任务"
                description=""
              />
            </div>
          )}

          {/* 移动 / 中屏：卡片 */}
          <div className="space-y-3 md:space-y-4 lg:hidden">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="glass-panel rounded-[18px] p-3.5 shadow-soft transition-shadow hover:shadow-float sm:rounded-card sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <TaskThumbnail
                      src={task.resultImageUrl || task.originalImageUrl}
                      isResult={!!task.resultImageUrl}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-data font-medium text-foreground">
                        {task.name}
                      </h3>
                      <p className="mt-0.5 hidden text-caption text-muted-foreground sm:block">
                        {task.createdAt} · {task.completed}/{task.total} 张
                      </p>
                      {(task.status === "completed" || task.status === "failed") && task.usedModel && (
                        <p className="mt-0.5 hidden text-[11px] text-muted-foreground/70 sm:block">
                          模型: {task.usedModel}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>

                {(task.status === "running" || task.status === "pending") && (
                  <div className="mt-4">
                    <div className="mb-1.5 hidden items-center justify-between sm:flex">
                      <span className="text-caption text-muted-foreground">
                        进度 {task.progress}%
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {task.completed}/{task.total}
                      </span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border md:mt-4 md:pt-4">
                  <TaskActions task={task} onDelete={handleDelete} />
                </div>
              </div>
            ))}
          </div>

          {/* 桌面：紧凑表格 */}
          {!loading && !error && filteredTasks.length > 0 && (
            <div className="hidden overflow-hidden rounded-[16px] border border-line glass-panel lg:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-[12px] font-medium text-ink-3">
                    <th className="px-4 py-2.5">任务</th>
                    <th className="w-28 px-3 py-2.5">状态</th>
                    <th className="w-48 px-3 py-2.5">进度</th>
                    <th className="w-40 px-3 py-2.5">创建时间</th>
                    <th className="w-px px-4 py-2.5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-muted/40">
                      <td className="px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <TaskThumbnail
                            src={task.resultImageUrl || task.originalImageUrl}
                            isResult={!!task.resultImageUrl}
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-medium text-foreground">{task.name}</h3>
                            {(task.status === "completed" || task.status === "failed") && task.usedModel && (
                              <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">模型: {task.usedModel}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2.5">
                        {task.status === "running" || task.status === "pending" ? (
                          <div className="flex items-center gap-2">
                            <Progress value={task.progress} className="h-1.5 flex-1" />
                            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{task.progress}%</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">{task.completed}/{task.total} 张</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{task.createdAt}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <TaskActions task={task} onDelete={handleDelete} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
