
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown, Sparkles, Wand2, ImageIcon, Expand, Zap } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

  return (
    <div className="h-full flex flex-col gradient-cream">
      {/* Header */}
      <header className="border-b border-border/30 glass-effect sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl warm-gradient flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-amber-800">
                    AI图像处理工作台
                  </h1>
                  <p className="text-sm text-amber-600">专业图像AI增强处理平台</p>
                </div>
              </div>
            </div>
            
            {/* Processing Queue Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 warm-gradient-soft hover:warm-gradient border-amber-200 shadow-sm text-amber-700">
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
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6 glass-effect p-1 h-12">
              <TabsTrigger 
                value="workflow" 
                className="data-[state=active]:warm-gradient data-[state=active]:text-amber-800 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-amber-600"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                一键处理
              </TabsTrigger>
              <TabsTrigger 
                value="background" 
                className="data-[state=active]:warm-gradient data-[state=active]:text-amber-800 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-amber-600"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                图片换背景
              </TabsTrigger>
              <TabsTrigger 
                value="expand" 
                className="data-[state=active]:warm-gradient data-[state=active]:text-amber-800 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-amber-600"
              >
                <Expand className="w-4 h-4 mr-2" />
                扩图
              </TabsTrigger>
              <TabsTrigger 
                value="upscale" 
                className="data-[state=active]:warm-gradient data-[state=active]:text-amber-800 data-[state=active]:shadow-sm transition-all duration-200 h-10 text-amber-600"
              >
                <Zap className="w-4 h-4 mr-2" />
                高清化
              </TabsTrigger>
            </TabsList>

            {/* Upload Area - Shared across all tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Reference Image */}
              <div className="glass-effect rounded-2xl shadow-lg p-4 h-64">
                <ReferenceImageUploader 
                  onImageSelected={setReferenceImage}
                  selectedImage={referenceImage}
                />
              </div>

              {/* Batch Upload */}
              <div className="glass-effect rounded-2xl shadow-lg p-4 h-64">
                <BatchImageUploader
                  onImagesSelected={setUploadedImages}
                  uploadedImages={uploadedImages}
                />
              </div>
            </div>

            <TabsContent value="workflow" className="space-y-0">
              <OneClickWorkflowPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </TabsContent>

            <TabsContent value="background" className="space-y-0">
              <BackgroundRemovalPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </TabsContent>

            <TabsContent value="expand" className="space-y-0">
              <ImageExpansionPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </TabsContent>

            <TabsContent value="upscale" className="space-y-0">
              <ImageUpscalingPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
