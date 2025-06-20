
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, Sparkles, Wand2, ImageIcon, Expand, Zap } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ReferenceImageUploader from '@/components/ReferenceImageUploader';
import BatchImageUploader from '@/components/BatchImageUploader';
import OneClickWorkflowPanel from '@/components/OneClickWorkflowPanel';
import BackgroundRemovalPanel from '@/components/BackgroundRemovalPanel';
import ImageExpansionPanel from '@/components/ImageExpansionPanel';
import ImageUpscalingPanel from '@/components/ImageUpscalingPanel';
import ProcessingQueue from '@/components/ProcessingQueue';

const Workspace = () => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('workflow');

  const getTabDescription = () => {
    switch (activeTab) {
      case 'workflow':
        return {
          title: '一键AI增强处理',
          description: '智能扩图 + AI高清化，一键完成专业级图像处理',
          icon: <Wand2 className="w-5 h-5 text-amber-600" />
        };
      case 'background':
        return {
          title: '智能换背景',
          description: 'AI自动识别主体，智能更换背景，保持边缘自然',
          icon: <ImageIcon className="w-5 h-5 text-amber-600" />
        };
      case 'expand':
        return {
          title: '智能扩图',
          description: 'AI智能扩展图片边界，保持内容自然连贯，专业级扩展效果',
          icon: <Expand className="w-5 h-5 text-amber-600" />
        };
      case 'upscale':
        return {
          title: 'AI高清化',
          description: '使用先进AI算法，智能提升图片分辨率和细节',
          icon: <Zap className="w-5 h-5 text-amber-600" />
        };
      default:
        return null;
    }
  };

  const handleProcess = (settings?: any) => {
    if (uploadedImages.length === 0) {
      alert('请先上传图片');
      return;
    }
    
    console.log(`开始${getTabDescription()?.title}处理`, { 
      images: uploadedImages, 
      reference: referenceImage,
      settings,
      tab: activeTab
    });
  };

  const showReferenceUpload = activeTab === 'workflow' || activeTab === 'background';

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    AI图像处理工作台
                  </h1>
                  <p className="text-sm text-gray-500">专业图像AI增强处理平台</p>
                </div>
              </div>
            </div>
            
            {/* Processing Queue Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-white hover:bg-gray-50 border-gray-200 shadow-sm text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span>处理队列</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4">
                  <ProcessingQueue />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 bg-white border border-gray-200 p-1 h-12 shadow-sm">
              <TabsTrigger 
                value="workflow" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                <span>一键处理</span>
              </TabsTrigger>
              <TabsTrigger 
                value="background" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                <span>图片换背景</span>
              </TabsTrigger>
              <TabsTrigger 
                value="expand" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
              >
                <Expand className="w-4 h-4 mr-2" />
                <span>扩图</span>
              </TabsTrigger>
              <TabsTrigger 
                value="upscale" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-50 data-[state=active]:to-orange-50 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-gray-600 flex items-center justify-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                <span>高清化</span>
              </TabsTrigger>
            </TabsList>

            {/* Feature Description */}
            {getTabDescription() && (
              <Card className="border-0 warm-gradient shadow-sm mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-xl">
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
                      {getTabDescription()?.icon}
                    </div>
                    <span className="text-amber-800">
                      {getTabDescription()?.title}
                    </span>
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    {getTabDescription()?.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Upload Area */}
            <div className={`grid gap-6 mb-6 ${showReferenceUpload ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Reference Image - Only show for workflow and background tabs */}
              {showReferenceUpload && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-64">
                  <ReferenceImageUploader 
                    onImageSelected={setReferenceImage}
                    selectedImage={referenceImage}
                  />
                </div>
              )}

              {/* Batch Upload */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-64">
                <BatchImageUploader
                  onImagesSelected={setUploadedImages}
                  uploadedImages={uploadedImages}
                />
              </div>
            </div>

            {/* Tab Content - Settings Only */}
            <TabsContent value="workflow" className="space-y-6">
              <OneClickWorkflowPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
                onProcess={handleProcess}
              />
            </TabsContent>

            <TabsContent value="background" className="space-y-6">
              <BackgroundRemovalPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
                onProcess={handleProcess}
              />
            </TabsContent>

            <TabsContent value="expand" className="space-y-6">
              <ImageExpansionPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
                onProcess={handleProcess}
              />
            </TabsContent>

            <TabsContent value="upscale" className="space-y-6">
              <ImageUpscalingPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
                onProcess={handleProcess}
              />
            </TabsContent>

            {/* Processing Button - Bottom */}
            <Card className="border-gray-200 bg-white shadow-sm mt-6">
              <CardContent className="pt-6">
                <Button 
                  onClick={() => handleProcess()}
                  disabled={uploadedImages.length === 0}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  size="lg"
                >
                  <Wand2 className="w-5 h-5 mr-2" />
                  开始{getTabDescription()?.title?.replace('AI', '').replace('智能', '')}处理 {uploadedImages.length > 0 && `(${uploadedImages.length}张)`}
                </Button>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
