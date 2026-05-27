'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DesktopUpdateCard } from '@/components/settings/DesktopUpdateCard';
import { LogDiagnosticsCard } from '@/components/settings/LogDiagnosticsCard';
import { Save, Key, Sparkles, User, Image, FileText, Plus, Edit, Trash2, Star, StarOff, Cpu, HardDrive, FolderOpen, Folder, RefreshCw, Search, ChevronsUpDown, SlidersHorizontal, FileSearch } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

type SettingSection = 'models' | 'imagehosting' | 'runtime' | 'logs' | 'profile' | 'prompts' | 'updates';

interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  prompt: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  BACKGROUND_REPLACE: '背景替换',
  OUTPAINT: '扩图',
  UPSCALE: '高清化',
  ONE_CLICK: '一键增强',
};

function getProviderDisplayName(provider: 'gpt' | 'gemini' | 'jimeng') {
  if (provider === 'gpt') return 'GPT';
  if (provider === 'gemini') return 'Gemini';
  return '即梦';
}

function mapModelRequestError(provider: 'gpt' | 'gemini' | 'jimeng', message: string) {
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

function SearchableModelSelect({
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
          className="w-full justify-between"
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
            className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">无匹配模型</div>
          ) : (
            filtered.map((option) => (
              <div
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setSearch('');
                }}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-muted ${value === option ? 'bg-muted font-medium' : ''}`}
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

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeSection, setActiveSection] = useState<SettingSection>('models');
  
  // 提示词模板状态
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'BACKGROUND_REPLACE',
    prompt: '',
  });
  
  const [apiSettings, setApiSettings] = useState({
    // 火山引擎配置
    volcengineAccessKey: '',
    volcengineSecretKey: '',
    // GPT 配置
    gptApiUrl: 'https://yunwu.ai',
    gptApiKey: '',
    gptModelName: 'gpt-4o-image-vip',
    // Gemini 配置
    geminiApiKey: '',
    geminiBaseUrl: 'https://toapis.com',
    geminiModelName: 'gemini-3.1-flash-image-preview',
    // 即梦配置
    arkApiKey: '',
    jimengBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    jimengModelName: 'seedream-4.5',
    // 图床配置
    superbedToken: '',
    // 本地存储配置
    localStoragePath: '',
    // 后台任务配置
    taskConcurrency: 2
  });

  const [isSaving, setIsSaving] = useState(false);

  // 动态模型列表状态
  const [gptModels, setGptModels] = useState<string[]>([]);
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  const [jimengModels, setJimengModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({
    gpt: false,
    gemini: false,
    jimeng: false,
  });
  const menuItems = [
    { 
      id: 'models' as SettingSection, 
      label: 'AI模型配置', 
      subtitle: '文生图、图生图、扩图',
      icon: Cpu, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'imagehosting' as SettingSection,
      label: '图床服务',
      subtitle: '图片存储和访问',
      icon: Image,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'prompts' as SettingSection,
      label: '提示词模板',
      subtitle: '管理 AI 提示词',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'runtime' as SettingSection,
      label: '后台任务',
      subtitle: '并发与队列',
      icon: SlidersHorizontal,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'logs' as SettingSection,
      label: '日志诊断',
      subtitle: '查看与定位问题',
      icon: FileSearch,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'profile' as SettingSection,
      label: '用户信息',
      subtitle: '查看账户信息',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    {
      id: 'updates' as SettingSection,
      label: '应用更新',
      subtitle: '检查和安装新版本',
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const originalAlert = window.alert;
    window.alert = (message?: string) => {
      const text = typeof message === 'string' ? message : '';
      const isFailure = /失败|错误|重试/i.test(text);

      toast({
        title: isFailure ? '操作失败' : '操作成功',
        description: text || (isFailure ? '请稍后重试。' : '操作已完成。'),
        variant: isFailure ? 'destructive' : 'default',
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  useEffect(() => {
    // 从后端API加载设置
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setApiSettings({
              volcengineAccessKey: data.config.volcengine?.accessKey || '',
              volcengineSecretKey: data.config.volcengine?.secretKey || '',
              gptApiUrl: data.config.gpt?.apiUrl || 'https://yunwu.ai',
              gptApiKey: data.config.gpt?.apiKey || '',
              gptModelName: data.config.gpt?.modelName || 'gpt-4o-image-vip',
              geminiApiKey: data.config.gemini?.apiKey || '',
              geminiBaseUrl: data.config.gemini?.baseUrl || 'https://toapis.com',
              geminiModelName: data.config.gemini?.modelName || 'gemini-3.1-flash-image-preview',
              arkApiKey: data.config.jimeng?.arkApiKey || '',
              jimengBaseUrl: data.config.jimeng?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
              jimengModelName: data.config.jimeng?.modelName || 'seedream-4.5',
              superbedToken: data.config.imagehosting?.superbedToken || '',
              localStoragePath: data.config.localStorage?.savePath || '',
              taskConcurrency: data.config.taskRuntime?.concurrency || 2
            });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 转换为标准配置格式，根据是否填写了必要字段自动判断是否启用
      const config = {
        volcengine: {
          enabled: !!(apiSettings.volcengineAccessKey && apiSettings.volcengineSecretKey),
          accessKey: apiSettings.volcengineAccessKey,
          secretKey: apiSettings.volcengineSecretKey
        },
        gpt: {
          enabled: !!(apiSettings.gptApiKey),
          apiUrl: apiSettings.gptApiUrl,
          apiKey: apiSettings.gptApiKey,
          modelName: apiSettings.gptModelName
        },
        gemini: {
          enabled: !!(apiSettings.geminiApiKey),
          apiKey: apiSettings.geminiApiKey,
          baseUrl: apiSettings.geminiBaseUrl,
          modelName: apiSettings.geminiModelName
        },
        jimeng: {
          enabled: !!(apiSettings.arkApiKey || (apiSettings.volcengineAccessKey && apiSettings.volcengineSecretKey)),
          arkApiKey: apiSettings.arkApiKey,
          baseUrl: apiSettings.jimengBaseUrl,
          modelName: apiSettings.jimengModelName,
          accessKey: apiSettings.volcengineAccessKey,
          secretKey: apiSettings.volcengineSecretKey
        },
        imagehosting: {
          enabled: !!(apiSettings.superbedToken),
          superbedToken: apiSettings.superbedToken
        },
        localStorage: {
          savePath: apiSettings.localStoragePath
        },
        taskRuntime: {
          concurrency: Number(apiSettings.taskConcurrency) || 2
        }
      };
      
      // 保存到后端API
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error('保存失败');
      }
      
      alert('设置已保存！');
    } catch (error) {
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setApiSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 获取模型列表
  const renderInlineSaveButton = () => (
    <Button
      type="button"
      onClick={handleSave}
      disabled={isSaving}
      className="min-w-[132px] bg-orange-500 hover:bg-orange-600"
    >
      {isSaving ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          保存中...
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          保存本区配置
        </>
      )}
    </Button>
  );

  const fetchModels = async (provider: 'gpt' | 'gemini' | 'jimeng') => {
    const baseUrlField = provider === 'gpt' ? 'gptApiUrl' : provider === 'gemini' ? 'geminiBaseUrl' : 'jimengBaseUrl';
    const apiKeyField = provider === 'gpt' ? 'gptApiKey' : provider === 'gemini' ? 'geminiApiKey' : 'arkApiKey';
    const baseUrl = apiSettings[baseUrlField as keyof typeof apiSettings] as string;
    const apiKey = apiSettings[apiKeyField as keyof typeof apiSettings] as string;

    if (!baseUrl || !apiKey) {
      toast({
        title: '缺少配置',
        description: '请先填写 API 地址和密钥',
        variant: 'destructive',
      });
      return;
    }

    setFetchingModels(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '获取失败');
      }

      const models = data.models || [];
      if (provider === 'gpt') setGptModels(models);
      else if (provider === 'gemini') setGeminiModels(models);
      else if (provider === 'jimeng') setJimengModels(models);

      toast({
        title: '获取成功',
        description: `找到 ${models.length} 个模型`,
      });
    } catch (error) {
      const errorMessage = mapModelRequestError(
        provider,
        error instanceof Error ? error.message : '未知错误'
      );

      if (error instanceof Error) {
        error.message = errorMessage;
      }

      toast({
        title: '获取模型列表失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setFetchingModels(prev => ({ ...prev, [provider]: false }));
    }
  };

  // 文件夹选择器
  const handleSelectFolder = async () => {
    try {
      // 检查是否在 Electron 环境中
      if (typeof window !== 'undefined' && (window as any).electron?.selectDirectory) {
        // Electron 桌面应用：使用原生对话框
        const paths = await (window as any).electron.selectDirectory();
        if (paths && paths.length > 0) {
          handleInputChange('localStoragePath', paths[0]);
          toast({
            title: '路径已选择',
            description: paths[0],
          });
        }
      } else {
        // Web 浏览器：提示用户手动输入
        // 注意：浏览器出于安全考虑，无法直接获取文件系统的绝对路径
        toast({
          title: '浏览器环境提示',
          description: '请直接在输入框中手动输入完整的文件夹路径，例如：/Users/yourname/Pictures/ai-images',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      toast({
        title: '选择失败',
        description: '无法打开文件夹选择器',
        variant: 'destructive',
      });
    }
  };

  // 提示词模板管理函数
  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await fetch('/api/prompt-templates');
      if (!response.ok) throw new Error('加载失败');
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('加载模板失败:', error);
      toast({
        title: '加载失败',
        description: '无法加载提示词模板',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      toast({
        title: '提示',
        description: '请填写模板名称和提示词内容',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/prompt-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('创建失败');

      toast({
        title: '创建成功',
        description: '提示词模板已创建',
      });

      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        category: 'BACKGROUND_REPLACE',
        prompt: '',
      });
      await loadTemplates();
    } catch (error) {
      console.error('创建模板失败:', error);
      toast({
        title: '创建失败',
        description: '无法创建提示词模板',
        variant: 'destructive',
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!currentTemplate) return;

    try {
      const response = await fetch(`/api/prompt-templates/${currentTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          prompt: formData.prompt,
        }),
      });

      if (!response.ok) throw new Error('更新失败');

      toast({
        title: '更新成功',
        description: '提示词模板已更新',
      });

      setIsEditDialogOpen(false);
      setCurrentTemplate(null);
      await loadTemplates();
    } catch (error) {
      console.error('更新模板失败:', error);
      toast({
        title: '更新失败',
        description: '无法更新提示词模板',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate) return;

    try {
      const response = await fetch(`/api/prompt-templates/${currentTemplate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除失败');
      }

      toast({
        title: '删除成功',
        description: '提示词模板已删除',
      });

      setIsDeleteDialogOpen(false);
      setCurrentTemplate(null);
      await loadTemplates();
    } catch (error) {
      console.error('删除模板失败:', error);
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '无法删除提示词模板',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (template: PromptTemplate) => {
    try {
      const response = await fetch(`/api/prompt-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDefault: !template.isDefault,
        }),
      });

      if (!response.ok) throw new Error('设置失败');

      toast({
        title: template.isDefault ? '已取消默认' : '设置成功',
        description: template.isDefault ? '已取消默认模板' : '已设置为默认模板',
      });

      await loadTemplates();
    } catch (error) {
      console.error('设置默认模板失败:', error);
      toast({
        title: '设置失败',
        description: '无法设置默认模板',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (template: PromptTemplate) => {
    setCurrentTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      prompt: template.prompt,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (template: PromptTemplate) => {
    setCurrentTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // 当切换到提示词标签时加载模板
  useEffect(() => {
    if (activeSection === 'prompts' && status === 'authenticated') {
      loadTemplates();
    }
  }, [activeSection, status]);

  const renderContent = () => {
    switch (activeSection) {
      case 'models':
        return (
          <div className="space-y-6">
            {/* GPT API配置 */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="flex items-center">
                  <Key className="w-5 h-5 mr-2 text-blue-600" />
                  GPT API
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  支持：背景替换、图片生成
                </div>
                <div>
                  <Label htmlFor="gptApiUrl">API 地址</Label>
                  <Input
                    id="gptApiUrl"
                    placeholder="https://yunwu.ai"
                    value={apiSettings.gptApiUrl}
                    onChange={(e) => handleInputChange('gptApiUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gptModelName">模型名称</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableModelSelect
                        id="gptModelName"
                        value={apiSettings.gptModelName}
                        onChange={(value) => handleInputChange('gptModelName', value)}
                        options={Array.from(new Set([apiSettings.gptModelName, ...gptModels]))}
                        placeholder="选择或输入模型..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fetchModels('gpt')}
                      disabled={fetchingModels.gpt}
                      title="获取模型列表"
                    >
                      <RefreshCw className={`h-4 w-4 ${fetchingModels.gpt ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">选择模型或点击刷新获取列表</p>
                </div>
                <div>
                  <Label htmlFor="gptApiKey">API 密钥</Label>
                  <Input
                    id="gptApiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiSettings.gptApiKey}
                    onChange={(e) => handleInputChange('gptApiKey', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Google Gemini配置 */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  Google Gemini
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  支持：图片生成、图片理解（即将推出）
                </div>
                <div>
                  <Label htmlFor="geminiModelName">模型名称</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableModelSelect
                        id="geminiModelName"
                        value={apiSettings.geminiModelName}
                        onChange={(value) => handleInputChange('geminiModelName', value)}
                        options={Array.from(new Set([apiSettings.geminiModelName, ...geminiModels]))}
                        placeholder="选择或输入模型..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fetchModels('gemini')}
                      disabled={fetchingModels.gemini}
                      title="获取模型列表"
                    >
                      <RefreshCw className={`h-4 w-4 ${fetchingModels.gemini ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">选择模型或点击刷新获取列表</p>
                </div>
                <div>
                  <Label htmlFor="geminiBaseUrl">API 地址</Label>
                  <Input
                    id="geminiBaseUrl"
                    placeholder="https://toapis.com"
                    value={apiSettings.geminiBaseUrl}
                    onChange={(e) => handleInputChange('geminiBaseUrl', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">例如 toapis 的基础地址 https://toapis.com</p>
                </div>
                <div>
                  <Label htmlFor="geminiApiKey">API 密钥</Label>
                  <Input
                    id="geminiApiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiSettings.geminiApiKey}
                    onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 即梦配置 */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
                  即梦
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  支持：高质量图片生成、背景替换（Ark API 或 Legacy 视觉 API）
                </div>
                <div>
                  <Label htmlFor="jimengBaseUrl">API 地址</Label>
                  <Input
                    id="jimengBaseUrl"
                    placeholder="https://ark.cn-beijing.volces.com/api/v3/images/generations"
                    value={apiSettings.jimengBaseUrl}
                    onChange={(e) => handleInputChange('jimengBaseUrl', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="jimengModelName">模型名称</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableModelSelect
                        id="jimengModelName"
                        value={apiSettings.jimengModelName}
                        onChange={(value) => handleInputChange('jimengModelName', value)}
                        options={Array.from(new Set([apiSettings.jimengModelName, ...jimengModels]))}
                        placeholder="选择或输入模型..."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => fetchModels('jimeng')}
                      disabled={fetchingModels.jimeng}
                      title="获取模型列表"
                    >
                      <RefreshCw className={`h-4 w-4 ${fetchingModels.jimeng ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">选择模型或点击刷新获取列表</p>
                </div>
                <div>
                  <Label htmlFor="arkApiKey">ARK API Key</Label>
                  <Input
                    id="arkApiKey"
                    type="password"
                    placeholder="输入 ARK API Key（推荐，Ark 模式）"
                    value={apiSettings.arkApiKey}
                    onChange={(e) => handleInputChange('arkApiKey', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    推荐：使用火山引擎 Ark API，无需图床
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground mb-2">Legacy 视觉 API（同时用于画质增强、扩图）</p>
                  <div>
                    <Label htmlFor="volcengineAccessKey">Access Key</Label>
                    <Input
                      id="volcengineAccessKey"
                      placeholder="AKLT..."
                      value={apiSettings.volcengineAccessKey}
                      onChange={(e) => handleInputChange('volcengineAccessKey', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="volcengineSecretKey">Secret Key</Label>
                    <Input
                      id="volcengineSecretKey"
                      type="password"
                      placeholder="输入密钥"
                      value={apiSettings.volcengineSecretKey}
                      onChange={(e) => handleInputChange('volcengineSecretKey', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'imagehosting':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="flex items-center">
                  <Image className="w-5 h-5 mr-2 text-green-600" />
                  图床服务
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  支持：Superbed 图床服务，用于存储和访问生成的图片
                </div>
                <div>
                  <Label htmlFor="superbedToken">Superbed Token</Label>
                  <Input
                    id="superbedToken"
                    type="password"
                    placeholder="输入 Superbed API Token"
                    value={apiSettings.superbedToken}
                    onChange={(e) => handleInputChange('superbedToken', e.target.value)}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    访问 <a href="https://superbed.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">superbed.cn</a> 获取 API Token
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 本地存储配置 */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="flex items-center">
                  <div className="flex items-center">
                    <HardDrive className="w-5 h-5 mr-2 text-blue-600" />
                    本地存储配置
                  </div>
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  配置图片本地保存路径，默认为应用目录下的 public/uploads/
                </div>
                <div>
                  <Label htmlFor="localStoragePath">
                    <div className="flex items-center gap-2 mb-2">
                      <FolderOpen className="w-4 h-4" />
                      保存路径
                    </div>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="localStoragePath"
                      type="text"
                      placeholder="例如：/Users/yourname/Pictures/ai-images 或 ~/Pictures/ai-images"
                      value={apiSettings.localStoragePath}
                      onChange={(e) => handleInputChange('localStoragePath', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSelectFolder}
                      className="gap-2 whitespace-nowrap"
                    >
                      <Folder className="w-4 h-4" />
                      浏览
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div>• 留空使用默认路径：public/uploads/</div>
                    <div>• 支持绝对路径：/Users/yourname/Pictures/ai-images</div>
                    <div>• 支持相对路径：./my-images（相对于项目根目录）</div>
                    <div>• 支持 ~ 符号：~/Pictures/ai-images（用户主目录）</div>
                    <div>• "浏览"按钮：桌面版可选择文件夹，Web 版请手动输入路径</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'prompts':
        const filteredTemplates = selectedCategory === 'ALL'
          ? templates
          : templates.filter(t => t.category === selectedCategory);

        return (
          <div className="space-y-6">
            {/* 工具栏 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      提示词模板管理
                    </CardTitle>
                    <CardDescription className="mt-1">
                      管理您的 AI 提示词模板，包括背景替换、扩图、高清化和一键增强等场景
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    新建模板
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium">筛选分类:</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">全部分类</SelectItem>
                      {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 模板列表 */}
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {CATEGORY_LABELS[template.category]}
                            {template.isSystem && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                系统
                              </span>
                            )}
                            {template.isDefault && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                默认
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      )}
                      <div className="bg-muted p-3 rounded-md border border-border mb-4">
                        <p className="text-xs text-muted-foreground line-clamp-3">{template.prompt}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                          className="gap-1"
                        >
                          {template.isDefault ? (
                            <>
                              <StarOff className="w-4 h-4" />
                              取消默认
                            </>
                          ) : (
                            <>
                              <Star className="w-4 h-4" />
                              设为默认
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          className="gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(template)}
                          disabled={template.isSystem}
                          className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">暂无提示词模板</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    创建第一个模板
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'runtime':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center">
                    <SlidersHorizontal className="w-5 h-5 mr-2 text-orange-600" />
                    后台任务并发
                  </CardTitle>
                  <CardDescription className="mt-1">
                    控制同时调用大模型、视频和图床服务的任务数量
                  </CardDescription>
                </div>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="taskConcurrency">最大并发任务数</Label>
                  <Input
                    id="taskConcurrency"
                    type="number"
                    min={1}
                    max={10}
                    value={apiSettings.taskConcurrency}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      handleInputChange('taskConcurrency', value);
                    }}
                    className="max-w-xs"
                  />
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div>建议保持 1-2，避免触发大模型或图床限流。</div>
                    <div>修改后新触发的后台队列会按该值领取任务。</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'logs':
        return <LogDiagnosticsCard />;

      case 'profile':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2 text-muted-foreground" />
                  用户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>邮箱</Label>
                  <div className="text-muted-foreground bg-muted px-3 py-2 rounded border">
                    {session.user?.email}
                  </div>
                </div>
                <div>
                  <Label>用户ID</Label>
                  <div className="text-muted-foreground bg-muted px-3 py-2 rounded border font-mono text-sm">
                    {session.user?.id}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        );

      case 'updates':
        return <DesktopUpdateCard />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* TopNav */}
      <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm text-foreground">AI 商品视觉工作台</span>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-foreground font-medium">设置</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
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
          <Link
            href="/results"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: "Geist, sans-serif" }}
          >
            结果管理
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 bg-background">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "Inter, sans-serif" }}>设置</h1>
          <p className="text-muted-foreground mt-2" style={{ fontFamily: "Geist, sans-serif" }}>管理您的 AI 服务配置和账户信息</p>
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* 左侧边栏 */}
          <aside className="w-72 flex-shrink-0">
            <div className="h-full">
              <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden h-full flex flex-col">
                <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-start px-4 py-3.5 rounded-lg text-left transition-all duration-200 relative group ${
                          isActive
                            ? `${item.bgColor} ${item.color} font-medium`
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {/* 左侧高亮边框 */}
                        {isActive && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.borderColor.replace('border-', 'bg-')} rounded-r-sm`}></div>
                        )}
                        
                        <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isActive ? item.color : 'text-muted-foreground group-hover:text-muted-foreground'}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium leading-tight ${isActive ? item.color : 'text-foreground'}`}>
                            {item.label}
                          </div>
                          <div className={`text-xs mt-1 leading-tight ${isActive ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </aside>

          {/* 右侧内容区域 */}
          <div className="flex-1 space-y-6">
            {renderContent()}

            {/* 保存按钮 */}
            {activeSection !== 'profile' && activeSection !== 'prompts' && activeSection !== 'updates' && activeSection !== 'runtime' && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="min-w-[120px] bg-orange-500 hover:bg-orange-600"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存设置
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建提示词模板</DialogTitle>
            <DialogDescription>
              创建一个新的提示词模板，方便在工作流中快速使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">模板名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：产品背景替换"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="简短描述这个模板的用途"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">提示词内容 *</Label>
              <Textarea
                id="prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                placeholder="输入详细的提示词内容..."
                className="min-h-[150px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTemplate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑提示词模板</DialogTitle>
            <DialogDescription>
              修改提示词模板的内容
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">模板名称 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-prompt">提示词内容 *</Label>
              <Textarea
                id="edit-prompt"
                value={formData.prompt}
                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                className="min-h-[150px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除提示词模板 "{currentTemplate?.name}" 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteTemplate}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
