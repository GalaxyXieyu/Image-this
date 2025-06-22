'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Navbar from '@/components/navigation/Navbar';
import { Save, Key, Database, Cloud } from 'lucide-react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [apiSettings, setApiSettings] = useState({
    gptApiUrl: '',
    gptApiKey: '',
    qwenApiKey: '',
    minioEndpoint: '',
    minioAccessKey: '',
    minioSecretKey: '',
    minioBucketName: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    // 从localStorage加载设置
    const savedSettings = localStorage.getItem('apiSettings');
    if (savedSettings) {
      setApiSettings(JSON.parse(savedSettings));
    }
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
      // 保存到localStorage
      localStorage.setItem('apiSettings', JSON.stringify(apiSettings));
      
      // 这里可以添加保存到服务器的逻辑
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      
      alert('设置已保存！');
    } catch (error) {
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setApiSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="text-gray-600 mt-2">配置AI图像处理服务的API密钥和参数</p>
        </div>

        <div className="space-y-6">
          {/* GPT API 设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2 text-blue-600" />
                GPT API 配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* 通义千问 API 设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2 text-green-600" />
                通义千问 API 配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="qwenApiKey">API 密钥</Label>
                <Input
                  id="qwenApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={apiSettings.qwenApiKey}
                  onChange={(e) => handleInputChange('qwenApiKey', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* MinIO 设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cloud className="w-5 h-5 mr-2 text-purple-600" />
                MinIO 存储配置 (可选)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="minioEndpoint">MinIO 端点</Label>
                <Input
                  id="minioEndpoint"
                  placeholder="http://localhost:9000"
                  value={apiSettings.minioEndpoint}
                  onChange={(e) => handleInputChange('minioEndpoint', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minioAccessKey">Access Key</Label>
                  <Input
                    id="minioAccessKey"
                    placeholder="minioadmin"
                    value={apiSettings.minioAccessKey}
                    onChange={(e) => handleInputChange('minioAccessKey', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minioSecretKey">Secret Key</Label>
                  <Input
                    id="minioSecretKey"
                    type="password"
                    placeholder="minioadmin123"
                    value={apiSettings.minioSecretKey}
                    onChange={(e) => handleInputChange('minioSecretKey', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="minioBucketName">存储桶名称</Label>
                <Input
                  id="minioBucketName"
                  placeholder="imagine-this"
                  value={apiSettings.minioBucketName}
                  onChange={(e) => handleInputChange('minioBucketName', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 用户信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="w-5 h-5 mr-2 text-gray-600" />
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

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="min-w-[120px]"
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
        </div>
      </div>
    </div>
  );
}