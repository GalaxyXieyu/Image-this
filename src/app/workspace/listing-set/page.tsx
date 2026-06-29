"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Sparkles, Loader2, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandImageFallback } from "@/components/brands/SpriteImage";
import { LISTING_TYPES, type ListingImageType } from "@/lib/workbench/listing-set";

interface CreatedTask {
  taskId: string;
  listingType: ListingImageType;
  label: string;
  index: string;
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
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<CreatedTask[]>([]);

  const { tasks: polledTasks, startPolling } = useWorkflowTaskPolling({ interval: 3000, autoStart: false });

  // taskId -> listingType
  const taskByType = useMemo(() => {
    const map = new Map<ListingImageType, { resultImageUrl?: string | null; status: string; progress: number }>();
    for (const ct of createdTasks) {
      const polled = polledTasks.find((p) => p.id === ct.taskId);
      map.set(ct.listingType, {
        resultImageUrl: polled?.resultImageUrl,
        status: polled?.status ?? "pending",
        progress: polled?.progress ?? 0,
      });
    }
    return map;
  }, [createdTasks, polledTasks]);

  const handlePick = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      setCreatedTasks([]);
    } catch {
      toast({ title: "读取图片失败", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!imageDataUrl) {
      toast({ title: "请先上传商品图", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; setId: string; tasks: CreatedTask[] }>("/api/listing-set", {
        imageDataUrl,
        product: { name: productName, category: productCategory },
      });
      setCreatedTasks(res.tasks);
      startPolling(res.tasks.map((t) => t.taskId));
      toast({ title: "已提交套图生成", description: `共 ${res.tasks.length} 张，生成中…` });
    } catch (err) {
      toast({ title: "提交失败", description: err instanceof Error ? err.message : "请稍后重试", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const hasResult = createdTasks.length > 0;
  const mainType = LISTING_TYPES[0];
  const restTypes = LISTING_TYPES.slice(1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-5 md:px-6 md:py-8">
        <div className="mb-5">
          <h1 className="font-serif text-[24px] leading-tight tracking-tight text-ink md:text-h2">AI 商品套图</h1>
          <p className="mt-1 text-data text-ink-2">上传一张商品图，一键生成主图 / 场景 / 模特 / 细节 / 卖点全套</p>
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
              <Button variant="brand" className="mt-auto min-h-11" onClick={handleGenerate} disabled={!imageDataUrl || submitting}>
                {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                生成套图（{LISTING_TYPES.length} 张）
              </Button>
            </div>
          </div>
        </section>

        {/* 套图结果版式：01 主图大图 + 02–05 网格 */}
        {hasResult && (
          <section className="mt-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ListingSlot meta={mainType} state={taskByType.get(mainType.type)} large />
              <div className="grid grid-cols-2 gap-3">
                {restTypes.map((t) => (
                  <ListingSlot key={t.type} meta={t} state={taskByType.get(t.type)} />
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
  state,
  large,
}: {
  meta: { type: ListingImageType; index: string; label: string };
  state?: { resultImageUrl?: string | null; status: string; progress: number };
  large?: boolean;
}) {
  const status = state?.status ?? "pending";
  const done = status === "completed" && state?.resultImageUrl;
  const failed = status === "failed" || status === "cancelled";

  return (
    <div className="glass-panel overflow-hidden rounded-[16px] shadow-soft">
      <div className={cn("relative overflow-hidden bg-surface-muted", large ? "aspect-square" : "aspect-square")}>
        {done ? (
          <>
            <ResultThumb src={state?.resultImageUrl} alt={meta.label} />
            <button
              type="button"
              onClick={() => state?.resultImageUrl && downloadFile(state.resultImageUrl, `${meta.index}-${meta.label}.jpg`)}
              className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-2 transition-colors hover:text-ink"
              title="下载"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-3">
            {failed ? (
              <span className="flex flex-col items-center gap-1 text-danger">
                <X className="h-5 w-5" />
                <span className="text-[11px]">生成失败</span>
              </span>
            ) : (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                <span className="text-[11px]">{status === "processing" ? `生成中 ${state?.progress ?? 0}%` : "排队中"}</span>
              </>
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
