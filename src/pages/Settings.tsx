
import { useState } from 'react';
import { Settings as SettingsIcon, Palette, Zap, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const Settings = () => {
  const [settings, setSettings] = useState({
    // 背景替换设置
    defaultBackgroundPrompt: '纯白色背景，简约风格，专业产品摄影',
    backgroundStyle: 'professional',
    
    // API设置
    apiEndpoint: 'https://api.example.com/v1',
    apiKey: '',
    
    // 模型配置
    backgroundModel: 'stable-diffusion-xl',
    upscaleModel: 'real-esrgan-x4',
    expandModel: 'outpainting-v2',
    
    // 自动保存设置
    autoSave: true,
    saveOriginal: true,
    compressionQuality: 95
  });

  const handleSave = () => {
    console.log('保存设置:', settings);
    // 这里会调用API保存设置
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">设置中心</h1>
        <p className="text-muted-foreground">配置AI模型参数和系统设置</p>
      </div>

      <Tabs defaultValue="prompts" className="h-full">
        <TabsList className="grid w-fit grid-cols-3 bg-muted/50 mb-6">
          <TabsTrigger value="prompts" className="data-[state=active]:bg-background">
            提示词配置
          </TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-background">
            模型设置
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-background">
            系统设置
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          <TabsContent value="prompts" className="mt-0">
            <div className="space-y-6">
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="w-5 h-5 text-primary" />
                    <span>背景替换提示词</span>
                  </CardTitle>
                  <CardDescription>
                    配置默认的背景替换提示词，支持多种风格
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-prompt">默认提示词</Label>
                    <Textarea
                      id="default-prompt"
                      placeholder="描述想要的背景效果..."
                      value={settings.defaultBackgroundPrompt}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, defaultBackgroundPrompt: e.target.value }))
                      }
                      className="h-20 resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>预设风格</Label>
                      <div className="space-y-2">
                        {[
                          { id: 'professional', label: '专业产品', prompt: '纯白色背景，专业产品摄影' },
                          { id: 'natural', label: '自然风景', prompt: '自然风景背景，蓝天白云' },
                          { id: 'studio', label: '影棚风格', prompt: '影棚灯光，渐变背景' },
                          { id: 'artistic', label: '艺术风格', prompt: '抽象艺术背景，色彩丰富' }
                        ].map((style) => (
                          <Button
                            key={style.id}
                            variant="outline"
                            size="sm"
                            className="justify-start h-auto p-3 text-left"
                            onClick={() => 
                              setSettings(prev => ({ 
                                ...prev, 
                                defaultBackgroundPrompt: style.prompt,
                                backgroundStyle: style.id
                              }))
                            }
                          >
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-xs text-muted-foreground">{style.prompt}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="models" className="mt-0">
            <div className="space-y-6">
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span>AI模型配置</span>
                  </CardTitle>
                  <CardDescription>
                    配置不同功能使用的AI模型
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bg-model">背景替换模型</Label>
                      <Input
                        id="bg-model"
                        value={settings.backgroundModel}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, backgroundModel: e.target.value }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="upscale-model">高清放大模型</Label>
                      <Input
                        id="upscale-model"
                        value={settings.upscaleModel}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, upscaleModel: e.target.value }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="expand-model">图片扩展模型</Label>
                      <Input
                        id="expand-model"
                        value={settings.expandModel}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, expandModel: e.target.value }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="api-endpoint">API地址</Label>
                      <Input
                        id="api-endpoint"
                        value={settings.apiEndpoint}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, apiEndpoint: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API密钥</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="输入您的API密钥"
                      value={settings.apiKey}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, apiKey: e.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="mt-0">
            <div className="space-y-6">
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5 text-primary" />
                    <span>系统设置</span>
                  </CardTitle>
                  <CardDescription>
                    配置保存和处理选项
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>自动保存结果</Label>
                      <p className="text-sm text-muted-foreground">
                        处理完成后自动保存到图片库
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoSave}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, autoSave: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>保留原图</Label>
                      <p className="text-sm text-muted-foreground">
                        同时保存原始图片和处理结果
                      </p>
                    </div>
                    <Switch
                      checked={settings.saveOriginal}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, saveOriginal: checked }))
                      }
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="quality">图片压缩质量 ({settings.compressionQuality}%)</Label>
                    <input
                      id="quality"
                      type="range"
                      min="60"
                      max="100"
                      value={settings.compressionQuality}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, compressionQuality: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>

        <div className="flex justify-end pt-6 border-t border-border/50">
          <Button onClick={handleSave} className="px-8">
            保存设置
          </Button>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
