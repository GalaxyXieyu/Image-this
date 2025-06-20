
import { useState } from 'react';
import { Expand, AspectRatio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImageExpansionPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
}

const ImageExpansionPanel = ({ uploadedImages, referenceImage }: ImageExpansionPanelProps) => {
  const [settings, setSettings] = useState({
    expandRatio: [1.5],
    direction: 'all',
    aspectRatio: 'keep'
  });

  const handleProcess = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始扩图处理', { 
      images: uploadedImages, 
      reference: referenceImage,
      settings
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <Card className="border-0 bg-gradient-to-br from-orange-100/80 to-red-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Expand className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-orange-700 to-red-700 bg-clip-text text-transparent">
              AI智能扩图
            </span>
          </CardTitle>
          <CardDescription className="text-orange-700/80">
            AI智能扩展图片内容，保持画面自然
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 shadow-lg"
            size="lg"
          >
            开始扩图 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expansion Settings */}
        <Card className="border-0 bg-gradient-to-br from-orange-50/80 to-red-50/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-700">扩图设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-orange-700">
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

            <div className="space-y-3">
              <Label className="text-sm font-medium text-orange-700">扩展方向</Label>
              <Select 
                value={settings.direction} 
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, direction: value }))
                }
              >
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全方向扩展</SelectItem>
                  <SelectItem value="horizontal">水平扩展</SelectItem>
                  <SelectItem value="vertical">垂直扩展</SelectItem>
                  <SelectItem value="left">向左扩展</SelectItem>
                  <SelectItem value="right">向右扩展</SelectItem>
                  <SelectItem value="top">向上扩展</SelectItem>
                  <SelectItem value="bottom">向下扩展</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Aspect Ratio Settings */}
        <Card className="border-0 bg-gradient-to-br from-red-50/80 to-orange-50/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <AspectRatio className="w-5 h-5 text-red-600" />
              <span className="text-red-700">画面比例</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-red-700">目标比例</Label>
              <Select 
                value={settings.aspectRatio} 
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, aspectRatio: value }))
                }
              >
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">保持原比例</SelectItem>
                  <SelectItem value="16:9">16:9 (宽屏)</SelectItem>
                  <SelectItem value="4:3">4:3 (标准)</SelectItem>
                  <SelectItem value="1:1">1:1 (正方形)</SelectItem>
                  <SelectItem value="9:16">9:16 (竖屏)</SelectItem>
                  <SelectItem value="3:4">3:4 (竖版标准)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImageExpansionPanel;
