
import { useState } from 'react';
import { Zap, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ImageUpscalingPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
}

const ImageUpscalingPanel = ({ uploadedImages, referenceImage }: ImageUpscalingPanelProps) => {
  const [upscaleRatio, setUpscaleRatio] = useState([2]);
  const [model, setModel] = useState('auto');
  const [enhanceDetails, setEnhanceDetails] = useState(true);

  const handleProcess = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始高清化处理', { 
      images: uploadedImages, 
      reference: referenceImage,
      ratio: upscaleRatio[0],
      model,
      enhanceDetails
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <Card className="border-0 bg-gradient-to-br from-green-100/80 to-emerald-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
              AI高清化
            </span>
          </CardTitle>
          <CardDescription className="text-green-700/80">
            使用先进AI算法，智能提升图片分辨率和细节
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upscale Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-green-700">
                放大倍数: {upscaleRatio[0]}x
              </Label>
              <div className="px-2">
                <Slider
                  value={upscaleRatio}
                  onValueChange={setUpscaleRatio}
                  max={4}
                  min={1.5}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-green-600/70 mt-1">
                  <span>1.5x</span>
                  <span>标准</span>
                  <span>4.0x</span>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-green-700">AI模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">智能选择</SelectItem>
                  <SelectItem value="photo">真实照片</SelectItem>
                  <SelectItem value="artwork">艺术作品</SelectItem>
                  <SelectItem value="anime">动漫插画</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enhance Details Toggle */}
          <div className="flex items-center justify-between p-4 bg-white/30 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-green-700">细节增强</Label>
              <p className="text-xs text-green-600/70">进一步优化图片细节和纹理</p>
            </div>
            <Switch
              checked={enhanceDetails}
              onCheckedChange={setEnhanceDetails}
            />
          </div>

          <Button 
            onClick={handleProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg mt-6"
            size="lg"
          >
            开始高清化处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 bg-gradient-to-br from-green-50/80 to-emerald-50/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Settings className="w-5 h-5 text-green-600" />
            <span className="text-green-700">处理建议</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-green-600">
            <li>• 2x放大适合日常使用，4x放大适合专业需求</li>
            <li>• 选择正确的AI模型可显著提升效果</li>
            <li>• 细节增强功能会增加处理时间但效果更佳</li>
            <li>• 建议先小批量测试，满意后再批量处理</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageUpscalingPanel;
