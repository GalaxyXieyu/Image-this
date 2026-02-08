"use client";

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VIDEO_STYLE_TEMPLATES, VideoStyleTemplate } from '@/lib/video-style-templates';

interface VideoPromptSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

export default function VideoPromptSelector({
  value,
  onChange,
  label = '视频生成提示词',
  description = '选择预设风格或自定义提示词',
}: VideoPromptSelectorProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<string>('product-showcase');
  const [editedPrompt, setEditedPrompt] = useState(value);

  // 初始化时根据 value 匹配模板
  useEffect(() => {
    if (value) {
      const matchedTemplate = VIDEO_STYLE_TEMPLATES.find(t => t.prompt === value);
      if (matchedTemplate) {
        setSelectedStyleId(matchedTemplate.id);
      } else {
        // 如果没有匹配到,设置为自定义
        setSelectedStyleId('custom');
      }
      setEditedPrompt(value);
    } else {
      // 默认使用产品展示风格
      const defaultTemplate = VIDEO_STYLE_TEMPLATES[0];
      setSelectedStyleId(defaultTemplate.id);
      setEditedPrompt(defaultTemplate.prompt);
      onChange(defaultTemplate.prompt);
    }
  }, []);

  // 同步外部 value 的变化
  useEffect(() => {
    if (value !== editedPrompt) {
      setEditedPrompt(value);
    }
  }, [value]);

  // 选择风格模板
  const handleStyleSelect = (styleId: string) => {
    const template = VIDEO_STYLE_TEMPLATES.find(t => t.id === styleId);
    if (template) {
      setSelectedStyleId(styleId);
      if (styleId !== 'custom') {
        setEditedPrompt(template.prompt);
        onChange(template.prompt);
      }
    }
  };

  // 编辑提示词
  const handlePromptChange = (newPrompt: string) => {
    setEditedPrompt(newPrompt);
    onChange(newPrompt);

    // 如果用户手动编辑了提示词,检查是否还匹配某个模板
    const matchedTemplate = VIDEO_STYLE_TEMPLATES.find(t => t.prompt === newPrompt);
    if (matchedTemplate) {
      setSelectedStyleId(matchedTemplate.id);
    } else if (selectedStyleId !== 'custom') {
      setSelectedStyleId('custom');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {/* 风格模板选择下拉框 */}
      <Select value={selectedStyleId} onValueChange={handleStyleSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择视频风格" />
        </SelectTrigger>
        <SelectContent>
          {VIDEO_STYLE_TEMPLATES.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col items-start">
                <span className="font-medium">{template.name}</span>
                <span className="text-xs text-gray-500">{template.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 提示词编辑区 */}
      <div className="space-y-2">
        <Textarea
          value={editedPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handlePromptChange(e.target.value)
          }
          placeholder="输入或编辑视频生成提示词..."
          className="min-h-[100px] resize-none text-sm"
          disabled={selectedStyleId !== 'custom' && !editedPrompt}
        />
        <p className="text-xs text-gray-500">
          {selectedStyleId === 'custom'
            ? '自定义模式：可以自由编辑提示词'
            : '已选择预设风格，提示词已自动填充。可以切换到"自定义"进行修改'}
        </p>
      </div>

      {/* 当前风格说明 */}
      {selectedStyleId !== 'custom' && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs">
          <div className="font-medium text-blue-900 mb-1">
            当前风格提示词：
          </div>
          <div className="text-blue-700 whitespace-pre-wrap">
            {VIDEO_STYLE_TEMPLATES.find(t => t.id === selectedStyleId)?.prompt}
          </div>
        </div>
      )}
    </div>
  );
}
