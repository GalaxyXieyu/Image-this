
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BackgroundRemovalPanelProps {
  uploadedImages: File[];
  referenceImage: File | null;
  onProcess: (settings: any) => void;
}

const BackgroundRemovalPanel = ({ uploadedImages, referenceImage, onProcess }: BackgroundRemovalPanelProps) => {
  const [backgroundPrompt, setBackgroundPrompt] = useState('纯白色背景');
  const [mode, setMode] = useState('remove');

  return (
    <Card className="border-gray-200 bg-white shadow-sm">
      <CardContent className="p-6">
        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-white border border-gray-200 p-1 h-12 shadow-sm">
            <TabsTrigger 
              value="remove"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
            >
              移除背景
            </TabsTrigger>
            <TabsTrigger 
              value="replace"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
            >
              替换背景
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="remove" className="space-y-4">
            <p className="text-sm text-gray-600">将自动移除图片背景，生成透明背景的PNG图片</p>
          </TabsContent>
          
          <TabsContent value="replace" className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-800">新背景描述</Label>
              <Textarea
                value={backgroundPrompt}
                onChange={(e) => setBackgroundPrompt(e.target.value)}
                placeholder="描述想要的新背景，例如：蓝天白云、办公室环境、纯色背景等..."
                className="min-h-[100px] border-gray-200 focus:border-amber-400"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default BackgroundRemovalPanel;
