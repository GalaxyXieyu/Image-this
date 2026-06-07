"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { apiGet, apiDelete } from "@/lib/api-client";
import { useTaskPolling } from "@/lib/use-task-polling";
import { getWorkflowTypeLabel, normalizeTaskStatus } from "@/lib/workbench/task-compat";
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

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0"
    >
      <div className="flex items-center gap-3"
      >
        <div className="w-8 h-8 rounded-lg bg-[#0066FF]" />
        <span
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          AI 商品视觉工作台
        </span>
      </div>
      <nav className="flex items-center gap-6"
      >
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          首页
        </Link>
        <Link
          href="/templates"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          模板库
        </Link>
        <Link
          href="/tasks"
          className="text-sm text-foreground font-medium"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          任务中心
        </Link>
        <Link
          href="/results"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          结果管理
        </Link>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          设置
        </Link>
      </nav>
    </header>
  );
}

function StatusBadge({ status }: { status: TaskStatus }) {
  const variants: Record<TaskStatus, string> = {
    pending: "bg-muted text-muted-foreground",
    running: "bg-blue-50 text-blue-600 border-blue-200",
    completed: "bg-green-50 text-green-600 border-green-200",
    failed: "bg-red-50 text-red-600 border-red-200",
  };

  const labels: Record<TaskStatus, string> = {
    pending: "等待中",
    running: "进行中",
    completed: "已完成",
    failed: "失败",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-1 rounded-full text-xs font-medium border",
        variants[status]
      )}
      style={{ fontFamily: "Geist, sans-serif" }}
    >
      {labels[status]}
    </span>
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
}

interface TasksApiResponse {
  success: boolean;
  tasks: BackendTask[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  stats: { pending: number; processing: number; completed: number; failed: number; total: number };
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, running: 0, completed: 0, failed: 0, total: 0 });

  const fetchTasks = useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
    <div className="h-screen flex flex-col bg-background">
      <TopNav />

      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
            任务中心
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5" style={{ fontFamily: "Geist, sans-serif" }}>
            查看和管理你的生成任务
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isPolling && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              实时更新中
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-border shrink-0">
        <div className="flex gap-1">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchTasks}>
                重试
              </Button>
            </div>
          )}

          {!loading && !error && filteredTasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <ImageIcon className="w-10 h-10 mb-3" />
              <p className="text-sm" style={{ fontFamily: "Geist, sans-serif" }}>
                暂无任务
              </p>
            </div>
          )}

          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                      {task.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Geist, sans-serif" }}>
                      {task.createdAt} · {task.completed}/{task.total} 张
                    </p>
                    {(task.status === "completed" || task.status === "failed") && task.usedModel && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5" style={{ fontFamily: "Geist, sans-serif" }}>
                        模型: {task.usedModel}
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>

              {(task.status === "running" || task.status === "pending") && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                      进度 {task.progress}%
                    </span>
                    <span className="text-xs text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                      {task.completed}/{task.total}
                    </span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                {task.status === "failed" && (
                  <Button variant="ghost" size="sm" onClick={() => alert("重试功能待实现")}>
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    重试
                  </Button>
                )}
                {task.status === "completed" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/results?task=${task.id}`}>查看结果</Link>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
