"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import { cn } from "@/lib/utils";
import { ArrowLeft, Bolt, Check, ImageIcon, Layers, Upload, Clock, Save } from "lucide-react";

interface TemplateLite {
  id: string;
  name: string;
  activeVersionId?: string | null;
}
interface PromptVersion {
  id: string;
  versionNo: number;
  label?: string | null;
  content: string;
}
interface AvailableModel {
  provider: string;
  modelName: string;
}
type CellStatus = "idle" | "queued" | "running" | "done" | "failed";
interface CellState {
  status: CellStatus;
  imageUrl?: string;
}

const modelKey = (m: AvailableModel) => `${m.provider}::${m.modelName}`;
const cellKey = (versionId: string, mKey: string) => `${versionId}##${mKey}`;

export default function PromptStudioPage() {
  return (
    <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center text-ink-3">加载中…</div>}>
      <PromptStudioInner />
    </Suspense>
  );
}

function PromptStudioInner() {
  const searchParams = useSearchParams();
  const initialTemplateId = searchParams.get("templateId");

  const [templates, setTemplates] = useState<TemplateLite[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [models, setModels] = useState<AvailableModel[]>([]);

  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [inputAsset, setInputAsset] = useState<Record<string, unknown> | null>(null);
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [running, setRunning] = useState(false);
  // 每列提示词的现场编辑草稿（跑对比时用编辑后的内容；不覆盖原版本）
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingVersionId, setSavingVersionId] = useState<string | null>(null);

  const contentOf = (v: PromptVersion) => drafts[v.id] ?? v.content;
  const isDirty = (v: PromptVersion) => drafts[v.id] !== undefined && drafts[v.id] !== v.content;

  const saveAsNewVersion = async (v: PromptVersion) => {
    if (!templateId || !isDirty(v)) return;
    setSavingVersionId(v.id);
    try {
      const res = await fetch(`/api/prompt-templates/${templateId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: drafts[v.id], label: `基于 v${v.versionNo} 编辑` }),
      });
      if (!res.ok) throw new Error();
      const d = await (await fetch(`/api/prompt-templates/${templateId}/versions`)).json();
      const vs: PromptVersion[] = d.versions || [];
      setVersions(vs);
      const newest = vs.reduce((a, b) => (b.versionNo > a.versionNo ? b : a), vs[0]);
      if (newest) setSelectedVersions((prev) => new Set([...prev, newest.id]));
      setDrafts((prev) => { const n = { ...prev }; delete n[v.id]; return n; });
    } finally {
      setSavingVersionId(null);
    }
  };

  // 载入模板列表 + 可用模型
  useEffect(() => {
    fetch("/api/prompt-templates")
      .then((r) => r.json())
      .then((d) => {
        const list: TemplateLite[] = d.templates || [];
        setTemplates(list);
        if (!initialTemplateId && list[0]) setTemplateId(list[0].id);
      })
      .catch(() => setTemplates([]));
    fetch("/api/models/available")
      .then((r) => r.json())
      .then((d) => {
        const ms: AvailableModel[] = d.models || [];
        setModels(ms);
        // 默认选中第一个模型
        if (ms[0]) setSelectedModels(new Set([modelKey(ms[0])]));
      })
      .catch(() => setModels([]));
  }, [initialTemplateId]);

  // 切换模板 → 载入版本，默认选中当前生效版本
  useEffect(() => {
    if (!templateId) return;
    fetch(`/api/prompt-templates/${templateId}/versions`)
      .then((r) => r.json())
      .then((d) => {
        const vs: PromptVersion[] = d.versions || [];
        setVersions(vs);
        const active = d.activeVersionId && vs.find((v) => v.id === d.activeVersionId);
        setSelectedVersions(new Set(active ? [active.id] : vs[0] ? [vs[0].id] : []));
        setCells({});
        setDrafts({});
      })
      .catch(() => setVersions([]));
  }, [templateId]);

  const toggle = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  const activeVersions = useMemo(
    () => versions.filter((v) => selectedVersions.has(v.id)),
    [versions, selectedVersions]
  );
  const activeModels = useMemo(
    () => models.filter((m) => selectedModels.has(modelKey(m))),
    [models, selectedModels]
  );

  const matrixCount = activeVersions.length * activeModels.length;
  const canRun = !!testImage && matrixCount > 0 && !running;

  const onPickImage = (file?: File) => {
    if (!file) return;
    setTestFile(file);
    setInputAsset(null); // 换图后需重新上传
    setTestImage(URL.createObjectURL(file));
  };

  const pollComparison = (tid: string, cid: string) => {
    fetch(`/api/prompt-templates/${tid}/comparisons/${cid}`)
      .then((r) => {
        if (!r.ok) throw new Error("poll failed");
        return r.json();
      })
      .then((data) => {
        // 瞬时错误/无 cells 时不能当作终态，继续重试
        if (!Array.isArray(data.cells)) {
          setTimeout(() => pollComparison(tid, cid), 3000);
          return;
        }
        const next: Record<string, CellState> = {};
        let allTerminal = true;
        for (const c of data.cells) {
          const k = cellKey(c.versionId, `${c.provider}::${c.modelName}`);
          const st: CellStatus =
            c.status === "COMPLETED" ? "done" : c.status === "FAILED" ? "failed" : c.status === "PROCESSING" ? "running" : "queued";
          next[k] = { status: st, imageUrl: c.resultUrl || undefined };
          if (st !== "done" && st !== "failed") allTerminal = false;
        }
        setCells(next);
        if (allTerminal) setRunning(false);
        else setTimeout(() => pollComparison(tid, cid), 2500);
      })
      .catch(() => setTimeout(() => pollComparison(tid, cid), 3000));
  };

  // 真实运行：上传测试图 → 建对比（版本×模型批量提交）→ 轮询填图
  const runCompare = async () => {
    if (!templateId || !testFile || matrixCount === 0 || running) return;
    setRunning(true);
    const init: Record<string, CellState> = {};
    activeVersions.forEach((v) => activeModels.forEach((m) => { init[cellKey(v.id, modelKey(m))] = { status: "queued" }; }));
    setCells(init);
    try {
      // 1. 上传测试图（缓存 asset，换图前只传一次）
      let asset = inputAsset;
      if (!asset) {
        const fd = new FormData();
        fd.append("input", testFile);
        const up = await (await fetch("/api/input-assets", { method: "POST", body: fd })).json();
        asset = up.inputAsset;
        setInputAsset(asset);
      }
      // 2. 建对比
      const body = {
        inputAsset: asset,
        versions: activeVersions.map((v) => ({ versionId: v.id, versionNo: v.versionNo, content: contentOf(v) })),
        models: activeModels.map((m) => ({ provider: m.provider, modelName: m.modelName })),
      };
      const res = await fetch(`/api/prompt-templates/${templateId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "创建对比失败");
        setRunning(false);
        return;
      }
      // 3. 轮询
      pollComparison(templateId, data.comparisonId);
    } catch {
      setRunning(false);
    }
  };

  return (
    <div className="flex h-[100dvh] flex-col bg-background app-bg-glow">
      {/* Top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="outline" className="h-9 w-9 shrink-0 rounded-[11px] border-line-strong bg-surface p-0 text-ink" aria-label="返回">
            <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif-brand truncate text-[18px] font-semibold text-ink">提示词对比工作室</h1>
            <p className="truncate text-[12px] text-ink-3">多版本 × 多模型 · 同图并排对比</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] text-ink-3 sm:inline">
            {matrixCount > 0 ? `${activeVersions.length} 版本 × ${activeModels.length} 模型 = ${matrixCount} 格` : "选版本和模型"}
          </span>
          <Button onClick={runCompare} disabled={!canRun} className="h-9 gap-2 rounded-[11px] bg-ai-gradient px-5 text-[13px] font-bold text-white shadow-soft transition-opacity hover:opacity-90 disabled:opacity-50">
            {running ? <ConicSpinner size={16} showPulse={false} /> : <Bolt className="h-4 w-4" />}
            {running ? "生成中…" : "运行对比"}
          </Button>
        </div>
      </header>

      {/* 控制区：模板 / 测试图 / 多选版本 / 多选模型 */}
      <div className="shrink-0 space-y-3 border-b border-line bg-surface px-4 py-3 md:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          {/* 模板 + 测试图 */}
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-ink-3" />
              <select
                value={templateId ?? ""}
                onChange={(e) => setTemplateId(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-line-strong bg-surface-muted/50 px-3 py-2 text-[12.5px] text-ink-2 transition-colors hover:border-[color:var(--accent-ai-line)]">
              {testImage ? (
                <img src={testImage} alt="测试图" className="h-8 w-8 rounded object-cover" />
              ) : (
                <Upload className="h-4 w-4 text-ink-3" />
              )}
              <span className="min-w-0 truncate">{testImage ? "已选择测试图，可点击更换" : "上传测试商品图"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
            </label>
          </div>

          {/* 多选版本 */}
          <div className="flex-1">
            <p className="mb-1.5 text-[12px] font-semibold text-ink-3">对比版本（多选）</p>
            <div className="flex flex-wrap gap-1.5">
              {versions.length === 0 && <span className="text-[12px] text-ink-3">该模板暂无版本</span>}
              {versions.map((v) => {
                const on = selectedVersions.has(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggle(selectedVersions, v.id, setSelectedVersions)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      on ? "border-[color:var(--accent-ai-line)] bg-ai-soft text-ai-accent" : "border-line-strong text-ink-2 hover:text-ink"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                    v{v.versionNo}{v.label ? `·${v.label}` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 多选模型 */}
          <div className="flex-1">
            <p className="mb-1.5 text-[12px] font-semibold text-ink-3">对比模型（多选）</p>
            <div className="flex flex-wrap gap-1.5">
              {models.length === 0 && <span className="text-[12px] text-ink-3">无已启用生图模型，去设置开启</span>}
              {models.map((m) => {
                const k = modelKey(m);
                const on = selectedModels.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(selectedModels, k, setSelectedModels)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                      on ? "border-[color:var(--accent-ai-line)] bg-ai-soft text-ai-accent" : "border-line-strong text-ink-2 hover:text-ink"
                    )}
                    title={m.provider}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {m.modelName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 对比矩阵：列=版本，列内每格=模型产出图 */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeVersions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[13px] text-ink-3">
            选择至少一个版本开始对比
          </div>
        ) : (
          <div className="flex gap-4">
            {activeVersions.map((v) => (
              <div key={v.id} className="glass-panel flex w-[300px] shrink-0 flex-col gap-3 rounded-[16px] p-4">
                {/* 版本头 + 提示词 */}
                <div>
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="font-serif-brand text-[16px] font-semibold text-ink">v{v.versionNo}</span>
                    {v.label && <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground">{v.label}</span>}
                  </div>
                  <Textarea
                    value={contentOf(v)}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    className="max-h-[160px] min-h-[84px] resize-y rounded-[10px] text-[12px] leading-[1.6]"
                    placeholder="这个版本的提示词…"
                  />
                  {isDirty(v) && (
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-ai-accent">已改动（跑对比用编辑后内容）</span>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="gap-1 text-ai-accent"
                        disabled={savingVersionId === v.id}
                        onClick={() => saveAsNewVersion(v)}
                      >
                        <Save className="h-3.5 w-3.5" /> 存为新版本
                      </Button>
                    </div>
                  )}
                </div>
                {/* 产出图：每个模型一格，落在提示词下面 */}
                <div className="flex flex-col gap-2.5">
                  {activeModels.length === 0 && <span className="text-[12px] text-ink-3">选择至少一个模型</span>}
                  {activeModels.map((m) => {
                    const c = cells[cellKey(v.id, modelKey(m))] ?? { status: "idle" as CellStatus };
                    return (
                      <div key={modelKey(m)} className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-ink-3">{m.modelName}</span>
                        <ResultCell state={c} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCell({ state }: { state: CellState }) {
  if (state.status === "running") {
    return <div className="flex aspect-square items-center justify-center rounded-[10px] border border-line animate-shimmer" />;
  }
  if (state.status === "queued") {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-line-strong bg-surface-muted/50">
        <Clock className="h-5 w-5 text-ink-3" />
      </div>
    );
  }
  if (state.status === "failed") {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[10px] border border-danger/40 bg-danger/5 text-center text-[11px] text-danger">
        生成失败
      </div>
    );
  }
  if (state.status === "done" && state.imageUrl) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-line">
        <img src={state.imageUrl} alt="结果" className="aspect-square w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-line-strong bg-surface-muted/40">
      <ImageIcon className="h-6 w-6 text-ink-3 opacity-50" />
    </div>
  );
}
