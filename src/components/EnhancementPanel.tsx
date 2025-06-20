
import { useState } from 'react';
import { Wand2, Palette, Expand, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

interface EnhancementPanelProps {
  uploadedImages: File[];
}

const EnhancementPanel = ({ uploadedImages }: EnhancementPanelProps) => {
  const [settings, setSettings] = useState({
    replaceBackground: true,
    expandImage: true,
    upscale: true,
    backgroundPrompt: '纯白色背景，简约风格',
    expandRatio: [1.5],
    upscaleRatio: [2]
  });

  const handleOneClickEnhance = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始一键增强处理', { images: uploadedImages, settings });
  };

  return (
    <div className="space-y-6">
      {/* One-Click Enhancement */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Wand2 className="w-5 h-5 text-primary" />
            <span>一键AI增强</span>
          </CardTitle>
          <CardDescription>
            换背景 + 扩图 + 高清放大
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleOneClickEnhance}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium"
            size="lg"
          >
            开始处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Individual Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">处理选项</h3>
        
        {/* Background Replace */}
        <Card className="border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4 text-primary" />
                <Label htmlFor="bg-replace" className="font-medium">背景替换</Label>
              </div>
              <Switch
                id="bg-replace"
                checked={settings.replaceBackground}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, replaceBackground: checked }))
                }
              />
            </div>
            {settings.replaceBackground && (
              <Textarea
                placeholder="描述想要的背景效果..."
                value={settings.backgroundPrompt}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, backgroundPrompt: e.target.value }))
                }
                className="h-20 resize-none bg-background/50"
              />
            )}
          </CardContent>
        </Card>

        {/* Image Expansion */}
        <Card className="border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Expand className="w-4 h-4 text-primary" />
                <Label htmlFor="expand" className="font-medium">图片扩展</Label>
              </div>
              <Switch
                id="expand"
                checked={settings.expandImage}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, expandImage: checked }))
                }
              />
            </div>
            {settings.expandImage && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  扩展比例: {settings.expandRatio[0]}x
                </Label>
                <Slider
                  value={settings.expandRatio}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, expandRatio: value }))
                  }
                  max={3}
                  min={1.2}
                  step={0.1}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upscaling */}
        <Card className="border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-primary" />
                <Label htmlFor="upscale" className="font-medium">高清放大</Label>
              </div>
              <Switch
                id="upscale"
                checked={settings.upscale}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, upscale: checked }))
                }
              />
            </div>
            {settings.upscale && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  放大倍数: {settings.upscaleRatio[0]}x
                </Label>
                <Slider
                  value={settings.upscaleRatio}
                  onValueChange={(value) => 
                    setSettings(prev => ({ ...prev, upscaleRatio: value }))
                  }
                  max={4}
                  min={1.5}
                  step={0.5}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancementPanel;
