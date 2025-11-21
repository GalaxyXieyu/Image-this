import { useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
}

const supportedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff'
];

const isValidImageFile = (file: File): boolean => {
  if (!supportedImageTypes.includes(file.type.toLowerCase())) {
    return false;
  }

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'];
  const fileName = file.name.toLowerCase();
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return false;
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return false;
  }

  return true;
};

export function useImageUpload() {
  const { toast } = useToast();

  const handleFileUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (images: UploadedImage[]) => void
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (isValidImageFile(file)) {
        const id = `${Date.now()}-${index}`;
        const preview = URL.createObjectURL(file);
        validFiles.push({
          id,
          file,
          preview,
          name: file.name
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      onSuccess(validFiles);
      toast({
        title: "图片上传成功",
        description: `成功上传 ${validFiles.length} 张图片`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "部分文件上传失败",
        description: `${invalidFiles.length} 个文件格式不支持或文件过大`,
        variant: "destructive",
      });
    }

    event.target.value = '';
  }, [toast]);

  const handleFolderUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (images: UploadedImage[]) => void
  ) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach((file, index) => {
      if (isValidImageFile(file)) {
        const id = `${Date.now()}-${index}`;
        const preview = URL.createObjectURL(file);
        validFiles.push({
          id,
          file,
          preview,
          name: file.name
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      onSuccess(validFiles);
      toast({
        title: "文件夹上传成功",
        description: `从文件夹中成功上传 ${validFiles.length} 张图片`,
      });
    }

    if (invalidFiles.length > 0) {
      toast({
        title: "部分文件上传失败",
        description: `${invalidFiles.length} 个文件格式不支持或文件过大`,
        variant: "destructive",
      });
    }

    event.target.value = '';
  }, [toast]);

  const handleSingleImageUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (image: UploadedImage) => void,
    successMessage: string = "图片上传成功"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      toast({
        title: "文件格式错误",
        description: "请选择有效的图片文件（JPG、PNG、WebP等）",
        variant: "destructive",
      });
      return;
    }

    const id = `${Date.now()}`;
    const preview = URL.createObjectURL(file);
    const uploadedImage: UploadedImage = {
      id,
      file,
      preview,
      name: file.name
    };

    onSuccess(uploadedImage);
    toast({
      title: successMessage,
      description: file.name,
    });

    event.target.value = '';
  }, [toast]);

  const removeImage = useCallback((image: UploadedImage | null) => {
    if (image) {
      URL.revokeObjectURL(image.preview);
    }
  }, []);

  const clearAllImages = useCallback((images: UploadedImage[]) => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
  }, []);

  return {
    handleFileUpload,
    handleFolderUpload,
    handleSingleImageUpload,
    removeImage,
    clearAllImages,
  };
}
