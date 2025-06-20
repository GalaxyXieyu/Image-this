
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ImageUploaderProps {
  onImagesSelected: (images: File[]) => void;
  uploadedImages: File[];
}

const ImageUploader = ({ onImagesSelected, uploadedImages }: ImageUploaderProps) => {
  const [dragActive, setDragActive] = useState(false);

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
  };

  const clearAll = () => {
    onImagesSelected([]);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive || dragActive 
            ? 'border-primary bg-primary/5 scale-[1.02]' 
            : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className={`w-6 h-6 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {isDragActive ? '松开以上传图片' : '拖拽图片到此处'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              或点击选择文件 • 支持批量上传
            </p>
          </div>
          <Button variant="outline" size="sm" className="mt-3">
            选择图片
          </Button>
        </div>
      </div>

      {/* Uploaded Images List */}
      {uploadedImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">已上传图片</span>
              <Badge variant="secondary">{uploadedImages.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              清空
            </Button>
          </div>
          
          <div className="max-h-32 overflow-y-auto space-y-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex-shrink-0 overflow-hidden">
                    <img 
                      src={URL.createObjectURL(image)} 
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(image.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
