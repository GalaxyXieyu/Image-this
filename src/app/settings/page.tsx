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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Navbar from '@/components/navigation/Navbar';
import { Save, Key, Zap, Sparkles, User, Image, FileText, Plus, Edit, Trash2, Star, StarOff, Cpu, HardDrive, FolderOpen, Folder } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type SettingSection = 'models' | 'imagehosting' | 'profile' | 'prompts';

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
    volcengineEnabled: false,
    volcengineAccessKey: '',
    volcengineSecretKey: '',
    // GPT 配置
    gptEnabled: false,
    gptApiUrl: 'https://yunwu.ai',
    gptApiKey: '',
    // Gemini 配置
    geminiEnabled: false,
    geminiApiKey: '',
    geminiBaseUrl: 'https://yunwu.ai',
    // 图床配置
    imagehostingEnabled: false,
    superbedToken: '',
    // 本地存储配置
    localStoragePath: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const menuItems = [
    { 
      id: 'models' as SettingSection, 
      label: 'AI模型配置', 
      subtitle: '文生图、图生图、扩图',
      icon: Cpu, 
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-500'
    },
    { 
      id: 'imagehosting' as SettingSection, 
      label: '图床服务', 
      subtitle: '图片存储和访问',
      icon: Image, 
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500'
    },
    { 
      id: 'prompts' as SettingSection, 
      label: '提示词模板', 
      subtitle: '管理 AI 提示词',
      icon: FileText, 
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-500'
    },
    { 
      id: 'profile' as SettingSection, 
      label: '用户信息', 
      subtitle: '查看账户信息',
      icon: User, 
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-500'
    },
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    // 从后端API加载设置
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setApiSettings({
              volcengineEnabled: data.config.volcengine?.enabled || false,
              volcengineAccessKey: data.config.volcengine?.accessKey || '',
              volcengineSecretKey: data.config.volcengine?.secretKey || '',
              gptEnabled: false,
              gptApiUrl: 'https://yunwu.ai',
              gptApiKey: '',
              geminiEnabled: false,
              geminiApiKey: '',
              geminiBaseUrl: 'https://yunwu.ai',
              imagehostingEnabled: data.config.imagehosting?.enabled || false,
              superbedToken: data.config.imagehosting?.superbedToken || '',
              localStoragePath: data.config.localStorage?.savePath || ''
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
          <p className="text-gray-600">加载中...</p>
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
      // 转换为标准配置格式
      const config = {
        volcengine: {
          enabled: apiSettings.volcengineEnabled,
          accessKey: apiSettings.volcengineAccessKey,
          secretKey: apiSettings.volcengineSecretKey
        },
        gpt: {
          enabled: apiSettings.gptEnabled,
          apiUrl: apiSettings.gptApiUrl,
          apiKey: apiSettings.gptApiKey
        },
        gemini: {
          enabled: apiSettings.geminiEnabled,
          apiKey: apiSettings.geminiApiKey,
          baseUrl: apiSettings.geminiBaseUrl
        },
        imagehosting: {
          enabled: apiSettings.imagehostingEnabled,
          superbedToken: apiSettings.superbedToken
        },
        localStorage: {
          savePath: apiSettings.localStoragePath
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

  const handleInputChange = (field: string, value: string | boolean) => {
    setApiSettings(prev => ({
      ...prev,
      [field]: value
    }));
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
            {/* 火山引擎配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-orange-600" />
                    火山引擎（Volcengine）
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={apiSettings.volcengineEnabled}
                      onChange={(e) => handleInputChange('volcengineEnabled', e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  支持：画质增强、智能扩图
                </div>
                <div>
                  <Label htmlFor="volcengineAccessKey">Access Key</Label>
                  <Input
                    id="volcengineAccessKey"
                    placeholder="AKLT..."
                    value={apiSettings.volcengineAccessKey}
                    onChange={(e) => handleInputChange('volcengineAccessKey', e.target.value)}
                    disabled={!apiSettings.volcengineEnabled}
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
                    disabled={!apiSettings.volcengineEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* GPT API配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Key className="w-5 h-5 mr-2 text-blue-600" />
                    GPT API
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={apiSettings.gptEnabled}
                      onChange={(e) => handleInputChange('gptEnabled', e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  支持：背景替换、图片生成
                </div>
                <div>
                  <Label htmlFor="gptApiUrl">API 地址</Label>
                  <Input
                    id="gptApiUrl"
                    placeholder="https://yunwu.ai"
                    value={apiSettings.gptApiUrl}
                    onChange={(e) => handleInputChange('gptApiUrl', e.target.value)}
                    disabled={!apiSettings.gptEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="gptApiKey">API 密钥</Label>
                  <Input
                    id="gptApiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiSettings.gptApiKey}
                    onChange={(e) => handleInputChange('gptApiKey', e.target.value)}
                    disabled={!apiSettings.gptEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Google Gemini配置 */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    Google Gemini
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={apiSettings.geminiEnabled}
                      onChange={(e) => handleInputChange('geminiEnabled', e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  支持：图片生成、图片理解（即将推出）
                </div>
                <div>
                  <Label htmlFor="geminiBaseUrl">API 地址</Label>
                  <Input
                    id="geminiBaseUrl"
                    placeholder="https://yunwu.ai"
                    value={apiSettings.geminiBaseUrl}
                    onChange={(e) => handleInputChange('geminiBaseUrl', e.target.value)}
                    disabled={!apiSettings.geminiEnabled}
                  />
                  <p className="text-xs text-gray-500 mt-1">Gemini API 的基础 URL</p>
                </div>
                <div>
                  <Label htmlFor="geminiApiKey">API 密钥</Label>
                  <Input
                    id="geminiApiKey"
                    type="password"
                    placeholder="sk-..."
                    value={apiSettings.geminiApiKey}
                    onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                    disabled={!apiSettings.geminiEnabled}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'imagehosting':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Image className="w-5 h-5 mr-2 text-green-600" />
                    图床服务
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={apiSettings.imagehostingEnabled}
                      onChange={(e) => handleInputChange('imagehostingEnabled', e.target.checked)}
                    />
                    <span className="text-sm text-gray-600">启用</span>
                  </label>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
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
                    disabled={!apiSettings.imagehostingEnabled}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    访问 <a href="https://superbed.cn/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">superbed.cn</a> 获取 API Token
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 本地存储配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <div className="flex items-center">
                    <HardDrive className="w-5 h-5 mr-2 text-blue-600" />
                    本地存储配置
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
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
                  <div className="text-xs text-gray-500 mt-2 space-y-1">
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
                <p className="text-gray-600">加载中...</p>
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
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                      )}
                      <div className="bg-gray-50 p-3 rounded-md border border-gray-200 mb-4">
                        <p className="text-xs text-gray-700 line-clamp-3">{template.prompt}</p>
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
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">暂无提示词模板</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    创建第一个模板
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600" />
                用户信息
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>邮箱</Label>
                <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border">
                  {session.user?.email}
                </div>
              </div>
              <div>
                <Label>用户ID</Label>
                <div className="text-gray-700 bg-gray-50 px-3 py-2 rounded border font-mono text-sm">
                  {session.user?.id}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-2">管理您的 AI 服务配置和账户信息</p>
        </div>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* 左侧边栏 */}
          <aside className="w-72 flex-shrink-0">
            <div className="h-full">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
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
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {/* 左侧高亮边框 */}
                        {isActive && (
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.borderColor.replace('border-', 'bg-')} rounded-r-sm`}></div>
                        )}
                        
                        <Icon className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${isActive ? item.color : 'text-gray-400 group-hover:text-gray-600'}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium leading-tight ${isActive ? item.color : 'text-gray-900'}`}>
                            {item.label}
                          </div>
                          <div className={`text-xs mt-1 leading-tight ${isActive ? 'text-gray-600' : 'text-gray-500'}`}>
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
            {activeSection !== 'profile' && activeSection !== 'prompts' && (
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