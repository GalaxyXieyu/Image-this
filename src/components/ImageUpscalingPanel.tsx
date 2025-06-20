
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
      <Card className="border-0 warm-gradient shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-amber-800">
              AI高清化
            </span>
          </CardTitle>
          <CardDescription className="text-amber-700">
            使用先进AI算法，智能提升图片分辨率和细节
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upscale Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-amber-800">
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
                <div className="flex justify-between text-xs text-amber-600 mt-2">
                  <span>1.5x</span>
                  <span>标准</span>
                  <span>4.0x</span>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-amber-800">AI模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="glass-effect border-amber-200 focus:border-amber-400">
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
          <div className="flex items-center justify-between p-4 glass-effect rounded-lg border border-amber-200/30">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-amber-800">细节增强</Label>
              <p className="text-xs text-amber-600">进一步优化图片细节和纹理</p>
            </div>
            <Switch
              checked={enhanceDetails}
              onCheckedChange={setEnhanceDetails}
            />
          </div>

          <Button 
            onClick={handleProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg hover-lift mt-6"
            size="lg"
          >
            开始高清化处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 warm-gradient-soft shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Settings className="w-5 h-5 text-amber-600" />
            <span className="text-amber-800">处理建议</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-700">
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
