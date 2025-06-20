
import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface OneClickWorkflowPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
  onProcess: (settings: any) => void;
}

const OneClickWorkflowPanel = ({ uploadedImages, referenceImage, onProcess }: OneClickWorkflowPanelProps) => {
  const [settings, setSettings] = useState({
    expandRatio: [1.5],
    upscaleRatio: [2]
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Expand Settings */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-800 flex items-center space-x-2">
            <span>扩图设置</span>
            <Settings className="w-4 h-4 text-gray-600" />
          </CardTitle>
          <p className="text-xs text-gray-600">推荐1.5-2.0倍扩展比例获得最佳视觉效果</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-800">
              扩图比例: {settings.expandRatio[0]}x
            </Label>
            <div className="px-2">
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
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>1.2x</span>
                <span>推荐范围</span>
                <span>3.0x</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upscale Settings */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-gray-800 flex items-center space-x-2">
            <span>高清化设置</span>
            <Settings className="w-4 h-4 text-gray-600" />
          </CardTitle>
          <p className="text-xs text-gray-600">更高倍数需要更长处理时间，请合理选择</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-800">
              高清放大: {settings.upscaleRatio[0]}x
            </Label>
            <div className="px-2">
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
              <div className="flex justify-between text-xs text-gray-600 mt-2">
                <span>1.5x</span>
                <span>标准质量</span>
                <span>4.0x</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OneClickWorkflowPanel;
