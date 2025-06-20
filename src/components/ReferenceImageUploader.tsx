
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
        <h3 className="font-medium bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent">
          参考图片
        </h3>
        {selectedImage && (
          <Button variant="ghost" size="sm" onClick={removeImage} className="hover:bg-red-100">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedImage ? (
        <div className="flex-1 rounded-xl bg-gradient-to-br from-amber-100/50 to-orange-100/50 border border-amber-200/50 overflow-hidden shadow-inner">
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
            flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center
            ${isDragActive || dragActive 
              ? 'border-amber-400 bg-gradient-to-br from-amber-100/80 to-orange-100/80 scale-[1.02] shadow-lg' 
              : 'border-amber-300/50 hover:border-amber-400/70 hover:bg-gradient-to-br hover:from-amber-50/80 hover:to-orange-50/80'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center shadow-sm">
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
  );
};

export default ReferenceImageUproller;
