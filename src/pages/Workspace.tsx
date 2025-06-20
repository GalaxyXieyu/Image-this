
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Clock, ChevronDown } from 'lucide-react';
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
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  AI图像处理工作台
                </h1>
                <p className="text-sm text-muted-foreground">专业图像AI增强处理</p>
              </div>
            </div>
            
            {/* Processing Queue Button */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-150 hover:to-orange-150 border-amber-200">
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
      <main className="flex-1 p-6">
        <Tabs defaultValue="workflow" className="h-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="workflow" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              一键处理
            </TabsTrigger>
            <TabsTrigger value="background" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              图片换背景
            </TabsTrigger>
            <TabsTrigger value="expand" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              扩图
            </TabsTrigger>
            <TabsTrigger value="upscale" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              高清化
            </TabsTrigger>
          </TabsList>

          {/* Upload Area - Shared across all tabs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Reference Image */}
            <div className="bg-gradient-to-br from-white/90 to-amber-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 h-64">
              <ReferenceImageUploader 
                onImageSelected={setReferenceImage}
                selectedImage={referenceImage}
              />
            </div>

            {/* Batch Upload */}
            <div className="bg-gradient-to-br from-white/90 to-orange-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 h-64">
              <BatchImageUploader
                onImagesSelected={setUploadedImages}
                uploadedImages={uploadedImages}
              />
            </div>
          </div>

          <TabsContent value="workflow" className="flex-1">
            <OneClickWorkflowPanel 
              uploadedImages={uploadedImages}
              referenceImage={referenceImage}
            />
          </TabsContent>

          <TabsContent value="background" className="flex-1">
            <BackgroundRemovalPanel 
              uploadedImages={uploadedImages}
              referenceImage={referenceImage}
            />
          </TabsContent>

          <TabsContent value="expand" className="flex-1">
            <ImageExpansionPanel 
              uploadedImages={uploadedImages}
              referenceImage={referenceImage}
            />
          </TabsContent>

          <TabsContent value="upscale" className="flex-1">
            <ImageUpscalingPanel 
              uploadedImages={uploadedImages}
              referenceImage={referenceImage}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Workspace;
