"use client";

import { cn } from "@/lib/utils";
import { Cpu, Plus, ChevronRight } from "lucide-react";
import {
  type ProviderId,
  type ProviderModel,
  MODEL_KIND_LABEL,
  PROVIDER_META,
} from "@/components/settings/model-select";

export function SettingsModelsSection({
  providerModels,
  setModalProvider,
}: {
  providerModels: Record<ProviderId, ProviderModel[]>;
  setModalProvider: (provider: ProviderId | null) => void;
}) {
        const providerIds: ProviderId[] = ['gpt', 'gemini', 'jimeng'];
        const flatModels = providerIds.flatMap((p) =>
          (providerModels[p] ?? []).map((m) => ({ provider: p, ...m }))
        );
        const providerCount = providerIds.filter((p) => providerModels[p]?.length > 0).length;
        return (
          <div className="space-y-6">
            {/* 统计行 */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <h2 className="text-[17px] font-bold leading-tight text-ink sm:font-serif sm:text-h3 sm:tracking-tight">AI 模型配置</h2>
                <p className="mt-1 hidden text-data text-ink-3 sm:block">每张卡片是一个模型，点击可配置其 Provider 的接口与密钥</p>
              </div>
              <div className="text-[12px] text-ink-3 sm:text-data">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {providerCount} 个 Provider · {flatModels.length} 个模型
                </span>
              </div>
            </div>

            {/* 模型卡片网格 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {flatModels.map((m, idx) => {
                const meta = PROVIDER_META[m.provider];
                return (
                  <button
                    key={`${m.provider}-${m.id}-${idx}`}
                    onClick={() => setModalProvider(m.provider)}
                    className="glass-panel group flex min-h-[132px] flex-col gap-3 rounded-[16px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-float"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-2">
                          <Cpu className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          m.kind === 'llm' ? "bg-brand/10 text-brand-text" : "bg-surface-muted text-ink-3"
                        )}>
                          {MODEL_KIND_LABEL[m.kind ?? 'image']}
                        </span>
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        m.enabled ? "bg-success/10 text-success" : "bg-surface-muted text-ink-3"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", m.enabled ? "bg-success" : "bg-ink-3")} />
                        {m.enabled ? '已启用' : '已停用'}
                      </span>
                    </div>
                    <div className="font-mono text-[13px] font-semibold text-ink truncate">{m.id}</div>
                    <div className="mt-auto inline-flex items-center justify-end text-[12px] font-medium text-brand-text">
                      配置 <ChevronRight className="ml-0.5 h-3 w-3" />
                    </div>
                  </button>
                );
              })}
              {/* 新增模型卡：常驻。优先打开未配置的 Provider，否则进入已有 Provider 继续加模型 */}
              <button
                onClick={() => {
                  const empty = providerIds.find((p) => (providerModels[p] ?? []).length === 0);
                  setModalProvider(empty || providerIds[0]);
                }}
                className="flex min-h-[132px] flex-col items-center justify-center gap-2 rounded-[16px] border-2 border-dashed border-border/60 bg-transparent text-ink-3 transition-colors hover:border-brand hover:text-brand-text"
              >
                <Plus className="h-6 w-6" />
                <span className="text-[13px] font-medium">新增模型</span>
              </button>
            </div>

            {flatModels.length === 0 && (
              <p className="hidden text-data text-ink-3 sm:block">尚未配置任何模型，点击右上「新增 Provider」开始</p>
            )}

            <p className="text-[12px] text-ink-3">
              提示：每个模型可设为「生图模型」或「多模态语言模型」。多模态语言模型用于「AI 商品套图」读图生成提示词（OpenAI 兼容 chat），在模型配置弹窗中切换类型即可。
            </p>
          </div>
        );
}
