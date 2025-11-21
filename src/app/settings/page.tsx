'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/navigation/Navbar';
import { Save, Key, Database, Zap, Sparkles, User, Image } from 'lucide-react';

type SettingSection = 'volcengine' | 'gpt' | 'gemini' | 'imagehosting' | 'profile';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeSection, setActiveSection] = useState<SettingSection>('volcengine');
  
  const [apiSettings, setApiSettings] = useState({
    // 火山引擎配置
    volcengineEnabled: false,
    volcengineAccessKey: '',
    volcengineSecretKey: '',
    // GPT 配置
    gptEnabled: false,
    gptApiUrl: 'https://yunwu.ai',
    gptApiKey: '',
    // Gemini 配置（预留）
    geminiEnabled: false,
    geminiApiKey: '',
    geminiProjectId: '',
    // 图床配置
    imagehostingEnabled: false,
    superbedToken: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const menuItems = [
    { 
      id: 'volcengine' as SettingSection, 
      label: '火山引擎', 
      subtitle: '画质增强、智能扩图',
      icon: Zap, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500'
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
      id: 'gpt' as SettingSection, 
      label: 'GPT API', 
      subtitle: '背景替换、图片生成',
      icon: Key, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500'
    },
    { 
      id: 'gemini' as SettingSection, 
      label: 'Google Gemini', 
      subtitle: '即将支持',
      icon: Sparkles, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-500'
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
              geminiProjectId: '',
              imagehostingEnabled: data.config.imagehosting?.enabled || false,
              superbedToken: data.config.imagehosting?.superbedToken || ''
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
          projectId: apiSettings.geminiProjectId
        },
        imagehosting: {
          enabled: apiSettings.imagehostingEnabled,
          superbedToken: apiSettings.superbedToken
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

  const renderContent = () => {
    switch (activeSection) {
      case 'volcengine':
        return (
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
        );

      case 'gpt':
        return (
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
        );

      case 'imagehosting':
        return (
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
        );

      case 'gemini':
        return (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  Google Gemini（即将支持）
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
                <Label htmlFor="geminiApiKey">API 密钥</Label>
                <Input
                  id="geminiApiKey"
                  type="password"
                  placeholder="AI..."
                  value={apiSettings.geminiApiKey}
                  onChange={(e) => handleInputChange('geminiApiKey', e.target.value)}
                  disabled={!apiSettings.geminiEnabled}
                />
              </div>
              <div>
                <Label htmlFor="geminiProjectId">Project ID（可选）</Label>
                <Input
                  id="geminiProjectId"
                  placeholder="your-project-id"
                  value={apiSettings.geminiProjectId}
                  onChange={(e) => handleInputChange('geminiProjectId', e.target.value)}
                  disabled={!apiSettings.geminiEnabled}
                />
              </div>
            </CardContent>
          </Card>
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
            {activeSection !== 'profile' && (
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
    </div>
  );
}