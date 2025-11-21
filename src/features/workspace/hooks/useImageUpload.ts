import { useCallback } from 'react';
import { UploadedImage } from './useWorkspaceState';

// 支持的图片格式
const supportedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff'
];

export function useImageUpload(
  uploadedImages: UploadedImage[],
  setUploadedImages: (images: UploadedImage[]) => void,
  onError: (message: string) => void
) {
  const isValidImageFile = useCallback((file: File): boolean => {
    if (!supportedImageTypes.includes(file.type.toLowerCase())) {
      return false;
    }
    const extension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif'];
    return extension ? validExtensions.includes(extension) : false;
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      if (isValidImageFile(file)) {
        const newImage: UploadedImage = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          name: file.name,
        };
        validFiles.push(newImage);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      onError(`以下文件格式不支持: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setUploadedImages([...uploadedImages, ...validFiles]);
    }

    event.target.value = '';
  }, [uploadedImages, setUploadedImages, isValidImageFile, onError]);

  const handleFolderUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const validFiles: UploadedImage[] = [];
    const invalidFiles: string[] = [];

    Array.from(files).forEach(file => {
      if (isValidImageFile(file)) {
        const newImage: UploadedImage = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file),
          name: file.name,
        };
        validFiles.push(newImage);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      onError(`以下文件格式不支持: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      setUploadedImages([...uploadedImages, ...validFiles]);
    }

    event.target.value = '';
  }, [uploadedImages, setUploadedImages, isValidImageFile, onError]);

  const removeImage = useCallback((id: string) => {
    const imageToRemove = uploadedImages.find(img => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
      setUploadedImages(uploadedImages.filter(img => img.id !== id));
    }
  }, [uploadedImages, setUploadedImages]);

  const clearAllImages = useCallback(() => {
    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
  }, [uploadedImages, setUploadedImages]);

  return {
    handleFileUpload,
    handleFolderUpload,
    removeImage,
    clearAllImages,
    isValidImageFile,
  };
}
