
import { useState } from 'react';
import { Upload, Wand2, Image, Settings, FolderOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImageUploader from '@/components/ImageUploader';
import EnhancementPanel from '@/components/EnhancementPanel';
import ProcessingQueue from '@/components/ProcessingQueue';
import ResultsGallery from '@/components/ResultsGallery';

const Index = () => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div className="min-h-screen gradient-cream">
      {/* Header */}
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Image Studio</h1>
                <p className="text-sm text-muted-foreground">专业图像处理工作台</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5 text-primary" />
                  <span>图片上传</span>
                </CardTitle>
                <CardDescription>
                  支持拖拽上传，批量处理
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUploader 
                  onImagesSelected={setUploadedImages}
                  uploadedImages={uploadedImages}
                />
              </CardContent>
            </Card>

            <Card className="hover-lift border-0 shadow-lg bg-card/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  <span>AI增强设置</span>
                </CardTitle>
                <CardDescription>
                  配置处理参数和效果
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EnhancementPanel uploadedImages={uploadedImages} />
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Processing & Results */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm h-full">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2">
                  <Image className="w-5 h-5 text-primary" />
                  <span>处理中心</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
                    <TabsTrigger value="upload" className="data-[state=active]:bg-background">
                      预览区域
                    </TabsTrigger>
                    <TabsTrigger value="results" className="data-[state=active]:bg-background">
                      处理结果
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="h-full mt-0">
                    <div className="h-full flex flex-col">
                      {uploadedImages.length > 0 ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {uploadedImages.slice(0, 4).map((image, index) => (
                            <div key={index} className="aspect-square rounded-xl bg-muted/30 border-2 border-dashed border-border/30 flex items-center justify-center overflow-hidden">
                              <img 
                                src={URL.createObjectURL(image)} 
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg mb-2">上传图片开始处理</p>
                            <p className="text-sm">支持 JPG、PNG、WebP 格式</p>
                          </div>
                        </div>
                      )}
                      
                      <ProcessingQueue />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="results" className="h-full mt-0">
                    <ResultsGallery />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
