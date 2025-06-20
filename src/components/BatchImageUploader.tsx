
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BatchImageUploaderProps {
  onImagesSelected: (images: File[]) => void;
  uploadedImages: File[];
}

const BatchImageUploader = ({ onImagesSelected, uploadedImages }: BatchImageUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
    onImagesSelected([...uploadedImages, ...imageFiles]);
    setDragActive(false);
  }, [uploadedImages, onImagesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    onImagesSelected(newImages);
    if (currentPreview >= newImages.length && newImages.length > 0) {
      setCurrentPreview(newImages.length - 1);
    }
  };

  const clearAll = () => {
    onImagesSelected([]);
    setCurrentPreview(0);
  };

  const nextImage = () => {
    setCurrentPreview((prev) => (prev + 1) % uploadedImages.length);
  };

  const prevImage = () => {
    setCurrentPreview((prev) => (prev - 1 + uploadedImages.length) % uploadedImages.length);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 min-h-[32px]">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <h3 className="font-medium text-amber-800 truncate">
            待处理图片
          </h3>
          {uploadedImages.length > 0 && (
            <Badge className="bg-amber-500 text-white border-0 shrink-0">
              {uploadedImages.length}
            </Badge>
          )}
        </div>
        {uploadedImages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="hover:bg-red-100 text-red-600 shrink-0 ml-2">
            清空
          </Button>
        )}
      </div>

      <div className="flex-1 relative">
        {/* 统一的白色背景卡片 */}
        <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-amber-200/30"></div>
        
        {uploadedImages.length > 0 ? (
          /* 有图片时的内容区域 */
          <div className="relative z-10 h-full p-4">
            <div className="h-full flex flex-col">
              {/* 主预览区域 */}
              <div className="flex-1 rounded-xl cream-gradient border border-amber-200/50 overflow-hidden relative mb-3 shadow-inner">
                <img 
                  src={URL.createObjectURL(uploadedImages[currentPreview])} 
                  alt={`预览 ${currentPreview + 1}`}
                  className="w-full h-full object-cover"
                />
                
                {uploadedImages.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
                      onClick={nextImage}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="absolute bottom-2 right-2 bg-white/90 px-3 py-1 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
                      {currentPreview + 1} / {uploadedImages.length}
                    </div>
                  </>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/90 hover:bg-red-100 hover:text-red-600 shadow-lg backdrop-blur-sm"
                  onClick={() => removeImage(currentPreview)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* 底部缩略图滑动选择 */}
              {uploadedImages.length > 1 && (
                <div className="flex-shrink-0 h-16">
                  <div className="flex space-x-2 overflow-x-auto h-full scrollbar-hide">
                    {uploadedImages.map((image, index) => (
                      <div
                        key={index}
                        className={`
                          flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shadow-sm
                          ${currentPreview === index 
                            ? 'border-amber-400 shadow-lg scale-105' 
                            : 'border-amber-200/50 hover:border-amber-300 hover:shadow-md'
                          }
                        `}
                        onClick={() => setCurrentPreview(index)}
                      >
                        <img 
                          src={URL.createObjectURL(image)} 
                          alt={`缩略图 ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 空状态时的虚线框直接贴合白色背景 */
          <div
            {...getRootProps()}
            className={`
              absolute inset-0 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center
              ${isDragActive || dragActive 
                ? 'border-amber-400 cream-gradient scale-[1.02] shadow-lg z-20' 
                : 'border-amber-300/50 hover:border-amber-400/70 hover:cream-gradient z-10'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full cream-gradient flex items-center justify-center shadow-sm">
                <Upload className={`w-6 h-6 ${isDragActive ? 'text-amber-600' : 'text-amber-500'}`} />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  {isDragActive ? '松开上传图片' : '批量上传图片'}
                </p>
                <p className="text-sm text-amber-600/80 mt-1">
                  支持拖拽文件夹或多选图片
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-600 hover:bg-amber-50">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  选择文件夹
                </Button>
                <span className="text-amber-400">或</span>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-600 hover:bg-amber-50">
                  选择图片
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchImageUploader;
