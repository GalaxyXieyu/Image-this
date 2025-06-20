
import { useState } from 'react';
import { Wand2, ArrowRight } from 'lucide-react';
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
      {/* Workflow Overview */}
      <Card className="border-0 bg-gradient-to-br from-purple-100/80 to-pink-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
              一键AI处理工作流
            </span>
          </CardTitle>
          <CardDescription className="text-purple-700/80">
            自动执行：换背景 → 扩图 → 高清化
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Workflow Steps */}
          <div className="flex items-center justify-between mb-6 p-4 bg-white/50 rounded-xl">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-center text-sm font-bold mb-2">1</div>
              <span className="text-sm font-medium text-blue-700">换背景</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center justify-center text-sm font-bold mb-2">2</div>
              <span className="text-sm font-medium text-orange-700">扩图</span>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center text-sm font-bold mb-2">3</div>
              <span className="text-sm font-medium text-green-700">高清化</span>
            </div>
          </div>

          <Button 
            onClick={handleOneClickProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-14 text-lg font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg"
            size="lg"
          >
            开始一键处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Background Settings */}
        <Card className="border-0 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-700">背景设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-blue-700">背景描述</Label>
              <Textarea
                value={settings.backgroundPrompt}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, backgroundPrompt: e.target.value }))
                }
                placeholder="描述想要的背景..."
                className="min-h-[80px] bg-white/80"
              />
            </div>
          </CardContent>
        </Card>

        {/* Expand Settings */}
        <Card className="border-0 bg-gradient-to-br from-orange-50/80 to-red-50/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-700">扩图设置</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Upscale Settings */}
        <Card className="border-0 bg-gradient-to-br from-green-50/80 to-emerald-50/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-700">高清化设置</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-green-700">
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

export default OneClickWorkflowPanel;
