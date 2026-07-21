'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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
import { BottomSheetSelect } from '@/components/workbench/BottomSheetSelect';
import { useIsMobile } from '@/lib/use-is-mobile';
import { Key, Sparkles, User, Image, FileText, Plus, Edit, Trash2, Star, StarOff, Cpu, HardDrive, FolderOpen, Folder, RefreshCw, Search, ChevronsUpDown, SlidersHorizontal, FileSearch, ChevronRight, X, History, FlaskConical, Check, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { BrandEmptyState } from '@/components/brands/SpriteImage';
import { isDesktopApp } from '@/lib/desktop-updates';

const DesktopUpdateCard = dynamic(
  () => import('@/components/settings/DesktopUpdateCard').then((module) => module.DesktopUpdateCard),
  { loading: () => <div className="h-44 animate-pulse rounded-[18px] bg-surface-muted" /> }
);

const LogDiagnosticsCard = dynamic(
  () => import('@/components/settings/LogDiagnosticsCard').then((module) => module.LogDiagnosticsCard),
  { loading: () => <div className="h-64 animate-pulse rounded-[18px] bg-surface-muted" /> }
);

type SettingSection = 'models' | 'imagehosting' | 'runtime' | 'logs' | 'profile' | 'prompts' | 'updates';


import {
  type ProviderId,
  type ProviderModel,
  type ModelKind,
  type PromptTemplate,
  type PromptVersion,
  CATEGORY_LABELS,
  MODEL_KIND_LABEL,
  PROVIDER_META,
  SearchableModelSelect,
  getProviderDisplayName,
  mapModelRequestError,
} from "@/components/settings/model-select";
import { SettingsModelsSection } from "@/components/settings/SettingsModelsSection";
import { renderSettingsSystemSection } from "@/components/settings/SettingsSystemSections";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [activeSection, setActiveSection] = useState<SettingSection>('models');
  
  // 提示词模板状态
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<PromptTemplate | null>(null);
  // 版本管理弹窗状态
  const [versionTemplate, setVersionTemplate] = useState<PromptTemplate | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [savingVersion, setSavingVersion] = useState(false);
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
    // 文案/出词多模态模型配置
    copywriterApiKey: '',
    copywriterBaseUrl: 'https://toapis.com/v1',
    copywriterModelName: 'gpt-5.4-mini',
    // 本地存储配置
    localStoragePath: '',
    // 后台任务配置
    taskConcurrency: 2
  });

  const [isSaving, setIsSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const lastSavedRef = useRef<string | null>(null);
  // 本地存储路径只对桌面版有意义（指向服务器所在机器的本地磁盘），Web 版隐藏以免误导用户配置
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    setIsDesktop(isDesktopApp());
  }, []);

  // 每 provider 的模型列表（新设计：一张卡 = 一个模型）
  const [providerModels, setProviderModels] = useState<Record<ProviderId, ProviderModel[]>>({
    gpt: [],
    gemini: [],
    jimeng: [],
  });
  const [modalProvider, setModalProvider] = useState<ProviderId | null>(null);

  // 动态模型列表状态（用于「获取模型列表」按钮）
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
      subtitle: '生图模型、多模态语言模型',
      icon: Cpu,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'imagehosting' as SettingSection,
      label: '图床服务',
      subtitle: '图片存储和访问',
      icon: Image,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'prompts' as SettingSection,
      label: '提示词模板',
      subtitle: '管理 AI 提示词',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'runtime' as SettingSection,
      label: '后台任务',
      subtitle: '并发与队列',
      icon: SlidersHorizontal,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'logs' as SettingSection,
      label: '日志诊断',
      subtitle: '查看与定位问题',
      icon: FileSearch,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'profile' as SettingSection,
      label: '用户信息',
      subtitle: '查看账户信息',
      icon: User,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
    },
    {
      id: 'updates' as SettingSection,
      label: '应用更新',
      subtitle: '检查和安装新版本',
      icon: RefreshCw,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary'
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
              copywriterApiKey: data.config.copywriter?.apiKey || '',
              copywriterBaseUrl: data.config.copywriter?.baseUrl || 'https://toapis.com/v1',
              copywriterModelName: data.config.copywriter?.modelName || 'gpt-5.4-mini',
              localStoragePath: data.config.localStorage?.savePath || '',
              taskConcurrency: data.config.taskRuntime?.concurrency || 2
            });
            setProviderModels({
              gpt: Array.isArray(data.config.gpt?.models) && data.config.gpt.models.length > 0
                ? data.config.gpt.models
                : (data.config.gpt?.modelName ? [{ id: data.config.gpt.modelName, enabled: true }] : []),
              gemini: Array.isArray(data.config.gemini?.models) && data.config.gemini.models.length > 0
                ? data.config.gemini.models
                : (data.config.gemini?.modelName ? [{ id: data.config.gemini.modelName, enabled: true }] : []),
              jimeng: Array.isArray(data.config.jimeng?.models) && data.config.jimeng.models.length > 0
                ? data.config.jimeng.models
                : (data.config.jimeng?.modelName ? [{ id: data.config.jimeng.modelName, enabled: true }] : []),
            });
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings().finally(() => setInitialLoaded(true));
  }, []);

  // 修改即保存：配置变化后防抖自动保存（首次加载建立基线，不触发保存）
  useEffect(() => {
    if (!initialLoaded) return;
    const snapshot = JSON.stringify({ apiSettings, providerModels });
    if (lastSavedRef.current === null) {
      lastSavedRef.current = snapshot;
      return;
    }
    if (snapshot === lastSavedRef.current) return;
    const timer = setTimeout(() => {
      lastSavedRef.current = snapshot;
      void handleSave({ silent: true });
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiSettings, providerModels, initialLoaded]);

  // Load prompt templates when switching to prompts section
  useEffect(() => {
    if (activeSection === 'prompts' && status === 'authenticated') {
      loadTemplates();
    }
  }, [activeSection, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // 令牌健康检查：调用 /api/models（会请求 /v1/models）验证密钥是否有效
  const validateProviderToken = async (
    provider: 'gpt' | 'gemini',
    baseUrl: string,
    apiKey: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!baseUrl || !apiKey) return { ok: false, message: '缺少 API 地址或密钥' };
    try {
      const res = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, baseUrl, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        const raw = (data.error || '验证失败').replace(/^获取模型列表失败:\s*/, '');
        return { ok: false, message: raw };
      }
      return { ok: true, message: `有效（${(data.models || []).length} 个模型可用）` };
    } catch (error) {
      return {
        ok: false,
        message: mapModelRequestError(provider, error instanceof Error ? error.message : '网络错误'),
      };
    }
  };

  const handleSave = async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
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
          modelName: apiSettings.gptModelName,
          models: providerModels.gpt,
        },
        gemini: {
          enabled: !!(apiSettings.geminiApiKey),
          apiKey: apiSettings.geminiApiKey,
          baseUrl: apiSettings.geminiBaseUrl,
          modelName: apiSettings.geminiModelName,
          models: providerModels.gemini,
        },
        jimeng: {
          enabled: !!(apiSettings.arkApiKey || (apiSettings.volcengineAccessKey && apiSettings.volcengineSecretKey)),
          arkApiKey: apiSettings.arkApiKey,
          baseUrl: apiSettings.jimengBaseUrl,
          modelName: apiSettings.jimengModelName,
          models: providerModels.jimeng,
          accessKey: apiSettings.volcengineAccessKey,
          secretKey: apiSettings.volcengineSecretKey
        },
        imagehosting: {
          enabled: !!(apiSettings.superbedToken),
          superbedToken: apiSettings.superbedToken
        },
        copywriter: {
          enabled: !!(apiSettings.copywriterApiKey),
          apiKey: apiSettings.copywriterApiKey,
          baseUrl: apiSettings.copywriterBaseUrl,
          modelName: apiSettings.copywriterModelName
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

      // 保存成功后，对已填写密钥的 AI 提供商做令牌健康检查，避免错误令牌静默埋进任务里
      const checks: { provider: 'gpt' | 'gemini'; baseUrl: string; apiKey: string }[] = [];
      if (config.gemini.enabled && config.gemini.apiKey) {
        checks.push({ provider: 'gemini', baseUrl: apiSettings.geminiBaseUrl, apiKey: apiSettings.geminiApiKey });
      }
      if (config.gpt.enabled && config.gpt.apiKey) {
        checks.push({ provider: 'gpt', baseUrl: apiSettings.gptApiUrl, apiKey: apiSettings.gptApiKey });
      }

      const failures: string[] = [];
      for (const check of checks) {
        const result = await validateProviderToken(check.provider, check.baseUrl, check.apiKey);
        if (!result.ok) {
          failures.push(`${getProviderDisplayName(check.provider)}：${result.message}`);
        }
      }

      if (failures.length > 0) {
        toast({
          title: '已保存，但令牌验证未通过',
          description: `${failures.join('；')}。请检查 API Key 与 Base URL（toapis 的 Base URL 应为 https://toapis.com）。`,
          variant: 'destructive',
        });
      } else if (silent) {
        toast({ title: '已自动保存' });
      } else {
        toast({
          title: '设置已保存',
          description: checks.length > 0 ? '令牌验证通过，可正常生成图片' : undefined,
        });
      }
    } catch {
      toast({ title: silent ? '自动保存失败，请重试' : '保存失败，请重试', variant: 'destructive' });
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
  // 改为自动保存后不再需要分区保存按钮
  const renderInlineSaveButton = () => null;

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

  // === 版本管理 ===
  const loadVersions = async (templateId: string) => {
    try {
      setIsLoadingVersions(true);
      const res = await fetch(`/api/prompt-templates/${templateId}/versions`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setVersions(data.versions || []);
      setActiveVersionId(data.activeVersionId ?? null);
    } catch {
      toast({ title: '加载失败', description: '无法加载版本历史', variant: 'destructive' });
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const openVersionDialog = (template: PromptTemplate) => {
    setVersionTemplate(template);
    setVersions([]);
    setActiveVersionId(template.activeVersionId ?? null);
    setNewVersionContent('');
    setNewVersionLabel('');
    loadVersions(template.id);
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!versionTemplate) return;
    try {
      const res = await fetch(`/api/prompt-templates/${versionTemplate.id}/versions/${versionId}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('切换失败');
      setActiveVersionId(versionId);
      toast({ title: '已切换', description: '该版本已设为当前生效版本' });
      loadTemplates();
    } catch {
      toast({ title: '操作失败', description: '切换当前版本失败', variant: 'destructive' });
    }
  };

  const handleCreateVersion = async () => {
    if (!versionTemplate || !newVersionContent.trim()) {
      toast({ title: '提示', description: '请填写版本内容', variant: 'destructive' });
      return;
    }
    try {
      setSavingVersion(true);
      const res = await fetch(`/api/prompt-templates/${versionTemplate.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newVersionContent.trim(), label: newVersionLabel.trim() || undefined }),
      });
      if (!res.ok) throw new Error('创建失败');
      setNewVersionContent('');
      setNewVersionLabel('');
      toast({ title: '已保存', description: '新版本已创建' });
      loadVersions(versionTemplate.id);
      loadTemplates();
    } catch {
      toast({ title: '保存失败', description: '创建版本失败', variant: 'destructive' });
    } finally {
      setSavingVersion(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!versionTemplate) return;
    try {
      const res = await fetch(`/api/prompt-templates/${versionTemplate.id}/versions/${versionId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: '删除失败', description: data.error || '无法删除该版本', variant: 'destructive' });
        return;
      }
      loadVersions(versionTemplate.id);
      loadTemplates();
    } catch {
      toast({ title: '删除失败', description: '删除版本失败', variant: 'destructive' });
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'models':
        return (
          <SettingsModelsSection
            providerModels={providerModels}
            setModalProvider={setModalProvider}
          />
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-[18px] sm:text-body">
                      <FileText className="w-5 h-5 text-primary" />
                      提示词模板管理
                    </CardTitle>
                    <CardDescription className="mt-1 hidden sm:block">
                      管理您的 AI 提示词模板，包括背景替换、扩图、高清化和一键增强等场景
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="min-h-11 w-full gap-2 sm:w-auto">
                    <Plus className="w-4 h-4" />
                    新建模板
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <Label className="hidden text-data font-medium sm:block">筛选分类:</Label>
                  {isMobile ? (
                    <BottomSheetSelect
                      title="筛选分类"
                      value={selectedCategory}
                      onChange={(value) => {
                        if (typeof value === 'string') setSelectedCategory(value);
                      }}
                      options={[
                        { id: 'ALL', label: '全部分类' },
                        ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
                          id: value,
                          label,
                        })),
                      ]}
                      trigger={
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] border border-line-strong bg-surface px-3.5 text-[14px] font-medium text-ink"
                        >
                          <span className="inline-flex items-center gap-2 text-ink-2">
                            <FileText className="h-4 w-4 text-ink-3" />
                            {selectedCategory === 'ALL' ? '全部分类' : CATEGORY_LABELS[selectedCategory]}
                          </span>
                          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-3" />
                        </button>
                      }
                    />
                  ) : (
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="hidden min-h-11 w-full sm:flex sm:w-[200px]">
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
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 模板列表 */}
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-body flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex flex-wrap items-center gap-1">
                            {CATEGORY_LABELS[template.category]}
                            {template.isSystem && (
                              <span className="text-caption px-2 py-0.5 bg-primary/10 text-primary rounded">
                                系统
                              </span>
                            )}
                            {template.isDefault && (
                              <span className="text-caption px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                                默认
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.description && (
                        <p className="mb-3 hidden text-data text-muted-foreground sm:block">{template.description}</p>
                      )}
                      <div className="mb-4 hidden rounded-md border border-border bg-muted p-3 sm:block">
                        <p className="text-caption text-muted-foreground line-clamp-3">{template.prompt}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(template)}
                          className="min-h-10 gap-1"
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
                          onClick={() => openVersionDialog(template)}
                          className="min-h-10 gap-1"
                        >
                          <History className="w-4 h-4" />
                          版本{template._count?.versions ? ` (${template._count.versions})` : ''}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          className="min-h-10 gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="min-h-10 gap-1">
                          <Link href={`/prompt-studio?templateId=${template.id}`}>
                            <FlaskConical className="w-4 h-4" />
                            工作室
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(template)}
                          disabled={template.isSystem}
                          className="min-h-10 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                <CardContent>
                  <BrandEmptyState
                    pose="think"
                    title="暂无提示词模板"
                    description=""
                    className="border-0 bg-transparent py-12"
                    action={
                      <Button onClick={() => setIsCreateDialogOpen(true)} className="min-h-11 gap-2">
                        <Plus className="w-4 h-4" />
                        创建第一个模板
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        );

      default:
        return renderSettingsSystemSection(activeSection, {
          apiSettings,
          setApiSettings,
          handleInputChange,
          renderInlineSaveButton,
          isDesktop,
          handleSelectFolder,
          session,
          isSaving,
        });
    }
  };


  return (
    <div className="h-full bg-background flex flex-col overflow-y-auto lg:overflow-hidden">
      <div className="flex-1 bg-background px-4 py-3 sm:px-6 sm:py-8 lg:flex lg:min-h-0 lg:flex-col lg:px-8">

        {/* 顶部 4 Tab + 各 Tab 内子 section */}
        {(() => {
          const tabGroups: { id: string; label: string; sections: SettingSection[] }[] = [
            { id: 'models', label: 'AI 模型配置', sections: ['models'] },
            { id: 'prompts', label: '提示词模板', sections: ['prompts'] },
            { id: 'system', label: '系统设置', sections: ['imagehosting', 'runtime', 'logs'] },
            { id: 'profile', label: '用户信息', sections: ['profile', 'updates'] },
          ];
          const currentTab = tabGroups.find((g) => g.sections.includes(activeSection)) ?? tabGroups[0];
          return (
            <div className="mb-4 sm:mb-6">
              <div className="sm:border-b sm:border-line">
                <nav className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-1">
                  {tabGroups.map((g) => {
                    const active = currentTab.id === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setActiveSection(g.sections[0])}
                        className={cn(
                          "relative inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors sm:gap-2 sm:rounded-none sm:border-0 sm:px-4 sm:py-2.5 sm:text-[14px] sm:font-medium",
                          active
                            ? "border-transparent bg-accent-gradient text-white shadow-soft sm:rounded-full"
                            : "border-line bg-surface text-ink-2 hover:text-ink sm:border-transparent sm:bg-transparent sm:text-ink-3"
                        )}
                      >
                        {(() => {
                          const Icon = menuItems.find((m) => m.id === g.sections[0])?.icon;
                          return Icon ? <Icon className="h-4 w-4" /> : null;
                        })()}
                        {g.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
              {currentTab.sections.length > 1 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto sm:mt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {currentTab.sections.map((sid) => {
                    const item = menuItems.find((m) => m.id === sid);
                    if (!item) return null;
                    const active = activeSection === sid;
                    return (
                      <button
                        key={sid}
                        onClick={() => setActiveSection(sid)}
                        className={cn(
                          "min-h-10 shrink-0 rounded-full px-3 text-[12px] font-medium transition-colors",
                          active
                            ? "bg-brand-soft text-brand-text"
                            : "text-ink-3 hover:bg-surface-muted hover:text-ink"
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex min-h-0 gap-6 sm:min-h-[calc(100vh-16rem)] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {/* 右侧内容区域 */}
          <div className="flex-1 space-y-6">
            {renderContent()}

            {/* 修改即保存：改动后自动保存，无需手动点按钮 */}
            {activeSection !== 'profile' && activeSection !== 'prompts' && activeSection !== 'updates' && activeSection !== 'runtime' && (
              <p className="text-center text-[12px] text-muted-foreground">
                {isSaving ? '保存中…' : '改动会自动保存'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 创建对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-sm:w-[calc(100vw-1.5rem)] max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:overflow-y-auto">
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
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类 *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                    <SelectTrigger className="min-h-11">
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
                className="min-h-11"
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-11" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button className="min-h-11" onClick={handleCreateTemplate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-sm:w-[calc(100vw-1.5rem)] max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:overflow-y-auto">
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
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">描述</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-11"
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-11" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button className="min-h-11" onClick={handleEditTemplate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-sm:w-[calc(100vw-1.5rem)]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除提示词模板 “{currentTemplate?.name}” 吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-11" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" className="min-h-11" onClick={handleDeleteTemplate}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本管理弹窗 */}
      <Dialog open={!!versionTemplate} onOpenChange={(open) => !open && setVersionTemplate(null)}>
        <DialogContent className="max-w-2xl max-sm:w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif-brand text-[20px]">版本管理 · {versionTemplate?.name}</DialogTitle>
            <DialogDescription>
              一个提示词可以保留多个版本；把满意的版本「设为当前」即作为该模板的生效内容。
            </DialogDescription>
          </DialogHeader>

          {/* 版本列表 */}
          <div className="space-y-2">
            {isLoadingVersions ? (
              <p className="py-6 text-center text-data text-muted-foreground">加载中…</p>
            ) : versions.length === 0 ? (
              <p className="py-6 text-center text-data text-muted-foreground">暂无版本</p>
            ) : (
              versions.map((v) => {
                const isActive = v.id === activeVersionId;
                return (
                  <div
                    key={v.id}
                    className={cn(
                      'rounded-[12px] border p-3 transition-colors',
                      isActive ? 'border-[color:var(--accent-ai-line)] bg-ai-soft' : 'border-line'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-data font-semibold text-ink">v{v.versionNo}</span>
                      {v.label && <span className="rounded bg-secondary px-2 py-0.5 text-caption text-secondary-foreground">{v.label}</span>}
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-caption text-ai-accent">
                          <Check className="h-3 w-3" /> 当前
                        </span>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        {!isActive && (
                          <Button variant="ghost" size="xs" className="gap-1" onClick={() => handleActivateVersion(v.id)}>
                            <Check className="h-3.5 w-3.5" /> 设为当前
                          </Button>
                        )}
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDeleteVersion(v.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-caption text-muted-foreground">{v.content}</p>
                    {v.note && <p className="mt-1 text-caption text-ink-3">备注：{v.note}</p>}
                  </div>
                );
              })
            )}
          </div>

          {/* 新建版本 */}
          <div className="mt-2 space-y-2 rounded-[12px] border border-dashed border-line-strong p-3">
            <Label className="text-data font-medium">新建版本</Label>
            <Input
              placeholder="版本名（可选，如：柔光版）"
              value={newVersionLabel}
              onChange={(e) => setNewVersionLabel(e.target.value)}
              className="min-h-10"
            />
            <Textarea
              placeholder="填写这个版本的提示词内容…"
              value={newVersionContent}
              onChange={(e) => setNewVersionContent(e.target.value)}
              className="min-h-[88px]"
            />
            <div className="flex items-center justify-between gap-2">
              <Button variant="ghost" size="sm" asChild className="gap-1">
                <Link href={versionTemplate ? `/prompt-studio?templateId=${versionTemplate.id}` : '#'}>
                  <FlaskConical className="h-4 w-4" /> 去工作室对比测试
                </Link>
              </Button>
              <Button size="sm" className="min-h-10 gap-1" disabled={savingVersion} onClick={handleCreateVersion}>
                <Plus className="h-4 w-4" /> 保存为新版本
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider 配置弹窗（移动端全屏 sheet） */}
      <Dialog open={!!modalProvider} onOpenChange={(open) => !open && setModalProvider(null)}>
        <DialogContent className="max-w-lg max-md:!fixed max-md:!inset-0 max-md:!max-w-none max-md:!w-screen max-md:!h-[100dvh] max-md:!translate-x-0 max-md:!translate-y-0 max-md:!top-0 max-md:!left-0 max-md:!rounded-none max-md:!border-0 max-md:!overflow-y-auto">
          {modalProvider && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-muted">
                    <Cpu className="h-5 w-5 text-ink-2" />
                  </span>
                  <div>
                    <DialogTitle className="text-[16px] font-semibold">{PROVIDER_META[modalProvider].label}</DialogTitle>
                    <DialogDescription className="text-[12px]">{PROVIDER_META[modalProvider].subtitle}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Provider 类型 3 选 1 */}
	                <div>
	                  <Label className="text-[12px] font-medium text-ink-2">Provider 类型</Label>
	                  {isMobile ? (
                    <div className="mt-1.5">
                      <BottomSheetSelect
                        title="Provider 类型"
                        value={modalProvider}
                        onChange={(value) => {
                          if (typeof value === 'string') setModalProvider(value as ProviderId);
                        }}
                        options={(Object.keys(PROVIDER_META) as ProviderId[]).map((p) => ({
                          id: p,
                          label: PROVIDER_META[p].label,
                          description: PROVIDER_META[p].subtitle,
                          icon: Cpu,
                        }))}
                        trigger={
                          <button
                            type="button"
                            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-brand bg-brand-soft px-3 py-2 text-[13px] font-medium text-brand-text"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Cpu className="h-4 w-4" />
                              {PROVIDER_META[modalProvider].label}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-70" />
                          </button>
                        }
                      />
                    </div>
                  ) : (
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(Object.keys(PROVIDER_META) as ProviderId[]).map((p) => {
                      const active = p === modalProvider;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setModalProvider(p)}
	                          className={cn(
	                            "min-h-11 rounded-[12px] border px-3 py-2 text-[12px] font-medium transition-colors",
                            active
                              ? "border-brand bg-brand-soft text-brand-text"
                              : "border-border bg-surface text-ink-2 hover:border-brand-soft"
                          )}
                        >
                          {PROVIDER_META[p].label}
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>

                {/* API 地址 */}
                <div>
                  <Label className="text-[12px] font-medium text-ink-2">API 地址</Label>
	                  <Input
	                    className="mt-1.5 min-h-11"
                    value={modalProvider === 'gpt' ? apiSettings.gptApiUrl : modalProvider === 'gemini' ? apiSettings.geminiBaseUrl : apiSettings.jimengBaseUrl}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (modalProvider === 'gpt') handleInputChange('gptApiUrl', v);
                      else if (modalProvider === 'gemini') handleInputChange('geminiBaseUrl', v);
                      else handleInputChange('jimengBaseUrl', v);
                    }}
                    placeholder={PROVIDER_META[modalProvider].defaultUrl}
                  />
                </div>

                {/* 模型列表 */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[12px] font-medium text-ink-2">模型（可多选启用）</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setProviderModels((prev) => ({
                          ...prev,
                          [modalProvider]: [...(prev[modalProvider] ?? []), { id: PROVIDER_META[modalProvider].defaultModel, enabled: true }],
                        }));
                      }}
	                      className="inline-flex min-h-10 items-center gap-1 px-1 text-[12px] font-medium text-brand-text hover:underline"
                    >
                      <Plus className="h-3 w-3" />
                      添加模型
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {(providerModels[modalProvider] ?? []).map((m, idx) => (
                      <div
                        key={idx}
	                        className={cn(
	                          "space-y-2 rounded-[10px] border bg-surface px-2 py-2",
                          m.enabled ? "border-brand/40" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2">
                        <Input
	                          className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                          value={m.id}
                          onChange={(e) => {
                            const v = e.target.value;
                            setProviderModels((prev) => ({
                              ...prev,
                              [modalProvider]: prev[modalProvider].map((mm, i) => (i === idx ? { ...mm, id: v } : mm)),
                            }));
                          }}
                          placeholder={PROVIDER_META[modalProvider].defaultModel}
                        />
                        <Switch
                          checked={m.enabled}
                          onCheckedChange={(checked) => {
                            setProviderModels((prev) => ({
                              ...prev,
                              [modalProvider]: prev[modalProvider].map((mm, i) => (i === idx ? { ...mm, enabled: checked } : mm)),
                            }));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setProviderModels((prev) => ({
                              ...prev,
                              [modalProvider]: prev[modalProvider].filter((_, i) => i !== idx),
                            }));
                          }}
	                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-danger/10 hover:text-danger"
                          aria-label="删除模型"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        </div>
                        <div className="inline-flex rounded-[8px] bg-surface-muted p-0.5">
                          {(['image', 'llm'] as ModelKind[]).map((k) => {
                            const active = (m.kind ?? 'image') === k;
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  setProviderModels((prev) => ({
                                    ...prev,
                                    [modalProvider]: prev[modalProvider].map((mm, i) => (i === idx ? { ...mm, kind: k } : mm)),
                                  }));
                                }}
                                className={cn(
                                  "rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors",
                                  active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2"
                                )}
                              >
                                {MODEL_KIND_LABEL[k]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {(providerModels[modalProvider] ?? []).length === 0 && (
                      <p className="text-[12px] text-ink-3">暂无模型，点击右上「+ 添加模型」</p>
                    )}
                  </div>
                </div>

                {/* API 密钥 */}
                <div>
                  <Label className="text-[12px] font-medium text-ink-2">API 密钥</Label>
                  <Input
	                    className="mt-1.5 min-h-11"
                    type="password"
                    value={modalProvider === 'gpt' ? apiSettings.gptApiKey : modalProvider === 'gemini' ? apiSettings.geminiApiKey : apiSettings.arkApiKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (modalProvider === 'gpt') handleInputChange('gptApiKey', v);
                      else if (modalProvider === 'gemini') handleInputChange('geminiApiKey', v);
                      else handleInputChange('arkApiKey', v);
                    }}
                    placeholder={PROVIDER_META[modalProvider].keyPlaceholder}
                  />
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-center text-danger hover:bg-danger/10 hover:text-danger sm:w-auto"
                  onClick={() => {
                    if (!modalProvider) return;
                    setProviderModels((prev) => ({ ...prev, [modalProvider]: [] }));
                    if (modalProvider === 'gpt') {
                      handleInputChange('gptApiKey', '');
                    } else if (modalProvider === 'gemini') {
                      handleInputChange('geminiApiKey', '');
                    } else {
                      handleInputChange('arkApiKey', '');
                    }
                  }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  删除 Provider
                </Button>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button variant="outline" className="min-h-11" onClick={() => setModalProvider(null)}>取消</Button>
                  <Button
                    className="min-h-11 bg-accent-gradient text-white hover:opacity-90"
                    onClick={async () => {
                      await handleSave();
                      setModalProvider(null);
                    }}
                    disabled={isSaving}
                  >
                    {isSaving ? '保存中…' : '保存配置'}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
