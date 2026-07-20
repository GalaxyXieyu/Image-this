"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api-client";

type PromptCategory = "BACKGROUND_REPLACE" | "OUTPAINT" | "UPSCALE" | "ONE_CLICK";

type PromptTemplate = {
  id: string;
  name: string;
  category: PromptCategory;
  prompt: string;
  activeVersionId?: string | null;
  _count?: { versions: number };
};

type PromptVersion = {
  id: string;
  versionNo: number;
  content: string;
  label?: string | null;
};

export function PromptTemplateSelector({
  category,
  value,
  placeholder,
  onChange,
}: {
  category: PromptCategory;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId),
    [selectedTemplateId, templates]
  );

  useEffect(() => {
    let cancelled = false;
    void apiGet<{ templates: PromptTemplate[] }>(`/api/prompt-templates?category=${category}`)
      .then((response) => {
        if (!cancelled) setTemplates(response.templates || []);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    if (!selectedTemplateId) {
      setVersions([]);
      setSelectedVersionId("");
      return;
    }
    let cancelled = false;
    void apiGet<{ versions: PromptVersion[]; activeVersionId?: string | null }>(
      `/api/prompt-templates/${selectedTemplateId}/versions`
    )
      .then((response) => {
        if (cancelled) return;
        const nextVersions = response.versions || [];
        setVersions(nextVersions);
        const active = response.activeVersionId || nextVersions[0]?.id || "";
        setSelectedVersionId(active);
        const activeVersion = nextVersions.find((version) => version.id === active);
        if (activeVersion) onChangeRef.current(activeVersion.content);
      })
      .catch(() => {
        if (!cancelled) setVersions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = templates.find((item) => item.id === templateId);
    if (template) onChange(template.prompt);
  };

  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId);
    const version = versions.find((item) => item.id === versionId);
    if (version) onChange(version.content);
  };

  const saveAsNewTemplate = async () => {
    const name = saveName.trim();
    if (!name || !value.trim()) return;
    setSaving(true);
    try {
      const response = await apiPost<{ template: PromptTemplate }>("/api/prompt-templates", {
        name,
        category,
        prompt: value.trim(),
      });
      setTemplates((current) => [response.template, ...current]);
      setSelectedTemplateId(response.template.id);
      setSaveName("");
    } finally {
      setSaving(false);
    }
  };

  const saveNewVersion = async () => {
    if (!selectedTemplateId || !value.trim()) return;
    setSaving(true);
    try {
      const response = await apiPost<{ version: PromptVersion }>(
        `/api/prompt-templates/${selectedTemplateId}/versions`,
        { content: value.trim(), activate: true }
      );
      setVersions((current) => [response.version, ...current]);
      setSelectedVersionId(response.version.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedTemplateId}
          onChange={(event) => handleTemplateChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 text-[12px] text-ink"
        >
          <option value="">选择设置中的提示词模板</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}（{template._count?.versions ?? 0} 个版本）
            </option>
          ))}
        </select>
        {selectedTemplate && versions.length > 0 && (
          <select
            value={selectedVersionId}
            onChange={(event) => handleVersionChange(event.target.value)}
            className="h-10 rounded-[10px] border border-line bg-surface px-3 text-[12px] text-ink"
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                v{version.versionNo}{version.label ? ` · ${version.label}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-none text-[13px]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={saveName}
          onChange={(event) => setSaveName(event.target.value)}
          placeholder="新模板名称"
          className="h-9 min-w-40 flex-1 rounded-[10px] text-[12px]"
        />
        <Button type="button" variant="outline" size="sm" disabled={saving || !saveName.trim() || !value.trim()} onClick={() => void saveAsNewTemplate()}>
          另存为模板
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={saving || !selectedTemplateId || !value.trim()} onClick={() => void saveNewVersion()}>
          保存新版本
        </Button>
      </div>
    </div>
  );
}
