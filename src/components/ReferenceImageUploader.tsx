
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferenceImageUploaderProps {
  onImageSelected: (image: File | null) => void;
  selectedImage: File | null;
}

const ReferenceImageUploader = ({ onImageSelected, selectedImage }: ReferenceImageUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageSelected(acceptedFiles[0]);
    }
    setDragActive(false);
  }, [onImageSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    maxFiles: 1,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  });

  const removeImage = () => {
    onImageSelected(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-amber-800">
          参考图片
        </h3>
        {selectedImage && (
          <Button variant="ghost" size="sm" onClick={removeImage} className="hover:bg-red-100">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 relative">
        {/* 统一的白色背景卡片 */}
        <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-amber-200/30"></div>
        
        {/* 统一的内容区域 */}
        <div className="relative z-10 h-full p-4">
          {selectedImage ? (
            <div className="h-full rounded-xl cream-gradient border border-amber-200/50 overflow-hidden shadow-inner">
              <img 
                src={URL.createObjectURL(selectedImage)} 
                alt="参考图片"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              {...getRootProps()}
              className={`
                h-full border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center
                ${isDragActive || dragActive 
                  ? 'border-amber-400 cream-gradient scale-[1.02] shadow-lg' 
                  : 'border-amber-300/50 hover:border-amber-400/70 hover:cream-gradient'
                }
              `}
            >
              <input {...getInputProps()} />
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full cream-gradient flex items-center justify-center shadow-sm">
                  <ImageIcon className={`w-6 h-6 ${isDragActive ? 'text-amber-600' : 'text-amber-500'}`} />
                </div>
                <div>
                  <p className="font-medium text-amber-800">
                    {isDragActive ? '松开上传参考图片' : '上传参考图片'}
                  </p>
                  <p className="text-sm text-amber-600/80 mt-1">
                    点击或拖拽图片到此处
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReferenceImageUploader;
