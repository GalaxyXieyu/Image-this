
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <SidebarTrigger />
            <div>
              <h1 className="text-xl font-bold text-foreground">AI图像处理工作台</h1>
              <p className="text-sm text-muted-foreground">专业图像AI增强处理</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel - Reference Image */}
          <div className="lg:col-span-1">
            <div className="h-full bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border-0 p-4">
              <ReferenceImageUploader 
                onImageSelected={setReferenceImage}
                selectedImage={referenceImage}
              />
            </div>
          </div>

          {/* Center Panel - Batch Upload */}
          <div className="lg:col-span-2">
            <div className="h-full bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border-0 p-4">
              <BatchImageUploader
                onImagesSelected={setUploadedImages}
                uploadedImages={uploadedImages}
              />
            </div>
          </div>

          {/* Right Panel - Controls & Queue */}
          <div className="lg:col-span-1 space-y-4">
            {/* Enhancement Controls */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border-0 p-4">
              <SimpleEnhancementPanel 
                uploadedImages={uploadedImages}
                referenceImage={referenceImage}
              />
            </div>

            {/* Processing Queue */}
            <div className="bg-card/80 backdrop-blur-sm rounded-xl shadow-lg border-0 p-4 overflow-hidden">
              <ProcessingQueue />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace;
