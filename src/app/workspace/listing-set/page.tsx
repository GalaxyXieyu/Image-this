"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, Loader2, X, Download, Wand2, ArrowLeft, Check, Minus, Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandImageFallback } from "@/components/brands/SpriteImage";
import { LISTING_TYPES, type ListingImageType } from "@/lib/workbench/listing-set";
import { getSceneGenerationModels } from "@/lib/ai-models";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";

// 出图模型：复用场景生成模型，排除 service 未接线的 volcengine
const IMAGE_MODELS = getSceneGenerationModels().filter((m) => m.provider !== "volcengine");
const DEFAULT_MODEL_ID = IMAGE_MODELS[0]?.id ?? "gemini-3.1-flash-image-preview";

type TypeCounts = Record<ListingImageType, number>;

const DEFAULT_TYPE_COUNTS: TypeCounts = LISTING_TYPES.reduce((acc, t) => {
  acc[t.type] = 1;
  return acc;
}, {} as TypeCounts);

interface PlanItem {
  listingType: ListingImageType;
  index: string;
  label: string;
  variant: number;
  prompt: string;
}

interface SetItem {
  listingType: string;
  index: string;
  label: string;
  candidateIndex?: number;
  processedImageUrl: string;
}

interface SetStatus {
  status: string;
  progress: number;
  currentStep?: string | null;
  errorMessage?: string | null;
  results: SetItem[];
  total?: number | null;
  failed?: number | null;
  partialError?: string | null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function downloadFile(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "image";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function ResultThumb({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <BrandImageFallback title="" description="" pose="sleep" className="[&_p]:hidden rounded-none" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

export default function ListingSetPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [sellingPoints, setSellingPoints] = useState("");
  const [typeCounts, setTypeCounts] = useState<TypeCounts>({ ...DEFAULT_TYPE_COUNTS });
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [copywriterModels, setCopywriterModels] = useState<{ id: string; provider: string }[]>([]);
  const [copywriterModelId, setCopywriterModelId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planItems, setPlanItems] = useState<PlanItem[] | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [setStatus, setSetStatus] = useState<SetStatus | null>(null);

  // 勾选/取消某类（至少保留一类）
  const toggleType = (type: ListingImageType) => {
    setTypeCounts((prev) => {
      const cur = prev[type] ?? 0;
      if (cur > 0) {
        const remaining = LISTING_TYPES.filter((t) => t.type !== type && (prev[t.type] ?? 0) > 0);
        if (remaining.length === 0) return prev; // 至少一类
        return { ...prev, [type]: 0 };
      }
      return { ...prev, [type]: 1 };
    });
  };
  // 调整某类张数（无上限，最少 1）
  const setTypeCount = (type: ListingImageType, n: number) => {
    setTypeCounts((prev) => ({ ...prev, [type]: Math.max(1, Math.floor(n)) }));
  };

  const selectedTypes = LISTING_TYPES.filter((t) => (typeCounts[t.type] ?? 0) > 0).map((t) => t.type);
  const selectedMetas = LISTING_TYPES.filter((t) => (typeCounts[t.type] ?? 0) > 0);
  const totalCount = LISTING_TYPES.reduce((s, t) => s + (typeCounts[t.type] ?? 0), 0);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // 拉取已配置的多模态语言(llm)模型，供选择出词模型
  useEffect(() => {
    (async () => {
      try {
        type ModelRow = { id: string; enabled?: boolean; kind?: string };
        type ProviderCfg = { models?: ModelRow[] };
        const res = await apiGet<{ config?: { gpt?: ProviderCfg; gemini?: ProviderCfg; jimeng?: ProviderCfg } }>(
          "/api/settings"
        );
        const cfg = res.config ?? {};
        const collect = (provider: string, p?: ProviderCfg) =>
          (p?.models ?? [])
            .filter((m) => m.enabled && m.kind === "llm")
            .map((m) => ({ id: m.id, provider }));
        const llm = [
          ...collect("gpt", cfg.gpt),
          ...collect("gemini", cfg.gemini),
          ...collect("jimeng", cfg.jimeng),
        ];
        setCopywriterModels(llm);
        if (llm.length > 0) setCopywriterModelId((prev) => prev || llm[0].id);
      } catch {
        // 拿不到模型列表时静默降级：出词沿用后端自动选中的模型
      }
    })();
  }, []);

  const startPolling = (tid: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const tick = async () => {
      try {
        const s = await apiGet<SetStatus>(`/api/listing-set/status?taskId=${tid}`);
        setSetStatus(s);
        if (["completed", "failed", "cancelled"].includes(s.status) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // 忽略瞬时错误，继续轮询
      }
    };
    tick();
    pollRef.current = setInterval(tick, 3000);
  };

  const handlePick = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      setTaskId(null);
      setSetStatus(null);
      setPlanItems(null);
    } catch {
      toast({ title: "读取图片失败", variant: "destructive" });
    }
  };

  const buildCounts = () =>
    Object.fromEntries(selectedTypes.map((t) => [t, typeCounts[t]])) as Record<string, number>;

  // 第一步：AI 读图，按每类张数出多段提示词草稿，供确认/微调
  const handlePlan = async () => {
    if (!imageDataUrl) {
      toast({ title: "请先上传商品图", variant: "destructive" });
      return;
    }
    setPlanning(true);
    try {
      const res = await apiPost<{ success: boolean; items: PlanItem[] }>("/api/listing-set/plan", {
        imageDataUrl,
        product: { name: productName, category: productCategory, sellingPoints },
        counts: buildCounts(),
        model: copywriterModelId || undefined,
      });
      setPlanItems(res.items);
      toast({ title: "已生成提示词草稿", description: `共 ${res.items.length} 段，可逐条微调后再生成` });
    } catch (err) {
      toast({ title: "出词失败", description: err instanceof Error ? err.message : "请检查文案模型配置", variant: "destructive" });
    } finally {
      setPlanning(false);
    }
  };

  // 第二步：用确认后的多段提示词串行生成套图
  const handleGenerate = async () => {
    if (!imageDataUrl) {
      toast({ title: "请先上传商品图", variant: "destructive" });
      return;
    }
    if (selectedTypes.length === 0) {
      toast({ title: "请至少选择一类图", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 把 planItems 聚成 { type: [第1张, 第2张, ...] }
      let prompts: Record<string, string[]> | undefined;
      if (planItems) {
        const byKey = new Map<string, string>();
        for (const p of planItems) byKey.set(`${p.listingType}-${p.variant}`, p.prompt.trim());
        prompts = {};
        for (const t of selectedTypes) {
          prompts[t] = Array.from({ length: typeCounts[t] }, (_, i) => byKey.get(`${t}-${i + 1}`) ?? "");
        }
      }
      const model = IMAGE_MODELS.find((m) => m.id === modelId);
      const res = await apiPost<{ success: boolean; taskId: string; setId: string }>("/api/listing-set", {
        imageDataUrl,
        product: { name: productName, category: productCategory, sellingPoints },
        types: selectedTypes,
        counts: buildCounts(),
        provider: model?.provider ?? "gemini",
        modelName: model?.id,
        prompts,
      });
      setTaskId(res.taskId);
      setSetStatus({ status: "pending", progress: 0, results: [] });
      startPolling(res.taskId);
      toast({ title: "已提交套图生成", description: `逐张串行生成 ${totalCount} 张…` });
    } catch (err) {
      toast({ title: "提交失败", description: err instanceof Error ? err.message : "请稍后重试", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // 结果按类型分组（同类多图）
  const resultsByType = new Map<string, SetItem[]>();
  for (const r of setStatus?.results ?? []) {
    const arr = resultsByType.get(r.listingType) ?? [];
    arr.push(r);
    resultsByType.set(r.listingType, arr);
  }
  const getResult = (type: string, variant: number) =>
    (resultsByType.get(type) ?? []).find((r) => (r.candidateIndex ?? 1) === variant);

  const hasResult = !!taskId;
  const processing = setStatus ? !["completed", "failed", "cancelled"].includes(setStatus.status) : false;
  const busy = submitting || processing;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6 lg:max-w-[1360px]">
        {/* 步骤条：整幅居中 */}
        <div className="mb-4 flex shrink-0 justify-center">
          <StepHint hasPlan={!!planItems} hasResult={hasResult} />
        </div>

        {/* 滚动区：移动端单列堆叠（类型选择器折叠置顶）；桌面左右双栏 */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:grid lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
          {/* 移动端：类型/张数选择器折叠置顶（仅第一步） */}
          {!hasResult && !planItems && (
            <details className="group glass-panel rounded-[18px] lg:hidden" open>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <div className="text-[14px] font-bold text-ink">选择要生成的图</div>
                  <div className="mt-0.5 text-[12px] text-ink-3">共 {totalCount} 张 · {selectedTypes.length} 类</div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 px-4 pb-4 pt-1">
                <TypeCountCards typeCounts={typeCounts} toggleType={toggleType} setTypeCount={setTypeCount} />
                <ModelSelect modelId={modelId} setModelId={setModelId} />
              </div>
            </details>
          )}

          {/* 左：控制区 */}
          <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <section className="glass-panel flex flex-col rounded-[18px] p-4 shadow-soft lg:flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePick(e.target.files?.[0])}
              />
              <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-line-strong bg-surface-muted/40 transition-colors hover:border-brand sm:w-40 lg:aspect-[4/3] lg:w-full"
                >
                  {imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageDataUrl} alt="商品图" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1.5 text-ink-3">
                      <ImagePlus className="h-7 w-7" />
                      <span className="text-[13px] font-semibold text-ink-2">点击上传商品图</span>
                      <span className="text-[11px] text-ink-3">支持 JPG / PNG，主体清晰更佳</span>
                    </span>
                  )}
                </button>
                <div className="flex flex-1 flex-col gap-2.5">
                  <Input placeholder="商品名称（可选）" value={productName} onChange={(e) => setProductName(e.target.value)} className="h-11 rounded-[12px]" />
                  <Input placeholder="品类，如 美妆/3C/食品（可选）" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-11 rounded-[12px]" />
                  <Textarea
                    placeholder="核心卖点 / 补充描述（可选，出词更贴合）"
                    rows={3}
                    value={sellingPoints}
                    onChange={(e) => setSellingPoints(e.target.value)}
                    className="resize-none rounded-[12px] text-[13px]"
                  />
                  <div className="mt-auto flex flex-col gap-1.5 pt-1">
                    {copywriterModels.length > 0 && (
                      <div className="mb-0.5">
                        <label className="mb-1 block text-[12px] font-semibold text-ink-2">出词模型</label>
                        <Select value={copywriterModelId} onValueChange={setCopywriterModelId}>
                          <SelectTrigger className="min-h-10 text-[13px]">
                            <SelectValue placeholder="选择出词模型" />
                          </SelectTrigger>
                          <SelectContent>
                            {copywriterModels.map((m) => (
                              <SelectItem key={`${m.provider}-${m.id}`} value={m.id}>
                                {m.id}
                                <span className="ml-1.5 text-[10px] text-ink-3">{m.provider}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* 桌面端操作按钮；移动端改用置底操作条 */}
                    <div className="hidden flex-col gap-1.5 lg:flex">
                      <Button variant="brand" className="min-h-11" onClick={handlePlan} disabled={!imageDataUrl || planning || processing}>
                        {planning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                        AI 读图出词
                      </Button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!imageDataUrl || busy}
                        className="min-h-10 rounded-[12px] border border-line-strong bg-surface text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
                      >
                        跳过出词，用当前配置直接生成
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 进度条 */}
            {hasResult && processing && (
              <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
                <span className="text-[13px] text-ink-2">
                  {setStatus?.currentStep || "生成中"} · {setStatus?.results.length ?? 0}/{totalCount}
                </span>
              </div>
            )}
            {hasResult && setStatus?.status === "failed" && setStatus.results.length === 0 && (
              <div className="rounded-[14px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
                生成失败：{setStatus.errorMessage || "请检查 provider 额度或密钥后重试"}
              </div>
            )}
            {/* 部分成功：告知失败张数与原因，并可一键补齐失败的张 */}
            {hasResult && !processing && (setStatus?.failed ?? 0) > 0 && (setStatus?.results.length ?? 0) > 0 && (
              <div className="space-y-2 rounded-[14px] border border-amber-300/50 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-700">
                <p>
                  共 {setStatus?.total ?? totalCount} 张，成功 {setStatus?.results.length ?? 0} 张，
                  {setStatus?.failed} 张生成失败
                  {setStatus?.partialError ? `：${mapProviderErrorMessage(setStatus.partialError)}` : "（可能是 provider 限流或额度）"}。
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-9 border-amber-300 bg-white text-amber-700 hover:text-amber-800"
                  onClick={handleGenerate}
                  disabled={busy}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  重新生成整套（{totalCount} 张）
                </Button>
              </div>
            )}
          </div>

          {/* 右：结果 / 提示词草稿 / 配置 */}
          <div className="flex min-h-0 flex-col lg:h-full lg:overflow-hidden">
            {hasResult ? (
              <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {selectedMetas.map((meta) => {
                  const count = typeCounts[meta.type];
                  const done = resultsByType.get(meta.type)?.length ?? 0;
                  return (
                    <div key={meta.type} className="rounded-[18px] border border-line bg-surface/50 p-3 md:p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-[13px] font-bold text-ink">
                          <span className="text-ink-3">{meta.index}</span> {meta.label}
                        </h3>
                        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-ink-2">
                          {done}/{count}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
                          <ListingSlot
                            key={`${meta.type}-${v}`}
                            meta={meta}
                            item={getResult(meta.type, v)}
                            processing={processing}
                            variant={v}
                            total={count}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            ) : planItems ? (
              <PromptDraftPanel
                planItems={planItems}
                setPlanItems={setPlanItems}
                totalCount={totalCount}
                onRegenerate={() => setPlanItems(null)}
                onGenerate={handleGenerate}
                busy={busy}
              />
            ) : (
              <div className="hidden flex-1 lg:flex">
                <ListingConfigPanel
                  typeCounts={typeCounts}
                  toggleType={toggleType}
                  setTypeCount={setTypeCount}
                  totalCount={totalCount}
                  modelId={modelId}
                  setModelId={setModelId}
                />
              </div>
            )}
          </div>
        </div>

        {/* 移动端置底操作条（随步骤切换主操作） */}
        {!hasResult && (
          <div className="z-30 flex shrink-0 items-center gap-2 border-t border-line bg-surface-glass px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-[18px] backdrop-saturate-150 lg:hidden">
            {planItems ? (
              <>
                <Button variant="ghost" onClick={() => setPlanItems(null)} className="min-h-11 shrink-0 px-3 text-ink-2">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  重新出词
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={busy}
                  className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float"
                >
                  {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                  确认并生成（{totalCount} 张）
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!imageDataUrl || busy}
                  className="min-h-12 shrink-0 rounded-[14px] border border-line-strong bg-surface px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:text-ink disabled:opacity-50"
                >
                  跳过出词
                </button>
                <Button
                  onClick={handlePlan}
                  disabled={!imageDataUrl || planning || processing}
                  className="h-12 flex-1 rounded-[14px] bg-accent-gradient px-6 text-[15px] font-semibold text-white shadow-float"
                >
                  {planning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                  AI 读图出词（{totalCount} 张）
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepHint({ hasPlan, hasResult }: { hasPlan: boolean; hasResult: boolean }) {
  const active = hasResult ? 3 : hasPlan ? 2 : 1;
  const steps = [
    { n: 1, label: "上传出词" },
    { n: 2, label: "确认微调" },
    { n: 3, label: "生成套图" },
  ];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const reached = active >= s.n;
        return (
          <div key={s.n} className="flex items-center">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                reached ? "bg-accent-gradient text-white shadow-soft" : "bg-surface-muted text-ink-3"
              )}
            >
              {s.n}
            </span>
            <span className={cn("ml-1.5 text-[12px] font-semibold", reached ? "text-ink" : "text-ink-3")}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="mx-2 h-px w-4 shrink-0 bg-line-strong" />}
          </div>
        );
      })}
    </div>
  );
}

// 张数步进器
function CountStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-brand hover:text-ink disabled:opacity-40"
        aria-label="减少"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-6 text-center text-[14px] font-bold text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-brand hover:text-ink"
        aria-label="增加"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// 类型 + 每类张数选择卡片（桌面/移动共用）
function TypeCountCards({
  typeCounts,
  toggleType,
  setTypeCount,
}: {
  typeCounts: TypeCounts;
  toggleType: (type: ListingImageType) => void;
  setTypeCount: (type: ListingImageType, n: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {LISTING_TYPES.map((t) => {
        const count = typeCounts[t.type] ?? 0;
        const selected = count > 0;
        return (
          <div
            key={t.type}
            className={cn(
              "flex flex-col rounded-[14px] border p-3 transition-all",
              selected ? "border-brand bg-brand-soft/30 shadow-soft" : "border-line bg-surface"
            )}
          >
            <button type="button" onClick={() => toggleType(t.type)} className="flex w-full items-start gap-2.5 text-left">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                  selected ? "border-transparent bg-accent-gradient text-white" : "border-line-strong text-transparent"
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-ink-3">{t.index}</span>
                  <span className="text-[13px] font-bold text-ink">{t.label}</span>
                </span>
                {/* 说明文案仅桌面显示；移动端类型名已够辨识，隐藏以免卡片过高 */}
                <span className="mt-1 hidden text-[12px] leading-4 text-ink-3 lg:line-clamp-2">{t.rule}</span>
              </span>
            </button>
            {selected && (
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span className="text-[12px] font-semibold text-ink-2">张数</span>
                <CountStepper value={count} onChange={(n) => setTypeCount(t.type, n)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ModelSelect({ modelId, setModelId }: { modelId: string; setModelId: (id: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-ink-2">出图模型</label>
      <Select value={modelId} onValueChange={setModelId}>
        <SelectTrigger className="min-h-11">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {IMAGE_MODELS.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
              {m.priority === "primary" && <span className="ml-1.5 text-[10px] text-green-600">推荐</span>}
              {m.priority === "fallback" && <span className="ml-1.5 text-[10px] text-amber-600">兜底</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// 第一步桌面右栏：选择要生成的图（每类张数）+ 出图模型
function ListingConfigPanel({
  typeCounts,
  toggleType,
  setTypeCount,
  totalCount,
  modelId,
  setModelId,
}: {
  typeCounts: TypeCounts;
  toggleType: (type: ListingImageType) => void;
  setTypeCount: (type: ListingImageType, n: number) => void;
  totalCount: number;
  modelId: string;
  setModelId: (id: string) => void;
}) {
  return (
    <div className="flex min-h-[340px] flex-1 flex-col rounded-[20px] border border-line bg-surface/50 p-4 md:p-5 lg:min-h-0 lg:overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">选择要生成的图</p>
            <p className="text-[12px] text-ink-3">勾选类型并设定每类张数，逐张串行出图</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-bold text-brand-text">
          共 {totalCount} 张
        </span>
      </div>

      <div className="mt-4">
        <TypeCountCards typeCounts={typeCounts} toggleType={toggleType} setTypeCount={setTypeCount} />
      </div>

      <p className="mt-3 text-[11px] text-ink-3">串行生成，张数越多耗时越长；多张会由出词模型生成不同构图的提示词。</p>

      <div className="mt-auto pt-4">
        <ModelSelect modelId={modelId} setModelId={setModelId} />
      </div>
    </div>
  );
}

// 第二步右栏：按类型分组，确认并微调每张的提示词
function PromptDraftPanel({
  planItems,
  setPlanItems,
  totalCount,
  onRegenerate,
  onGenerate,
  busy,
}: {
  planItems: PlanItem[];
  setPlanItems: React.Dispatch<React.SetStateAction<PlanItem[] | null>>;
  totalCount: number;
  onRegenerate: () => void;
  onGenerate: () => void;
  busy: boolean;
}) {
  // 按 LISTING_TYPES 顺序分组
  const groups = LISTING_TYPES.map((t) => ({
    meta: t,
    items: planItems.filter((p) => p.listingType === t.type).sort((a, b) => a.variant - b.variant),
  })).filter((g) => g.items.length > 0);

  const [activeType, setActiveType] = useState<ListingImageType>(groups[0]?.meta.type ?? "main");
  const [cardIdx, setCardIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 分组变化时保证 activeType 有效
  useEffect(() => {
    if (!groups.find((g) => g.meta.type === activeType) && groups[0]) {
      setActiveType(groups[0].meta.type);
    }
  }, [groups, activeType]);

  const activeGroup = groups.find((g) => g.meta.type === activeType) ?? groups[0];
  const items = activeGroup?.items ?? [];

  const updatePrompt = (listingType: ListingImageType, variant: number, value: string) => {
    setPlanItems((prev) =>
      prev
        ? prev.map((it) => (it.listingType === listingType && it.variant === variant ? { ...it, prompt: value } : it))
        : prev
    );
  };

  const selectType = (type: ListingImageType) => {
    setActiveType(type);
    setCardIdx(0);
    scrollRef.current?.scrollTo({ left: 0 });
  };
  const scrollToCard = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setCardIdx(clamped);
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== cardIdx) setCardIdx(i);
  };

  return (
    <div className="flex min-h-[360px] flex-1 flex-col rounded-[20px] border border-line bg-surface/50 p-4 md:p-5 lg:min-h-0 lg:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">确认并微调提示词</p>
            <p className="text-[12px] text-ink-3">切类型、左右滑看每张，同类风格一致、构图不同</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="hidden shrink-0 items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink lg:flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          重新出词
        </button>
      </div>

      {/* 横向类型 tab 条 */}
      <div className="mt-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => {
          const active = g.meta.type === activeType;
          return (
            <button
              key={g.meta.type}
              type="button"
              onClick={() => selectType(g.meta.type)}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors",
                active ? "bg-accent-gradient text-white" : "border border-line bg-surface text-ink-2 hover:text-ink"
              )}
            >
              <span>{g.meta.label}</span>
              <span className={cn("rounded-full px-1.5 text-[10px] font-bold", active ? "bg-white/25 text-white" : "bg-surface-muted text-ink-3")}>
                {g.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 当前类型标题 + 位置 + 左右切换 */}
      <div className="mt-3 flex shrink-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[12px] font-semibold text-ink-2">
          {activeGroup?.meta.index} {activeGroup?.meta.label}
          {items.length > 1 && <span className="text-ink-3"> · 第 {cardIdx + 1}/{items.length} 张</span>}
        </span>
        {items.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToCard(cardIdx - 1)}
              disabled={cardIdx <= 0}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-brand hover:text-ink disabled:opacity-40"
              aria-label="上一张"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollToCard(cardIdx + 1)}
              disabled={cardIdx >= items.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-colors hover:border-brand hover:text-ink disabled:opacity-40"
              aria-label="下一张"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 卡片横向轮播：每卡满宽，可左右滑动 */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="mt-2 flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p) => (
          <div key={`${p.listingType}-${p.variant}`} className="flex w-full shrink-0 snap-center flex-col px-0.5">
            <div className="flex min-h-0 flex-1 flex-col rounded-[14px] border border-line bg-surface p-3">
              {items.length > 1 && (
                <label className="mb-1.5 shrink-0 text-[12px] font-semibold text-ink-2">第 {p.variant} 张</label>
              )}
              <Textarea
                value={p.prompt}
                onChange={(e) => updatePrompt(p.listingType, p.variant, e.target.value)}
                className="min-h-[180px] flex-1 resize-none rounded-[12px] text-[13px] leading-5"
              />
            </div>
          </div>
        ))}
      </div>

      {/* 桌面端生成按钮；移动端用置底操作条 */}
      <Button variant="brand" className="mt-3 hidden min-h-12 w-full shrink-0 lg:flex" onClick={onGenerate} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        确认并生成套图（{totalCount} 张）
      </Button>
    </div>
  );
}

function ListingSlot({
  meta,
  item,
  processing,
  variant,
  total,
}: {
  meta: { type: ListingImageType; index: string; label: string };
  item?: SetItem;
  processing: boolean;
  variant?: number;
  total?: number;
}) {
  const done = !!item?.processedImageUrl;
  const showVariant = (total ?? 1) > 1 && variant;
  const downloadName = showVariant
    ? `${meta.index}-${meta.label}-${variant}.jpg`
    : `${meta.index}-${meta.label}.jpg`;

  return (
    <div className="glass-panel overflow-hidden rounded-[16px] shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        {done ? (
          <>
            <ResultThumb src={item!.processedImageUrl} alt={meta.label} />
            <button
              type="button"
              onClick={() => downloadFile(item!.processedImageUrl, downloadName)}
              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-2 transition-colors hover:text-ink"
              title="下载"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-3">
            {processing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                <span className="text-[11px]">排队 / 生成中</span>
              </>
            ) : (
              <span className="flex flex-col items-center gap-1 text-danger">
                <X className="h-5 w-5" />
                <span className="text-[11px]">生成失败</span>
              </span>
            )}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {showVariant ? `第 ${variant} 张` : `${meta.index} ${meta.label}`}
        </span>
      </div>
    </div>
  );
}
