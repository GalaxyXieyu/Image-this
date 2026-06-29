"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Sparkles, Loader2, X, Download, Wand2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BrandImageFallback } from "@/components/brands/SpriteImage";
import { LISTING_TYPES, type ListingImageType } from "@/lib/workbench/listing-set";

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
  const [submitting, setSubmitting] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planItems, setPlanItems] = useState<PlanItem[] | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [setStatus, setSetStatus] = useState<SetStatus | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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
        product: { name: productName, category: productCategory },
      });
      setPlanItems(res.items);
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
    setSubmitting(true);
    try {
      const prompts = planItems
        ? Object.fromEntries(planItems.filter((p) => p.prompt.trim()).map((p) => [p.listingType, p.prompt.trim()]))
        : undefined;
      const res = await apiPost<{ success: boolean; taskId: string; setId: string }>("/api/listing-set", {
        imageDataUrl,
        product: { name: productName, category: productCategory },
        prompts,
      });
      setTaskId(res.taskId);
      setSetStatus({ status: "pending", progress: 0, results: [] });
      startPolling(res.taskId);
      toast({ title: "已提交套图生成", description: "逐张串行生成中…" });
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
  const mainType = LISTING_TYPES[0];
  const restTypes = LISTING_TYPES.slice(1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-5">
          <h1 className="font-serif text-[24px] leading-tight tracking-tight text-ink md:text-h2">AI 商品套图</h1>
          <p className="mt-1 text-data text-ink-2">上传一张商品图，逐张串行生成主图 / 场景 / 模特 / 细节 / 卖点全套</p>
        </div>

        {/* 上传 + 信息 */}
        <section className="glass-panel rounded-[18px] p-4 shadow-soft">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePick(e.target.files?.[0])}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] border-2 border-dashed border-line-strong bg-surface-muted/40 transition-colors hover:border-brand sm:w-40"
            >
              {imageDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageDataUrl} alt="商品图" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1.5 text-ink-3">
                  <ImagePlus className="h-7 w-7" />
                  <span className="text-[12px]">上传商品图</span>
                </span>
              )}
            </button>
            <div className="flex flex-1 flex-col gap-2.5">
              <Input placeholder="商品名称（可选）" value={productName} onChange={(e) => setProductName(e.target.value)} className="h-11 rounded-[12px]" />
              <Input placeholder="品类，如 美妆/3C/食品（可选）" value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className="h-11 rounded-[12px]" />
              <div className="mt-auto flex flex-col gap-1.5">
                <Button variant="brand" className="min-h-11" onClick={handlePlan} disabled={!imageDataUrl || planning || processing}>
                  {planning ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                  AI 读图出词
                </Button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!imageDataUrl || submitting || processing}
                  className="text-[12px] text-ink-3 transition-colors hover:text-ink disabled:opacity-50"
                >
                  跳过出词，用模板直接生成
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 出词草稿：可逐条微调后确认生成 */}
        {planItems && !taskId && (
          <section className="mt-4 glass-panel rounded-[18px] p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-ink">提示词草稿</h2>
              <button
                type="button"
                onClick={() => setPlanItems(null)}
                className="flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                重新出词
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {planItems.map((p, idx) => (
                <div key={p.listingType} className="space-y-1">
                  <label className="text-[12px] font-semibold text-ink-2">{p.index} {p.label}</label>
                  <Textarea
                    rows={2}
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
            <Button variant="brand" className="mt-3 min-h-11 w-full" onClick={handleGenerate} disabled={submitting || processing}>
              {submitting || processing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              确认并生成套图（{LISTING_TYPES.length} 张）
            </Button>
          </section>
        )}

        {/* 进度条 */}
        {hasResult && processing && (
          <div className="mt-4 flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-2.5">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
            <span className="text-[13px] text-ink-2">
              {setStatus?.currentStep || "生成中"} · {setStatus?.results.length ?? 0}/{LISTING_TYPES.length}
            </span>
          </div>
        )}
        {hasResult && setStatus?.status === "failed" && setStatus.results.length === 0 && (
          <div className="mt-4 rounded-[14px] border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">
            生成失败：{setStatus.errorMessage || "请检查 provider 额度或密钥后重试"}
          </div>
        )}

        {/* 套图结果版式：01 主图大图 + 02–05 网格 */}
        {hasResult && (
          <section className="mt-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ListingSlot meta={mainType} item={resultByType.get(mainType.type)} processing={processing} />
              <div className="grid grid-cols-2 gap-3">
                {restTypes.map((t) => (
                  <ListingSlot key={t.type} meta={t} item={resultByType.get(t.type)} processing={processing} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
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
