
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
        <h3 className="font-medium text-foreground">参考图片</h3>
        {selectedImage && (
          <Button variant="ghost" size="sm" onClick={removeImage}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedImage ? (
        <div className="flex-1 rounded-xl bg-muted/20 border border-border/30 overflow-hidden">
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
            flex-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
            ${isDragActive || dragActive 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ImageIcon className={`w-6 h-6 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isDragActive ? '松开上传参考图片' : '上传参考图片'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                点击或拖拽图片到此处
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferenceImageUploader;
