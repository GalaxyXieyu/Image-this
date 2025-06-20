
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ImageExpansionPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
  onProcess: (settings: any) => void;
}

const ImageExpansionPanel = ({ uploadedImages, referenceImage, onProcess }: ImageExpansionPanelProps) => {
  const [expandRatio, setExpandRatio] = useState([1.5]);
  const [direction, setDirection] = useState('all');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Expand Ratio */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-800">
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
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>1.2x</span>
                <span>适中</span>
                <span>3.0x</span>
              </div>
            </div>
          </div>

          {/* Direction */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-800">扩展方向</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="border-gray-200 focus:border-amber-400">
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
      </CardContent>
    </Card>
  );
};

export default ImageExpansionPanel;
