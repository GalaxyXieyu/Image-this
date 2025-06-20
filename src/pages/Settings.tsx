import { useState } from 'react';
import { Settings as SettingsIcon, Palette, Zap, Database, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const Settings = () => {
  const [settings, setSettings] = useState({
    // GPT-4o 设置
    gptApiUrl: 'https://api.openai.com/v1/chat/completions',
    gptApiKey: '',
    gptModel: 'gpt-4o',
    defaultSeed: 123456,
    enableReview: true,
    maxReviewAttempts: 3,
    
    // 通义千问设置
    qwenApiKey: '',
    tempFileServerUrl: '',
    useBase64Upload: true,
    
    // 扩图默认参数
    defaultXScale: 2.0,
    defaultYScale: 2.0,
    bestQuality: false,
    limitImageSize: true,
    
    // 高清放大默认参数
    defaultUpscaleFactor: 2,
    upscalePrompt: '图像超分。',
    
    // 背景替换设置
    defaultBackgroundPrompt: '纯白色背景，简约风格，专业产品摄影',
    backgroundStyle: 'professional',
    
    // 自动保存设置
    autoSave: true,
    saveOriginal: true,
    compressionQuality: 95
  });

  const handleSave = () => {
    console.log('保存设置:', settings);
    localStorage.setItem('aiImageSettings', JSON.stringify(settings));
  };

  return (
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">设置中心</h1>
        <p className="text-muted-foreground">配置AI模型参数和API设置</p>
      </div>

      <Tabs defaultValue="api" className="h-full">
        <TabsList className="grid w-fit grid-cols-4 bg-muted/50 mb-6">
          <TabsTrigger value="api" className="data-[state=active]:bg-background">
            <Key className="w-4 h-4 mr-2" />
            API配置
          </TabsTrigger>
          <TabsTrigger value="prompts" className="data-[state=active]:bg-background">
            <Palette className="w-4 h-4 mr-2" />
            提示词配置
          </TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-background">
            <Zap className="w-4 h-4 mr-2" />
            模型参数
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-background">
            <Database className="w-4 h-4 mr-2" />
            系统设置
          </TabsTrigger>
        </TabsList>

        <div className="space-y-6">
          <TabsContent value="api" className="mt-0">
            <div className="space-y-6">
              {/* GPT-4o API 配置 */}
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span>GPT-4o 图像生成API</span>
                  </CardTitle>
                  <CardDescription>
                    配置GPT-4o图像生成API的连接参数
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gpt-api-url">API地址</Label>
                      <Input
                        id="gpt-api-url"
                        placeholder="https://api.openai.com/v1/chat/completions"
                        value={settings.gptApiUrl}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, gptApiUrl: e.target.value }))
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="gpt-api-key">API密钥</Label>
                      <Input
                        id="gpt-api-key"
                        type="password"
                        placeholder="输入您的GPT API密钥"
                        value={settings.gptApiKey}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, gptApiKey: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gpt-model">GPT模型</Label>
                        <Select 
                          value={settings.gptModel} 
                          onValueChange={(value) => 
                            setSettings(prev => ({ ...prev, gptModel: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                            <SelectItem value="gpt-4-vision-preview">GPT-4 Vision</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="default-seed">默认种子</Label>
                        <Input
                          id="default-seed"
                          type="number"
                          value={settings.defaultSeed}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, defaultSeed: parseInt(e.target.value) }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <Label>启用图像审核</Label>
                        <p className="text-sm text-muted-foreground">
                          自动检查生成图像质量并重试
                        </p>
                      </div>
                      <Switch
                        checked={settings.enableReview}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, enableReview: checked }))
                        }
                      />
                    </div>

                    {settings.enableReview && (
                      <div className="space-y-2">
                        <Label htmlFor="max-review-attempts">最大审核重试次数</Label>
                        <Input
                          id="max-review-attempts"
                          type="number"
                          min="1"
                          max="10"
                          value={settings.maxReviewAttempts}
                          onChange={(e) => 
                            setSettings(prev => ({ ...prev, maxReviewAttempts: parseInt(e.target.value) }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 通义千问 API 配置 */}
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <span>通义千问API (扩图/高清化)</span>
                  </CardTitle>
                  <CardDescription>
                    配置阿里云通义千问DashScope API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qwen-api-key">通义千问API密钥</Label>
                    <Input
                      id="qwen-api-key"
                      type="password"
                      placeholder="输入您的DashScope API密钥"
                      value={settings.qwenApiKey}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, qwenApiKey: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="temp-server-url">临时文件服务器地址 (可选)</Label>
                    <Input
                      id="temp-server-url"
                      placeholder="https://your-temp-server.com/upload"
                      value={settings.tempFileServerUrl}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, tempFileServerUrl: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      留空将使用Base64内联方式传输图片
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="space-y-1">
                      <Label>使用Base64上传</Label>
                      <p className="text-sm text-muted-foreground">
                        直接在请求中发送Base64编码的图片
                      </p>
                    </div>
                    <Switch
                      checked={settings.useBase64Upload}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, useBase64Upload: checked }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="models" className="mt-0">
            <div className="space-y-6">
              {/* 扩图参数 */}
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>扩图默认参数</CardTitle>
                  <CardDescription>配置图像扩图的默认参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="x-scale">X轴扩展倍数: {settings.defaultXScale}x</Label>
                      <input
                        id="x-scale"
                        type="range"
                        min="1.2"
                        max="3.0"
                        step="0.1"
                        value={settings.defaultXScale}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, defaultXScale: parseFloat(e.target.value) }))
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="y-scale">Y轴扩展倍数: {settings.defaultYScale}x</Label>
                      <input
                        id="y-scale"
                        type="range"
                        min="1.2"
                        max="3.0"
                        step="0.1"
                        value={settings.defaultYScale}
                        onChange={(e) => 
                          setSettings(prev => ({ ...prev, defaultYScale: parseFloat(e.target.value) }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <Label>最佳质量</Label>
                        <p className="text-sm text-muted-foreground">启用最高质量模式</p>
                      </div>
                      <Switch
                        checked={settings.bestQuality}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, bestQuality: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-1">
                        <Label>限制图像大小</Label>
                        <p className="text-sm text-muted-foreground">避免生成过大图像</p>
                      </div>
                      <Switch
                        checked={settings.limitImageSize}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, limitImageSize: checked }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 高清化参数 */}
              <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>高清化默认参数</CardTitle>
                  <CardDescription>配置图像高清化的默认参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="upscale-factor">放大倍数: {settings.defaultUpscaleFactor}x</Label>
                    <input
                      id="upscale-factor"
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={settings.defaultUpscaleFactor}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, defaultUpscaleFactor: parseInt(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upscale-prompt">高清化提示词</Label>
                    <Input
                      id="upscale-prompt"
                      value={settings.upscalePrompt}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, upscalePrompt: e.target.value }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
