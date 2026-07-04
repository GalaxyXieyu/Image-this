"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, Loader2, X, Download, Wand2, ArrowLeft, Check } from "lucide-react";
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

// 出图模型：复用场景生成模型，排除 service 未接线的 volcengine
const IMAGE_MODELS = getSceneGenerationModels().filter((m) => m.provider !== "volcengine");
const DEFAULT_MODEL_ID = IMAGE_MODELS[0]?.id ?? "gemini-3.1-flash-image-preview";

interface PlanItem {
  listingType: ListingImageType;
  index: string;
  label: string;
  prompt: string;
}

interface SetItem {
  listingType: string;
  index: string;
  label: string;
  processedImageUrl: string;
}

interface SetStatus {
  status: string;
  progress: number;
  currentStep?: string | null;
  errorMessage?: string | null;
  results: SetItem[];
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
  const [selectedTypes, setSelectedTypes] = useState<ListingImageType[]>(
    LISTING_TYPES.map((t) => t.type)
  );
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [copywriterModels, setCopywriterModels] = useState<{ id: string; provider: string }[]>([]);
  const [copywriterModelId, setCopywriterModelId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planItems, setPlanItems] = useState<PlanItem[] | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [setStatus, setSetStatus] = useState<SetStatus | null>(null);

  const toggleType = (type: ListingImageType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // 至少保留一类
        return prev.filter((t) => t !== type);
      }
      // 保持与 LISTING_TYPES 相同顺序
      return LISTING_TYPES.filter((t) => prev.includes(t.type) || t.type === type).map((t) => t.type);
    });
  };

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

  // 第一步：AI 读图出 5 段提示词草稿，供确认/微调
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
        model: copywriterModelId || undefined,
      });
      // 只保留当前选中的类型，供逐条微调
      setPlanItems(res.items.filter((it) => selectedTypes.includes(it.listingType)));
      toast({ title: "已生成提示词草稿", description: "可逐条微调后再生成" });
    } catch (err) {
      toast({ title: "出词失败", description: err instanceof Error ? err.message : "请检查文案模型配置", variant: "destructive" });
    } finally {
      setPlanning(false);
    }
  };

  // 第二步：用确认后的提示词串行生成套图
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
      const prompts = planItems
        ? Object.fromEntries(
            planItems
              .filter((p) => p.prompt.trim() && selectedTypes.includes(p.listingType))
              .map((p) => [p.listingType, p.prompt.trim()])
          )
        : undefined;
      const model = IMAGE_MODELS.find((m) => m.id === modelId);
      const res = await apiPost<{ success: boolean; taskId: string; setId: string }>("/api/listing-set", {
        imageDataUrl,
        product: { name: productName, category: productCategory, sellingPoints },
        types: selectedTypes,
        provider: model?.provider ?? "gemini",
        modelName: model?.id,
        prompts,
      });
      setTaskId(res.taskId);
      setSetStatus({ status: "pending", progress: 0, results: [] });
      startPolling(res.taskId);
      toast({ title: "已提交套图生成", description: `逐张串行生成 ${selectedTypes.length} 张…` });
    } catch (err) {
      toast({ title: "提交失败", description: err instanceof Error ? err.message : "请稍后重试", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resultByType = new Map<string, SetItem>();
  for (const r of setStatus?.results ?? []) resultByType.set(r.listingType, r);

  const hasResult = !!taskId;
  const processing = setStatus ? !["completed", "failed", "cancelled"].includes(setStatus.status) : false;
  // 结果仅展示实际选中的类型
  const selectedMetas = LISTING_TYPES.filter((t) => selectedTypes.includes(t.type));
  const mainMeta = selectedMetas.find((t) => t.type === "main");
  const restMetas = selectedMetas.filter((t) => t.type !== "main");

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-6 lg:max-w-[1360px]">
        {/* 步骤条：整幅居中 */}
        <div className="mb-4 flex shrink-0 justify-center">
          <StepHint hasPlan={!!planItems} hasResult={hasResult} />
        </div>

        {/* 桌面：左控制 / 右结果 双栏；移动端：单列堆叠 */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:grid lg:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden">
          {/* 左：控制区 */}
          <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* 上传 + 信息（填满左栏高度，按钮固定底部） */}
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
                    <Button variant="brand" className="min-h-11" onClick={handlePlan} disabled={!imageDataUrl || planning || processing}>
                      {planning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                      AI 读图出词
                    </Button>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={!imageDataUrl || submitting || processing}
                      className="min-h-10 rounded-[12px] border border-line-strong bg-surface text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
                    >
                      跳过出词，用当前配置直接生成
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 进度条 */}
            {hasResult && processing && (
              <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
                <span className="text-[13px] text-ink-2">
                  {setStatus?.currentStep || "生成中"} · {setStatus?.results.length ?? 0}/{selectedTypes.length}
                </span>
              </div>
            )}
            {hasResult && setStatus?.status === "failed" && setStatus.results.length === 0 && (
              <div className="rounded-[14px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
                生成失败：{setStatus.errorMessage || "请检查 provider 额度或密钥后重试"}
              </div>
            )}
          </div>

          {/* 右：结果区 */}
          <div className="flex min-h-0 flex-col lg:h-full lg:overflow-hidden">
            {hasResult ? (
              <section className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {mainMeta && (
                    <ListingSlot meta={mainMeta} item={resultByType.get(mainMeta.type)} processing={processing} />
                  )}
                  {restMetas.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {restMetas.map((t) => (
                        <ListingSlot key={t.type} meta={t} item={resultByType.get(t.type)} processing={processing} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : planItems ? (
              <PromptDraftPanel
                planItems={planItems}
                setPlanItems={setPlanItems}
                selectedCount={selectedTypes.length}
                onRegenerate={() => setPlanItems(null)}
                onGenerate={handleGenerate}
                busy={submitting || processing}
              />
            ) : (
              <ListingConfigPanel
                selectedTypes={selectedTypes}
                toggleType={toggleType}
                modelId={modelId}
                setModelId={setModelId}
              />
            )}
          </div>
        </div>
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

// 第一步右栏：选择要生成的图（= 张数）+ 出图模型
function ListingConfigPanel({
  selectedTypes,
  toggleType,
  modelId,
  setModelId,
}: {
  selectedTypes: ListingImageType[];
  toggleType: (type: ListingImageType) => void;
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
            <p className="text-[12px] text-ink-3">勾选类型即为生成张数，逐张串行出图</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-bold text-brand-text">
          已选 {selectedTypes.length} 张
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {LISTING_TYPES.map((t) => {
          const selected = selectedTypes.includes(t.type);
          return (
            <button
              key={t.type}
              type="button"
              onClick={() => toggleType(t.type)}
              className={cn(
                "flex items-start gap-2.5 rounded-[14px] border p-3 text-left transition-all",
                selected
                  ? "border-brand bg-brand-soft/30 shadow-soft"
                  : "border-line bg-surface hover:border-line-strong"
              )}
            >
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
                <span className="mt-1 line-clamp-2 block text-[12px] leading-4 text-ink-3">{t.rule}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4">
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
    </div>
  );
}

// 第二步右栏：确认并微调 AI 出的提示词
function PromptDraftPanel({
  planItems,
  setPlanItems,
  selectedCount,
  onRegenerate,
  onGenerate,
  busy,
}: {
  planItems: PlanItem[];
  setPlanItems: React.Dispatch<React.SetStateAction<PlanItem[] | null>>;
  selectedCount: number;
  onRegenerate: () => void;
  onGenerate: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex min-h-[340px] flex-1 flex-col rounded-[20px] border border-line bg-surface/50 p-4 md:p-5 lg:min-h-0 lg:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink">确认并微调提示词</p>
            <p className="text-[12px] text-ink-3">每类一段，可逐条修改后再生成</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex shrink-0 items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition-colors hover:border-brand hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          重新出词
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {planItems.map((p, idx) => (
          <div key={p.listingType} className="space-y-1.5 rounded-[14px] border border-line bg-surface p-3">
            <label className="text-[12px] font-semibold text-ink-2">{p.index} {p.label}</label>
            <Textarea
              rows={3}
              value={p.prompt}
              onChange={(e) =>
                setPlanItems((prev) =>
                  prev ? prev.map((it, i) => (i === idx ? { ...it, prompt: e.target.value } : it)) : prev
                )
              }
              className="resize-none rounded-[12px] text-[13px]"
            />
          </div>
        ))}
      </div>

      <Button variant="brand" className="mt-3 min-h-12 w-full shrink-0" onClick={onGenerate} disabled={busy}>
        {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
        确认并生成套图（{selectedCount} 张）
      </Button>
    </div>
  );
}

function ListingSlot({
  meta,
  item,
  processing,
}: {
  meta: { type: ListingImageType; index: string; label: string };
  item?: SetItem;
  processing: boolean;
}) {
  const done = !!item?.processedImageUrl;

  return (
    <div className="glass-panel overflow-hidden rounded-[16px] shadow-soft">
      <div className="relative aspect-square overflow-hidden bg-surface-muted">
        {done ? (
          <>
            <ResultThumb src={item.processedImageUrl} alt={meta.label} />
            <button
              type="button"
              onClick={() => downloadFile(item.processedImageUrl, `${meta.index}-${meta.label}.jpg`)}
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
              <span className="flex flex-col items-center gap-1 text-ink-3">
                <X className="h-5 w-5" />
                <span className="text-[11px]">未生成</span>
              </span>
            )}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          {meta.index} {meta.label}
        </span>
      </div>
    </div>
  );
}
