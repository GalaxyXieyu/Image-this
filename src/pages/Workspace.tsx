
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReferenceImageUploader from '@/components/ReferenceImageUploader';
import BatchImageUploader from '@/components/BatchImageUploader';
import SimpleEnhancementPanel from '@/components/SimpleEnhancementPanel';
import ProcessingQueue from '@/components/ProcessingQueue';

const Workspace = () => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <SidebarTrigger />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                AI图像处理工作台
              </h1>
              <p className="text-sm text-muted-foreground">专业图像AI增强处理</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="basic" className="h-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="basic" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              基础处理
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              高级功能
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
              批量处理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="h-[calc(100%-4rem)]">
            <div className="h-full grid grid-rows-[300px_1fr] gap-6">
              {/* Upload Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Reference Image */}
                <div className="bg-gradient-to-br from-white/90 to-amber-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
                  <ReferenceImageUploader 
                    onImageSelected={setReferenceImage}
                    selectedImage={referenceImage}
                  />
                </div>

                {/* Batch Upload */}
                <div className="bg-gradient-to-br from-white/90 to-orange-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
                  <BatchImageUploader
                    onImagesSelected={setUploadedImages}
                    uploadedImages={uploadedImages}
                  />
                </div>
              </div>

              {/* Bottom Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls */}
                <div className="bg-gradient-to-br from-white/90 to-red-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
                  <SimpleEnhancementPanel 
                    uploadedImages={uploadedImages}
                    referenceImage={referenceImage}
                  />
                </div>

                {/* Processing Queue */}
                <div className="lg:col-span-2 bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
                  <ProcessingQueue />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="h-[calc(100%-4rem)]">
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-200 to-red-200 flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  高级功能
                </h2>
                <p className="text-muted-foreground">即将推出更多强大的AI处理功能</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="batch" className="h-[calc(100%-4rem)]">
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-200 to-pink-200 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                  批量处理
                </h2>
                <p className="text-muted-foreground">高效处理大量图片的专业工具</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Workspace;
