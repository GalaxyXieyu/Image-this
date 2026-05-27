"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useUpload } from "@/lib/use-upload";
import { useImageProcess } from "@/lib/use-image-process";
import {
  Image as ImageIcon,
  Wand2,
  Expand,
  ZoomIn,
  Upload,
  Download,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";

const TOOL_TABS = [
  { id: "background", label: "AI换背景", icon: Wand2 },
  { id: "remove-bg", label: "智能抠图", icon: ImageIcon },
  { id: "outpaint", label: "扩图", icon: Expand },
  { id: "upscale", label: "高清放大", icon: ZoomIn },
];

function TopNav() {
  return (
    <header className="h-16 border-b border-border px-8 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0066FF]" />
        <span
          className="text-base font-semibold text-foreground"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          AI 商品视觉工作台
        </span>
      </div>
      <nav className="flex items-center gap-6">
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
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          任务中心
        </Link>
      </nav>
    </header>
  );
}

const TAB_TO_TYPE: Record<string, string> = {
  background: "background-replace",
  "remove-bg": "background-replace",
  outpaint: "outpaint",
  upscale: "enhance",
};

export default function ToolboxPage() {
  const [activeTab, setActiveTab] = useState("background");
  const [batchMode, setBatchMode] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useUpload();
  const { process: processImage, processing, result, error: processError, reset } = useImageProcess();

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      reset();
      setResultUrl(null);
      try {
        const res = await upload({ input: file });
        if (res.inputAsset?.clientUrl) {
          setImageUrl(res.inputAsset.clientUrl);
        }
      } catch {
        // error handled in hook
      }
    },
    [upload, reset]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      reset();
      setResultUrl(null);
      try {
        const res = await upload({ input: file });
        if (res.inputAsset?.clientUrl) {
          setImageUrl(res.inputAsset.clientUrl);
        }
      } catch {
        // error handled in hook
      }
    },
    [upload, reset]
  );

  const handleProcess = async () => {
    if (!imageUrl) return;
    reset();
    const type = TAB_TO_TYPE[activeTab] as "background-replace" | "enhance" | "outpaint" | "watermark";
    try {
      const res = await processImage({
        type,
        imageUrl,
      });
      if (res.processedUrl || res.imageData) {
        setResultUrl(res.processedUrl || res.imageData || null);
      }
    } catch {
      // error handled in hook
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `processed-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopNav />

      {/* Header */}
      <div className="px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            智能工具箱
          </h1>
          <p
            className="text-sm text-muted-foreground mt-0.5"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            选择工具类型，上传图片开始处理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            批量模式
          </Label>
          <Switch checked={batchMode} onCheckedChange={setBatchMode} />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-8 border-b border-border shrink-0">
        <div className="flex gap-1">
          {TOOL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-[300px] border-r border-border bg-muted/30 flex flex-col overflow-y-auto">
          <div className="p-5 space-y-6">
            {/* Upload */}
            <section>
              <h3
                className="text-sm font-semibold text-foreground mb-3"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                上传图片
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              {!imageUrl ? (
                <div
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-muted-foreground transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {uploading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                  <p
                    className="text-sm text-muted-foreground text-center"
                    style={{ fontFamily: "Geist, sans-serif" }}
                  >
                    {uploading ? "上传中..." : "点击或拖拽上传图片"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="上传图片"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setImageUrl(null);
                      setResultUrl(null);
                      reset();
                    }}
                  >
                    重新上传
                  </Button>
                </div>
              )}
            </section>

            {/* Tool Params */}
            <section>
              <h3
                className="text-sm font-semibold text-foreground mb-3"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {activeTab === "background"
                  ? "背景选择"
                  : activeTab === "remove-bg"
                  ? "抠图设置"
                  : activeTab === "outpaint"
                  ? "扩图参数"
                  : "放大参数"}
              </h3>

              {activeTab === "background" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: "Geist, sans-serif" }}>
                      风格强度
                    </Label>
                    <Slider defaultValue={[60]} max={100} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>自然</span>
                      <span>强烈</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label style={{ fontFamily: "Geist, sans-serif" }}>
                      自动优化
                    </Label>
                    <Switch checked={true} />
                  </div>
                </div>
              )}

              {activeTab === "upscale" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: "Geist, sans-serif" }}>
                      放大倍数
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {["2x", "4x", "8x"].map((v) => (
                        <button
                          key={v}
                          className="px-3 py-2 rounded-lg border border-border text-sm hover:border-primary transition-colors"
                          style={{ fontFamily: "Geist, sans-serif" }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 bg-muted flex items-center justify-center p-8 overflow-auto">
          {!imageUrl ? (
            <div className="text-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                请先上传图片
              </p>
            </div>
          ) : processing ? (
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                处理中...
              </p>
            </div>
          ) : resultUrl ? (
            <div className="w-full max-w-2xl aspect-square bg-card rounded-xl border border-border overflow-hidden shadow-sm relative">
              <img src={resultUrl} alt="处理结果" className="w-full h-full object-contain" />
              <button
                onClick={() => setResultUrl(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-full max-w-2xl aspect-square bg-card rounded-xl border border-border flex items-center justify-center shadow-sm relative overflow-hidden">
              <img src={imageUrl} alt="原图" className="w-full h-full object-contain" />
            </div>
          )}
        </main>

        {/* Right Panel */}
        <aside className="w-[320px] border-l border-border flex flex-col">
          <div className="p-5 space-y-6">
            <section>
              <h3
                className="text-sm font-semibold text-foreground mb-3"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                调整参数
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label style={{ fontFamily: "Geist, sans-serif" }}>
                    亮度
                  </Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label style={{ fontFamily: "Geist, sans-serif" }}>
                    对比度
                  </Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
                <div className="space-y-2">
                  <Label style={{ fontFamily: "Geist, sans-serif" }}>
                    饱和度
                  </Label>
                  <Slider defaultValue={[50]} max={100} step={1} />
                </div>
              </div>
            </section>

            <div className="pt-4 space-y-3">
              <Button
                className="w-full bg-[#0066FF] hover:bg-[#0052CC] text-white"
                disabled={!imageUrl || processing}
                onClick={handleProcess}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {processing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {processing ? "处理中..." : "应用效果"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!resultUrl}
                onClick={handleDownload}
                style={{ fontFamily: "Geist, sans-serif" }}
              >
                <Download className="w-4 h-4 mr-2" />
                下载
              </Button>
              {processError && (
                <p className="text-xs text-destructive text-center">{processError}</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
