
import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SimpleEnhancementPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
}

const SimpleEnhancementPanel = ({ uploadedImages, referenceImage }: SimpleEnhancementPanelProps) => {
  const [settings, setSettings] = useState({
    expandRatio: [1.5],
    upscaleRatio: [2]
  });

  const handleOneClickEnhance = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始一键增强处理', { 
      images: uploadedImages, 
      reference: referenceImage,
      settings 
    });
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

      {/* Simple Settings */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">基础参数</h3>
        
        {/* Expand Ratio */}
        <Card className="border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                扩图比例: {settings.expandRatio[0]}x
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
          </CardContent>
        </Card>

        {/* Upscale Ratio */}
        <Card className="border-0 bg-muted/30">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                高清放大: {settings.upscaleRatio[0]}x
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleEnhancementPanel;
