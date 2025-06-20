
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface ImageUpscalingPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
  onProcess: (settings: any) => void;
}

const ImageUpscalingPanel = ({ uploadedImages, referenceImage, onProcess }: ImageUpscalingPanelProps) => {
  const [upscaleRatio, setUpscaleRatio] = useState([2]);
  const [model, setModel] = useState('auto');
  const [enhanceDetails, setEnhanceDetails] = useState(true);

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upscale Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-800">
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
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>1.5x</span>
                  <span>标准</span>
                  <span>4.0x</span>
                </div>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-800">AI模型</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="border-gray-200 focus:border-amber-400">
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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-gray-800">细节增强</Label>
              <p className="text-xs text-gray-600">进一步优化图片细节和纹理</p>
            </div>
            <Switch
              checked={enhanceDetails}
              onCheckedChange={setEnhanceDetails}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUpscalingPanel;
