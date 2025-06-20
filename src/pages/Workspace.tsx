
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
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
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Reference Image */}
          <div className="lg:col-span-3">
            <div className="h-[400px] bg-gradient-to-br from-white/90 to-amber-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
              <ReferenceImageUploader 
                onImageSelected={setReferenceImage}
                selectedImage={referenceImage}
              />
            </div>
          </div>

          {/* Center Panel - Batch Upload */}
          <div className="lg:col-span-6">
            <div className="h-[400px] bg-gradient-to-br from-white/90 to-orange-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
              <BatchImageUploader
                onImagesSelected={setUploadedImages}
                uploadedImages={uploadedImages}
              />
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-white/90 to-red-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4 mb-4">
              <SimpleEnhancementPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </div>
          </div>
        </div>

        {/* Bottom Panel - Processing Queue */}
        <div className="mt-6">
          <div className="bg-gradient-to-r from-white/90 to-amber-50/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-4">
            <ProcessingQueue />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
