"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  Wand2,
  ShoppingBag,
  Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3;

function StepBar({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: "填写产品信息" },
    { num: 2, label: "选择风格模板" },
    { num: 3, label: "生成与调整" },
  ];

  return (
    <div className="h-16 border-b border-border bg-background flex items-center justify-center gap-8 px-8 shrink-0">
      {steps.map((s, i) => {
        const isActive = currentStep === s.num;
        const isCompleted = currentStep > s.num;
        return (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[13px]",
                isActive || isCompleted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span
              className={cn(
                "text-sm",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-border ml-2" />
            )}
          </div>
        );
      })}
    </div>
  );
}

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

function ProductInfoStep({ onNext }: { onNext: () => void }) {
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");

  const platforms = [
    { id: "taobao", label: "淘宝/天猫" },
    { id: "jd", label: "京东" },
    { id: "pdd", label: "拼多多" },
    { id: "douyin", label: "抖音" },
    { id: "xiaohongshu", label: "小红书" },
    { id: "wechat", label: "微信小程序" },
  ];

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              产品基础信息
            </h2>
            <p
              className="text-sm text-muted-foreground"
              style={{ fontFamily: "Geist, sans-serif" }}
            >
              请尽可能详细地描述你的产品，AI 会根据这些信息生成最合适的场景图
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>产品名称</Label>
                <Input
                  placeholder="例如：某某品牌保湿面霜"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>产品类型</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger style={{ fontFamily: "Geist, sans-serif" }}>
                    <SelectValue placeholder="选择产品类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beauty">美妆护肤</SelectItem>
                    <SelectItem value="food">食品饮料</SelectItem>
                    <SelectItem value="clothing">服装服饰</SelectItem>
                    <SelectItem value="electronics">3C 数码</SelectItem>
                    <SelectItem value="home">家居用品</SelectItem>
                    <SelectItem value="baby">母婴用品</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>目标人群</Label>
                <Input
                  placeholder="例如：25-35 岁女性"
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
              <div className="space-y-2">
                <Label style={{ fontFamily: "Inter, sans-serif" }}>使用场景</Label>
                <Input
                  placeholder="例如：日常护肤"
                  style={{ fontFamily: "Geist, sans-serif" }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label style={{ fontFamily: "Inter, sans-serif" }}>核心卖点</Label>
              <Textarea
                placeholder="请列出产品的核心卖点..."
                rows={3}
                style={{ fontFamily: "Geist, sans-serif" }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              使用平台
            </h2>
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <label
                  key={platform.id}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                    selectedPlatforms.includes(platform.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <Checkbox
                    checked={selectedPlatforms.includes(platform.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      } else {
                        setSelectedPlatforms(
                          selectedPlatforms.filter((p) => p !== platform.id)
                        );
                      }
                    }}
                  />
                  <span className="text-sm" style={{ fontFamily: "Geist, sans-serif" }}>
                    {platform.label}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <h2
              className="text-lg font-semibold text-foreground"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              参考图上传
            </h2>
            <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 hover:border-muted-foreground transition-colors cursor-pointer">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
                  点击或拖拽上传图片
                </p>
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                  支持 PNG、JPG，单张不超过 10MB
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button
          variant="ghost"
          asChild
          className="text-muted-foreground"
          style={{ fontFamily: "Geist, sans-serif" }}
        >
          <Link href="/templates">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回模板库
          </Link>
        </Button>
        <Button
          onClick={onNext}
          className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          下一步：选择风格模板
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function StyleTemplateStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const templates = [
    { id: "elegant", name: "简约自然", desc: "适合美妆护肤", icon: ShoppingBag },
    { id: "lifestyle", name: "生活场景", desc: "适合家居日用", icon: ShoppingBag },
    { id: "minimal", name: "极简商务", desc: "适合3C数码", icon: ShoppingBag },
    { id: "warm", name: "温馨居家", desc: "适合母婴用品", icon: ShoppingBag },
    { id: "fresh", name: "清新自然", desc: "适合食品饮料", icon: ShoppingBag },
    { id: "luxury", name: "奢华高端", desc: "适合珠宝配饰", icon: ShoppingBag },
    { id: "tech", name: "科技感", desc: "适合数码产品", icon: ShoppingBag },
    { id: "festival", name: "节日氛围", desc: "适合节日促销", icon: ShoppingBag },
  ];

  const [selected, setSelected] = useState<string[]>([]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                AI 生成预览
              </h2>
              <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                基于已提交的商品信息，AI 自动生成预览图
              </p>
            </div>
            <Badge variant="secondary" className="bg-muted" style={{ fontFamily: "Geist, sans-serif" }}>
              已选 {selected.length} 张
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-5">
            {templates.map((template) => {
              const isSelected = selected.includes(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelected(selected.filter((s) => s !== template.id));
                    } else {
                      setSelected([...selected, template.id]);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center p-6 rounded-xl border transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  )}
                >
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <template.icon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                    {template.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    {template.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回修改信息
        </Button>
        <Button
          onClick={onNext}
          disabled={selected.length === 0}
          className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          下一步：生成并调整
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function GenerateAdjustStep({ onBack }: { onBack: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ id: string; name: string; status: string }[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiPost<{ success: boolean; task: { id: string } }>("/api/tasks", {
        type: "SCENE_GENERATION",
        inputData: JSON.stringify({
          prompt: "生成商品场景图",
          style: "elegant",
          count: 4,
        }),
        totalSteps: 4,
      });
      setTaskId(res.task.id);
      setResults([
        { id: "1", name: "简约自然风格", status: "pending" },
        { id: "2", name: "生活场景风格", status: "pending" },
        { id: "3", name: "极简商务风格", status: "pending" },
        { id: "4", name: "温馨居家风格", status: "pending" },
      ]);
      // Poll for completion
      const poll = setInterval(async () => {
        const statusRes = await fetch(`/api/tasks/${res.task.id}`, { credentials: "same-origin" });
        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.task?.status === "COMPLETED" || data.task?.status === "FAILED") {
            clearInterval(poll);
            setResults((prev) => prev.map((r) => ({ ...r, status: "done" })));
            setGenerating(false);
          }
        }
      }, 3000);
      // Auto-clear after 30s to avoid hanging
      setTimeout(() => { clearInterval(poll); setGenerating(false); }, 30000);
    } catch {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Wand2 className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                准备生成
              </h2>
              <p className="text-sm text-muted-foreground mt-2 mb-6" style={{ fontFamily: "Geist, sans-serif" }}>
                点击开始生成，AI 将为你创建多套场景图
              </p>
              <Button
                onClick={handleGenerate}
                className="bg-[#0066FF] hover:bg-[#0052CC] text-white"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                开始生成
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                    生成结果
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1" style={{ fontFamily: "Geist, sans-serif" }}>
                    {generating ? "正在生成中，请稍候..." : "生成完成，选择喜欢的图片保存或调整"}
                  </p>
                </div>
                {!generating && (
                  <Button variant="outline" onClick={handleGenerate} style={{ fontFamily: "Inter, sans-serif" }}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-4 gap-5">
                {results.map((result) => (
                  <div key={result.id} className="flex flex-col rounded-xl border border-border overflow-hidden">
                    <div className="h-40 bg-muted flex items-center justify-center">
                      {result.status === "pending" ? (
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>
                        {result.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1" style={{ fontFamily: "Geist, sans-serif" }}>
                          预览
                        </Button>
                        <Button size="sm" className="flex-1 bg-[#0066FF] hover:bg-[#0052CC] text-white" style={{ fontFamily: "Geist, sans-serif" }}>
                          保存
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="h-16 border-t border-border px-8 flex items-center justify-between shrink-0 bg-background">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground" style={{ fontFamily: "Geist, sans-serif" }}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回预览
        </Button>
        <Button asChild variant="outline" style={{ fontFamily: "Inter, sans-serif" }}>
          <Link href="/templates">完成，返回模板库</Link>
        </Button>
      </div>
    </div>
  );
}

export default function SceneWorkspacePage() {
  const [step, setStep] = useState<Step>(1);

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopNav />
      <StepBar currentStep={step} />
      {step === 1 && <ProductInfoStep onNext={() => setStep(2)} />}
      {step === 2 && <StyleTemplateStep onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <GenerateAdjustStep onBack={() => setStep(2)} />}
    </div>
  );
}
