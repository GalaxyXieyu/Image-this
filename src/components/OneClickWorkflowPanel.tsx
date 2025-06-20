
import { useState } from 'react';
import { Wand2, Info, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

interface OneClickWorkflowPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
}

const OneClickWorkflowPanel = ({ uploadedImages, referenceImage }: OneClickWorkflowPanelProps) => {
  const [settings, setSettings] = useState({
    backgroundPrompt: '纯白色背景',
    expandRatio: [1.5],
    upscaleRatio: [2]
  });

  const handleOneClickProcess = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始一键处理工作流', { 
      images: uploadedImages, 
      reference: referenceImage,
      settings 
    });
  };

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Background Settings */}
        <Card className="border-gray-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-gray-800 flex items-center space-x-2">
              <span>背景设置</span>
              <Info className="w-4 h-4 text-gray-600" />
            </CardTitle>
            <p className="text-xs text-gray-600">详细描述有助于获得更精准的背景效果</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-800">背景描述</Label>
              <Textarea
                value={settings.backgroundPrompt}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, backgroundPrompt: e.target.value }))
                }
                placeholder="例如：纯白色背景、办公室环境、蓝天白云..."
                className="min-h-[80px] border-gray-200 focus:border-blue-400"
              />
            </div>
          </CardContent>
        </Card>

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

      {/* Processing Button */}
      <Card className="border-gray-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <p className="text-sm text-gray-700 font-medium mb-2">
              {uploadedImages.length > 0 
                ? `已准备处理 ${uploadedImages.length} 张图片`
                : '请先上传图片开始处理'
              }
            </p>
            <p className="text-xs text-gray-600">
              预计处理时间：{Math.max(uploadedImages.length * 2, 2)}-{uploadedImages.length * 5 || 5} 分钟
            </p>
          </div>
          
          <Button 
            onClick={handleOneClickProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl"
            size="lg"
          >
            <Wand2 className="w-5 h-5 mr-2" />
            开始一键处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default OneClickWorkflowPanel;
