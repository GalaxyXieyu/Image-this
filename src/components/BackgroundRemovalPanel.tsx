
import { useState } from 'react';
import { Scissors, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BackgroundRemovalPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
}

const BackgroundRemovalPanel = ({ uploadedImages, referenceImage }: BackgroundRemovalPanelProps) => {
  const [backgroundPrompt, setBackgroundPrompt] = useState('纯白色背景');
  const [mode, setMode] = useState('remove');

  const handleProcess = () => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    console.log('开始背景处理', { 
      images: uploadedImages, 
      reference: referenceImage,
      mode,
      prompt: backgroundPrompt
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Card */}
      <Card className="border-0 bg-gradient-to-br from-blue-100/80 to-cyan-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-700 to-cyan-700 bg-clip-text text-transparent">
              智能背景处理
            </span>
          </CardTitle>
          <CardDescription className="text-blue-700/80">
            AI智能抠图和背景替换
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="remove">移除背景</TabsTrigger>
              <TabsTrigger value="replace">替换背景</TabsTrigger>
            </TabsList>
            
            <TabsContent value="remove" className="space-y-4">
              <p className="text-sm text-blue-600">将自动移除图片背景，生成透明背景的PNG图片</p>
            </TabsContent>
            
            <TabsContent value="replace" className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-blue-700">新背景描述</Label>
                <Textarea
                  value={backgroundPrompt}
                  onChange={(e) => setBackgroundPrompt(e.target.value)}
                  placeholder="描述想要的新背景，例如：蓝天白云、办公室环境、纯色背景等..."
                  className="min-h-[100px] bg-white/80"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            onClick={handleProcess}
            disabled={uploadedImages.length === 0}
            className="w-full h-12 text-lg font-medium bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-lg mt-6"
            size="lg"
          >
            {mode === 'remove' ? '移除背景' : '替换背景'} {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
          </Button>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-0 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Palette className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700">使用技巧</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-600">
            <li>• 清晰的主体轮廓有助于获得更好的抠图效果</li>
            <li>• 描述背景时尽量具体，如"白色渐变背景"比"好看的背景"效果更好</li>
            <li>• 可以上传参考图片来指定背景风格</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackgroundRemovalPanel;
