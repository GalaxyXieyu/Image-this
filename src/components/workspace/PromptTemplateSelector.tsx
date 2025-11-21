"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Save, RefreshCw } from 'lucide-react';

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  prompt: string;
  isDefault: boolean;
  isSystem: boolean;
}

interface PromptTemplateSelectorProps {
  category: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  showQuickActions?: boolean;
}

export default function PromptTemplateSelector({
  category,
  value,
  onChange,
  label = '提示词',
  description,
  showQuickActions = true,
}: PromptTemplateSelectorProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [editedPrompt, setEditedPrompt] = useState(value);
  const [originalPrompt, setOriginalPrompt] = useState(value); // 用于跟踪原始提示词
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'update'>('new');
  const [saveName, setSaveName] = useState('');

  // 检查是否有修改
  const hasChanges = editedPrompt !== originalPrompt;

  // 加载模板列表
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/prompt-templates?category=${category}`);
      if (!response.ok) throw new Error('加载模板失败');
      
      const data = await response.json();
      setTemplates(data.templates || []);
      
      // 自动选择默认模板
      const defaultTemplate = data.templates?.find((t: PromptTemplate) => t.isDefault);
      if (defaultTemplate && !selectedTemplateId) {
        setSelectedTemplateId(defaultTemplate.id);
        setEditedPrompt(defaultTemplate.prompt);
        setOriginalPrompt(defaultTemplate.prompt); // 同时设置原始提示词
        onChange(defaultTemplate.prompt);
      } else if (value) {
        // 如果已有值，尝试匹配模板
        const matchedTemplate = data.templates?.find((t: PromptTemplate) => t.prompt === value);
        if (matchedTemplate) {
          setSelectedTemplateId(matchedTemplate.id);
        }
        setEditedPrompt(value);
        setOriginalPrompt(value); // 同时设置原始提示词
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载提示词模板',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [category]);

  // 同步外部 value 的变化
  useEffect(() => {
    if (value !== editedPrompt) {
      setEditedPrompt(value);
      setOriginalPrompt(value);
    }
  }, [value]);

  // 选择模板
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setEditedPrompt(template.prompt);
      setOriginalPrompt(template.prompt); // 更新原始提示词
      onChange(template.prompt);
    }
  };

  // 打开快速保存对话框
  const openQuickSaveDialog = (mode: 'new' | 'update') => {
    setSaveMode(mode);
    if (mode === 'update' && selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setSaveName(template?.name || '');
    } else {
      setSaveName('');
    }
    setIsSaveDialogOpen(true);
  };

  // 快速保存
  const handleQuickSave = async () => {
    if (!saveName.trim()) {
      toast({
        title: '提示',
        description: '请输入模板名称',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (saveMode === 'new') {
        // 创建新模板
        const response = await fetch('/api/prompt-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveName,
            category,
            prompt: editedPrompt,
          }),
        });

        if (!response.ok) throw new Error('保存失败');

        toast({
          title: '保存成功',
          description: '新模板已创建',
        });
      } else {
        // 更新现有模板
        if (!selectedTemplateId) {
          toast({
            title: '提示',
            description: '请先选择一个模板',
            variant: 'destructive',
          });
          return;
        }

        const response = await fetch(`/api/prompt-templates/${selectedTemplateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: saveName,
            prompt: editedPrompt,
          }),
        });

        if (!response.ok) throw new Error('更新失败');

        toast({
          title: '更新成功',
          description: '模板已更新',
        });
      }

      setIsSaveDialogOpen(false);
      setSaveName('');
      setOriginalPrompt(editedPrompt); // 保存成功后更新原始提示词
      await loadTemplates();
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: '保存失败',
        description: '无法保存模板',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>

      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      {/* 模板选择下拉框 */}
      <Select
        value={selectedTemplateId}
        onValueChange={handleTemplateSelect}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? '加载中...' : '选择提示词模板'} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  {template.isDefault && (
                    <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                      默认
                    </span>
                  )}
                </div>
                {template.description && (
                  <span className="text-xs text-gray-500">{template.description}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 提示词编辑区 */}
      <div className="space-y-2">
        <Textarea
          value={editedPrompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setEditedPrompt(e.target.value);
            onChange(e.target.value);
          }}
          placeholder="输入或编辑提示词内容..."
          className="min-h-[120px] resize-none text-sm"
        />
      </div>

      {/* 快速操作按钮 - 仅在有修改时显示 */}
      {showQuickActions && editedPrompt && hasChanges && (
        <div className="flex gap-2">
          <Button
            onClick={() => openQuickSaveDialog('new')}
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
          >
            <Save className="w-3 h-3" />
            保存为新模板
          </Button>
          {selectedTemplateId && (
            <Button
              onClick={() => openQuickSaveDialog('update')}
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
              更新当前模板
            </Button>
          )}
        </div>
      )}

      {/* 快速保存对话框 */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {saveMode === 'new' ? '保存为新模板' : '更新模板'}
            </DialogTitle>
            <DialogDescription>
              {saveMode === 'new' 
                ? '将当前提示词保存为新的模板' 
                : '更新现有模板的名称和内容'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">模板名称</Label>
              <Input
                id="template-name"
                value={saveName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSaveName(e.target.value)}
                placeholder="例如：产品背景替换"
              />
            </div>
            <div className="space-y-2">
              <Label>提示词内容</Label>
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200 max-h-32 overflow-y-auto">
                {editedPrompt}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleQuickSave}>
              {saveMode === 'new' ? '创建' : '更新'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
