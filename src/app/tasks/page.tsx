"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  MoreHorizontal,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Image as ImageIcon,
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
}

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    name: "批量生成场景图 - 美妆护肤系列",
    status: "completed",
    progress: 100,
    total: 12,
    completed: 12,
    createdAt: "2024-05-20 14:30",
    type: "scene",
  },
  {
    id: "2",
    name: "智能抠图 - 食品饮料系列",
    status: "running",
    progress: 65,
    total: 8,
    completed: 5,
    createdAt: "2024-05-20 15:00",
    type: "remove-bg",
  },
  {
    id: "3",
    name: "高清放大 - 3C产品图",
    status: "failed",
    progress: 30,
    total: 6,
    completed: 2,
    createdAt: "2024-05-20 13:00",
    type: "upscale",
  },
  {
    id: "4",
    name: "AI换背景 - 家居用品系列",
    status: "pending",
    progress: 0,
    total: 10,
    completed: 0,
    createdAt: "2024-05-20 16:00",
    type: "background",
  },
  {
    id: "5",
    name: "批量生成场景图 - 服装服饰系列",
    status: "running",
    progress: 45,
    total: 20,
    completed: 9,
    createdAt: "2024-05-20 14:00",
    type: "scene",
  },];

const TABS = [
  { id: "all", label: "全部" },
  { id: "running", label: "进行中" },
  { id: "completed", label: "已完成" },
  { id: "failed", label: "失败" },
];

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

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [tasks] = useState(MOCK_TASKS);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === "all") return true;
    if (activeTab === "running") return task.status === "running" || task.status === "pending";
    return task.status === activeTab;
  });

  return (
    <div className="h-screen flex flex-col bg-background"
    >
      <TopNav />

      {/* Header */}
      <div className="px-8 py-6 flex items-center justify-between shrink-0"
      >
        <div>
          <h1
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            任务中心
          </h1>
          <p
            className="text-sm text-muted-foreground mt-0.5"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            查看和管理你的生成任务
          </p>
        </div>
        <div className="flex items-center gap-3"
        >
          <Button variant="outline" size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
          <Button variant="outline" size="sm"
          >
            批量操作
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-border shrink-0"
      >
        <div className="flex gap-1"
        >
          {TABS.map((tab) => (
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
      <div className="flex-1 overflow-auto p-8"
      >
        <div className="max-w-5xl mx-auto space-y-4"
        >
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between"
              >
                <div className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
                  >
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3
                      className="text-sm font-medium text-foreground"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {task.name}
                    </h3>
                    <p
                      className="text-xs text-muted-foreground mt-0.5"
                      style={{ fontFamily: "Geist, sans-serif" }}
                    >
                      {task.createdAt} · {task.completed}/{task.total} 张
                    </p>
                  </div>
                </div>
                <StatusBadge status={task.status} />
              </div>

              {task.status === "running" && (
                <div className="mt-4"
                >
                  <div className="flex items-center justify-between mb-1.5"
                  >
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "Geist, sans-serif" }}
                    >
                      进度 {task.progress}%
                    </span>
                    <span
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: "Geist, sans-serif" }}
                    >
                      {task.completed}/{task.total}
                    </span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border"
              >
                {task.status === "running" && (
                  <Button variant="ghost" size="sm"
                  >
                    <Pause className="w-4 h-4 mr-1.5" />
                    暂停
                  </Button>
                )}
                {task.status === "pending" && (
                  <Button variant="ghost" size="sm"
                  >
                    <Play className="w-4 h-4 mr-1.5" />
                    开始
                  </Button>
                )}
                {task.status === "failed" && (
                  <Button variant="ghost" size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-1.5" />
                    重试
                  </Button>
                )}
                {task.status === "completed" && (
                  <Button variant="ghost" size="sm" asChild
                  >
                    <Link href={`/results?task=${task.id}`}
                    >
                      查看结果
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive"
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
