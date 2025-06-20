
import { useState } from 'react';
import { Expand, Lightbulb } from 'lucide-react';
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
  const [expandRatio, setExpandRatio] = useState([1.5]);
  const [direction, setDirection] = useState('all');

  const handleProcess = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始扩图处理', { 
      images: uploadedImages, 
      reference: referenceImage,
      ratio: expandRatio[0],
      direction
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
              智能扩图
            </span>
          </CardTitle>
          <CardDescription className="text-orange-700/80">
            AI智能扩展图片边界，保持内容自然连贯
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expand Ratio */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-orange-700">
                扩图比例: {expandRatio[0]}x
              </Label>
              <div className="px-2">
                <Slider
                  value={expandRatio}
                  onValueChange={setExpandRatio}
                  max={3}
                  min={1.2}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-orange-600/70 mt-1">
                  <span>1.2x</span>
                  <span>适中</span>
                  <span>3.0x</span>
                </div>
              </div>
            </div>

            {/* Direction */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-orange-700">扩展方向</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">四周扩展</SelectItem>
                  <SelectItem value="horizontal">左右扩展</SelectItem>
                  <SelectItem value="vertical">上下扩展</SelectItem>
                  <SelectItem value="left">向左扩展</SelectItem>
                  <SelectItem value="right">向右扩展</SelectItem>
                  <SelectItem value="top">向上扩展</SelectItem>
                  <SelectItem value="bottom">向下扩展</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={handleProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 shadow-lg mt-6"
            size="lg"
          >
            开始扩图处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 bg-gradient-to-br from-orange-50/80 to-red-50/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Lightbulb className="w-5 h-5 text-orange-600" />
            <span className="text-orange-700">使用技巧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-orange-600">
            <li>• 建议扩图比例不超过2.5倍，以保证画面质量</li>
            <li>• 选择合适的扩展方向可以获得更自然的效果</li>
            <li>• 上传参考图片可以提供扩展风格参考</li>
            <li>• 处理时间根据图片尺寸和扩展比例而定</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageExpansionPanel;
