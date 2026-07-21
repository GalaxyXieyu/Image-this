"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";

export type ProviderId = 'gpt' | 'gemini' | 'jimeng';
export type ModelKind = 'image' | 'llm';
export type ProviderModel = { id: string; enabled: boolean; kind?: ModelKind };

export const MODEL_KIND_LABEL: Record<ModelKind, string> = {
  image: '生图模型',
  llm: '多模态语言模型',
};

export const PROVIDER_META: Record<ProviderId, { label: string; subtitle: string; defaultModel: string; keyPlaceholder: string; defaultUrl: string }> = {
  gpt:    { label: 'OpenAI',         subtitle: 'OpenAI 兼容图像接口（多模型）',  defaultModel: 'gpt-4o-image-vip',           keyPlaceholder: 'sk-...',  defaultUrl: 'https://yunwu.ai' },
  gemini: { label: 'Google Gemini',  subtitle: 'Gemini 图像生成',      defaultModel: 'gemini-3.1-flash-image-preview', keyPlaceholder: 'AIza...', defaultUrl: 'https://toapis.com' },
  jimeng: { label: '即梦 Seedream',  subtitle: '火山引擎 Ark API',    defaultModel: 'seedream-4.5',               keyPlaceholder: 'ark-...', defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3/images/generations' },
};

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  prompt: string;
  isDefault: boolean;
  isSystem: boolean;
  activeVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number };
}

export interface PromptVersion {
  id: string;
  versionNo: number;
  label?: string | null;
  content: string;
  note?: string | null;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  BACKGROUND_REPLACE: '背景替换',
  OUTPAINT: '扩图',
  UPSCALE: '高清化',
  ONE_CLICK: '一键增强',
};

export function getProviderDisplayName(provider: 'gpt' | 'gemini' | 'jimeng') {
  if (provider === 'gpt') return 'OpenAI';
  if (provider === 'gemini') return 'Gemini';
  return '即梦';
}

export function mapModelRequestError(provider: 'gpt' | 'gemini' | 'jimeng', message: string) {
  const providerName = getProviderDisplayName(provider);
  const normalized = message.toLowerCase();

  if (
    normalized.includes('unsupported operation') ||
    normalized.includes('requested operation is unsupported') ||
    normalized.includes('does not support image')
  ) {
    return `${providerName} 当前接口不支持图片能力，请确认 Base URL 指向兼容的图片接口，并使用支持的模型。`;
  }

  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('invalid token')) {
    return `${providerName} 的 API Key 无效、已过期，或没有对应权限。`;
  }

  if (normalized.includes('404')) {
    return `${providerName} 的接口地址不存在，请检查 Base URL 是否填写正确。`;
  }

  if (normalized.includes('429')) {
    return `${providerName} 当前请求过于频繁，或账户额度已经用尽。`;
  }

  if (normalized.includes('500')) {
    return `${providerName} 服务端暂时异常，请稍后再试。`;
  }

  if (normalized.includes('timeout') || normalized.includes('aborted')) {
    return `${providerName} 请求超时，请检查网络或接口地址后重试。`;
  }

  if (
    normalized.includes('fetch failed') ||
    normalized.includes('network') ||
    normalized.includes('econnrefused') ||
    normalized.includes('enotfound')
  ) {
    return `${providerName} 无法连接，请检查 Base URL、网络或代理设置。`;
  }

  return message;
}

export function SearchableModelSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-h-11 w-full justify-between"
          disabled={disabled}
        >
          {value || placeholder || '选择模型...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模型..."
            className="h-11 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 md:h-9"
          />
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-data text-muted-foreground">无匹配模型</div>
          ) : (
            filtered.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setSearch('');
                }}
                className={`min-h-11 cursor-pointer px-3 py-2.5 text-data hover:bg-muted ${value === option ? 'bg-muted font-medium' : ''}`}
              >
                {option}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

