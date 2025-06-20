
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
    <div className="space-y-4">
      {/* One-Click Enhancement */}
      <Card className="border-0 bg-gradient-to-br from-amber-100/80 to-orange-200/80 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Wand2 className="w-3 h-3 text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
              一键AI增强
            </span>
          </CardTitle>
          <CardDescription className="text-amber-700/80">
            换背景 + 扩图 + 高清放大
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleOneClickEnhance}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0 shadow-lg"
            size="lg"
          >
            开始处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Simple Settings */}
      <div className="space-y-3">
        <h3 className="font-semibold bg-gradient-to-r from-red-700 to-pink-700 bg-clip-text text-transparent">
          基础参数
        </h3>
        
        {/* Expand Ratio */}
        <Card className="border-0 bg-gradient-to-br from-red-50/80 to-pink-50/80 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-red-700">
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
                className="w-full [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-red-200 [&>span:first-child]:to-pink-200 [&>span:first-child>span]:bg-gradient-to-r [&>span:first-child>span]:from-red-500 [&>span:first-child>span]:to-pink-500 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-red-500 [&>span:last-child]:to-pink-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Upscale Ratio */}
        <Card className="border-0 bg-gradient-to-br from-pink-50/80 to-red-50/80 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-pink-700">
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
                className="w-full [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-pink-200 [&>span:first-child]:to-red-200 [&>span:first-child>span]:bg-gradient-to-r [&>span:first-child>span]:from-pink-500 [&>span:first-child>span]:to-red-500 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-pink-500 [&>span:last-child]:to-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SimpleEnhancementPanel;
