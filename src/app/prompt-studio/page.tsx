"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MobileDesktopOnly } from "@/components/navigation/MobileDesktopOnly";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bolt,
  Clock,
  History,
  ImageIcon,
  Plus,
  Save,
  Server,
  Sparkles,
  X,
  Check,
} from "lucide-react";

type GroupStatus = "idle" | "queued" | "running" | "done";

interface PromptGroup {
  id: string;
  title: string;
  isEditable: boolean;
  removable: boolean;
  versions: { label: string; time: string; content: string }[];
  activeVersion: string;
  model: string;
  style: string;
  ratio: string;
  content: string;
  status: GroupStatus;
}

const MODELS = [
  "gemini-3.1-flash-image-preview",
  "seedream-4.5",
  "gpt-4o-image",
];

const STYLES = ["自然光", "棚拍", "生活场景", "极简", "节日氛围"];
const RATIOS = ["1:1", "3:4", "4:3", "16:9", "9:16"];

const INITIAL_GROUP: PromptGroup = {
  id: "g1",
  title: "组 1",
  isEditable: true,
  removable: false,
  versions: [
    {
      label: "v3",
      time: "2026-06-24 10:12",
      content:
        "专业电商产品摄影，{风格}，比例 {比例}，柔和自然光，真实材质质感，主体清晰居中，背景简洁不抢镜，4K 高清。",
    },
    {
      label: "v2",
      time: "2026-06-20 16:40",
      content: "电商场景图，自然光，干净背景，突出产品主体。",
    },
    {
      label: "v1",
      time: "2026-06-18 09:05",
      content: "商品场景图，简单背景。",
    },
  ],
  activeVersion: "v3",
  model: MODELS[0],
  style: STYLES[0],
  ratio: RATIOS[0],
  content:
    "专业电商产品摄影，{风格}，比例 {比例}，柔和自然光，真实材质质感，主体清晰居中，背景简洁不抢镜，4K 高清。",
  status: "idle",
};

const CONCURRENCY_OPTIONS = [1, 2, 3, 4];

export default function PromptStudioPage() {
  const [groups, setGroups] = useState<PromptGroup[]>([INITIAL_GROUP]);
  const [running, setRunning] = useState(false);
  const [concurrency] = useState(2);

  const canAdd = groups.length < 4;
  const bannerText = useMemo(() => {
    if (groups.length <= concurrency) {
      return `共 ${groups.length} 组 · 系统并发上限 ${concurrency} · 可同时运行`;
    }
    return `共 ${groups.length} 组 · 系统并发上限 ${concurrency} · 超出将分批排队`;
  }, [groups.length, concurrency]);
  const warn = groups.length > concurrency;

  const addGroup = () => {
    if (!canAdd) return;
    setGroups((prev) => [
      ...prev,
      {
        ...INITIAL_GROUP,
        id: `g${Date.now()}`,
        title: `组 ${prev.length + 1}`,
        isEditable: false,
        removable: true,
        status: "idle",
      },
    ]);
  };

  const removeGroup = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGroup = (id: string, patch: Partial<PromptGroup>) => {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const runAll = () => {
    setRunning(true);
    setGroups((prev) =>
      prev.map((g, idx) => ({
        ...g,
        status: idx < concurrency ? "running" : "queued",
      }))
    );
    // demo: settle to done after 2.4s
    setTimeout(() => {
      setGroups((prev) => prev.map((g) => ({ ...g, status: "done" })));
      setRunning(false);
    }, 2400);
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: 16,
    gridTemplateColumns:
      groups.length === 1
        ? "minmax(0, 720px)"
        : `repeat(${groups.length}, minmax(280px, 1fr))`,
    justifyContent: groups.length === 1 ? "center" : "stretch",
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background app-bg-glow">
      <MobileDesktopOnly title="提示词工作室" reason="提示词工作室需要并排多列对比和大段文本编辑，手机屏幕放不下。" />
      {/* Top bar — 桌面端 */}
      <header className="hidden md:flex shrink-0 items-center justify-between border-b border-line bg-surface px-6 py-3.5">
        <div className="flex items-center gap-3.5">
          <Button
            asChild
            variant="outline"
            className="h-9 gap-1.5 rounded-[11px] border-line-strong bg-surface text-[13px] font-semibold text-ink"
          >
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
          </Button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-brand-soft">
              <Sparkles className="h-4 w-4 text-brand" />
            </span>
            <h3 className="text-base font-bold text-ink">电商场景生成 · 提示词工作室</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-[11px] border-line-strong bg-surface text-[13px] font-semibold text-ink"
          >
            <History className="h-4 w-4" />
            恢复为编辑版本
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-1.5 rounded-[11px] border-line-strong bg-surface text-[13px] font-semibold text-ink"
          >
            <Save className="h-4 w-4" />
            保存为新版本
          </Button>
          <Button
            onClick={runAll}
            disabled={running}
            className="h-9 gap-2 rounded-[11px] bg-accent-gradient px-5 text-[13px] font-bold text-white shadow-float transition-transform hover:-translate-y-0.5 disabled:opacity-70"
          >
            {running ? (
              <ConicSpinner size={16} showPulse={false} />
            ) : (
              <Bolt className="h-4 w-4" />
            )}
            {running ? "生成中…" : "运行调试"}
          </Button>
        </div>
      </header>

      {/* Banner */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-6 py-2.5">
        <div className="flex items-center gap-2">
          {warn ? (
            <Sparkles className="h-4 w-4 text-brand" />
          ) : (
            <Server className="h-4 w-4 text-ink-3" />
          )}
          <span className="text-[12.5px] font-semibold text-ink-2">{bannerText}</span>
        </div>
        <div className="flex items-center gap-2.5">
          {canAdd ? (
            <button
              type="button"
              onClick={addGroup}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-[10px] border border-dashed border-line-strong bg-surface px-3.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand-text"
            >
              <Plus className="h-4 w-4" />
              添加对比组
            </button>
          ) : (
            <span className="text-[11.5px] text-ink-3">已达上限 · 最多 4 组</span>
          )}
          <div className="flex items-center gap-1 rounded-[10px] border border-line bg-surface-muted/60 px-2 py-1">
            <span className="text-[11px] font-semibold text-ink-3">并发：</span>
            {CONCURRENCY_OPTIONS.map((n) => (
              <span
                key={n}
                className={cn(
                  "rounded-md px-1.5 text-[11px] font-bold",
                  concurrency === n
                    ? "bg-accent-gradient text-white"
                    : "text-ink-3"
                )}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Groups grid */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div style={gridStyle}>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              onUpdate={(patch) => updateGroup(g.id, patch)}
              onRemove={() => removeGroup(g.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupCard({
  group,
  onUpdate,
  onRemove,
}: {
  group: PromptGroup;
  onUpdate: (patch: Partial<PromptGroup>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="glass-panel flex min-w-0 flex-col gap-4 rounded-[16px] p-[18px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-ink">{group.title}</span>
          {group.isEditable && (
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-brand-text">
              可编辑
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={group.status} />
          {group.removable && (
            <button
              type="button"
              onClick={onRemove}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-line bg-surface text-ink-3 transition-colors hover:bg-surface-muted hover:text-ink"
              aria-label="删除对比组"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Versions */}
      <FieldGroup label="版本">
        <div className="flex flex-wrap gap-1.5">
          {group.versions.map((v) => {
            const active = v.label === group.activeVersion;
            return (
              <button
                key={v.label}
                type="button"
                onClick={() =>
                  onUpdate({ activeVersion: v.label, content: v.content })
                }
                className={cn(
                  "rounded-[8px] border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                  active
                    ? "border-brand bg-brand-soft text-brand-text"
                    : "border-line-strong text-ink-2 hover:text-ink"
                )}
                title={v.time}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Model */}
      <FieldGroup label="模型">
        <Select value={group.model} onValueChange={(v) => onUpdate({ model: v })}>
          <SelectTrigger className="h-10 rounded-[10px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldGroup>

      {/* Inputs: 风格 / 比例 */}
      <FieldGroup label="入参">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-ink-3">风格</span>
            <Select value={group.style} onValueChange={(v) => onUpdate({ style: v })}>
              <SelectTrigger className="h-9 rounded-[9px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-ink-3">比例</span>
            <Select value={group.ratio} onValueChange={(v) => onUpdate({ ratio: v })}>
              <SelectTrigger className="h-9 rounded-[9px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATIOS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FieldGroup>

      {/* Content */}
      <FieldGroup label="提示词内容">
        {group.isEditable ? (
          <Textarea
            value={group.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            className="min-h-[110px] resize-y rounded-[11px] text-[13px] leading-[1.6]"
          />
        ) : (
          <div className="min-h-[110px] whitespace-pre-wrap rounded-[11px] border border-line bg-surface p-3 text-[13px] leading-[1.6] text-ink-2">
            {group.content}
          </div>
        )}
        <span className="text-[11px] leading-[1.5] text-ink-3">
          支持{" "}
          <code className="font-mono text-brand-text">{"{风格}"}</code>、{" "}
          <code className="font-mono text-brand-text">{"{比例}"}</code> 占位变量
        </span>
      </FieldGroup>

      {/* Samples */}
      <FieldGroup label="生成示例 · 3 张">
        <SampleArea status={group.status} model={group.model} />
      </FieldGroup>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-ink-3">{label}</label>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: GroupStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[7px] bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-text">
        <ConicSpinner size={12} showPulse={false} />
        生成中
      </span>
    );
  }
  if (status === "queued") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[7px] border border-line bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-ink-2">
        <Clock className="h-3 w-3" />
        排队中
      </span>
    );
  }
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-[7px] bg-ok/15 px-2 py-0.5 text-[11px] font-bold text-ok">
        <Check className="h-3 w-3" />
        已完成
      </span>
    );
  }
  return null;
}

function SampleArea({
  status,
  model,
}: {
  status: GroupStatus;
  model: string;
}) {
  if (status === "running") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-[10px] border border-line animate-shimmer"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-text">
          <ConicSpinner size={14} showPulse={false} />
          正在用 {model} 生成…
        </div>
      </div>
    );
  }
  if (status === "queued") {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-3 gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-[10px] border border-dashed border-line-strong bg-surface-muted/60 opacity-60"
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-ink-3">
          <Clock className="h-3.5 w-3.5" />
          排队中 · 等待空闲并发
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "flex aspect-square items-center justify-center rounded-[10px] border",
            status === "done"
              ? "border-line bg-brand-soft/40"
              : "border-dashed border-line-strong bg-surface-muted/40"
          )}
        >
          <ImageIcon className="h-6 w-6 text-brand opacity-60" />
        </div>
      ))}
    </div>
  );
}
