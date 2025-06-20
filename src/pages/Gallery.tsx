
import { useState } from 'react';
import { useGallery } from '@/hooks/useGallery';
import { ImageFile, Folder, GalleryContextMenuData } from '@/types/gallery';
import GalleryHeader from '@/components/GalleryHeader';
import GalleryTabs from '@/components/GalleryTabs';

const Gallery = () => {
  const {
    galleryState,
    updateSearchTerm,
    toggleImageSelection,
    toggleFolderSelection,
    clearSelection,
    selectAll,
    setViewMode,
  } = useGallery();

  const [contextMenu, setContextMenu] = useState<GalleryContextMenuData | null>(null);

  // Mock data
  const processedImages: ImageFile[] = [
    {
      id: '1',
      filename: 'portrait.jpg',
      originalUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=200&fit=crop',
      processedUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=150&h=200&fit=crop',
      processType: '背景替换',
      status: 'completed',
      createdAt: '2024-12-20 14:30',
      updatedAt: '2024-12-20 14:30',
      size: '2.3MB',
      folderId: null,
    },
    {
      id: '2',
      filename: 'landscape.jpg',
      originalUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=150&h=200&fit=crop',
      processedUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=150&h=200&fit=crop',
      processType: '扩图+高清',
      status: 'completed',
      createdAt: '2024-12-20 13:15',
      updatedAt: '2024-12-20 13:15',
      size: '4.1MB',
      folderId: null,
    },
    {
      id: '3',
      filename: 'tech.jpg',
      originalUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=200&fit=crop',
      processedUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&h=200&fit=crop',
      processType: '一键增强',
      status: 'processing',
      createdAt: '2024-12-20 15:45',
      updatedAt: '2024-12-20 15:45',
      size: '1.8MB',
      folderId: null,
    },
    {
      id: '4',
      filename: 'code.jpg',
      originalUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=200&fit=crop',
      processedUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=300&h=400&fit=crop',
      thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=200&fit=crop',
      processType: '背景模糊',
      status: 'completed',
      createdAt: '2024-12-20 12:00',
      updatedAt: '2024-12-20 12:00',
      size: '3.5MB',
      folderId: null,
    }
  ];

  const folders: Folder[] = [
    { 
      id: '1', 
      name: '人像处理', 
      imageCount: 15, 
      color: 'from-amber-500 to-orange-500',
      createdAt: '2024-12-20 10:00',
      updatedAt: '2024-12-20 10:00',
      parentId: null,
    },
    { 
      id: '2', 
      name: '产品图片', 
      imageCount: 8, 
      color: 'from-orange-500 to-red-500',
      createdAt: '2024-12-20 10:00',
      updatedAt: '2024-12-20 10:00',
      parentId: null,
    },
    { 
      id: '3', 
      name: '风景照片', 
      imageCount: 23, 
      color: 'from-red-500 to-pink-500',
      createdAt: '2024-12-20 10:00',
      updatedAt: '2024-12-20 10:00',
      parentId: null,
    },
    { 
      id: '4', 
      name: '技术截图', 
      imageCount: 12, 
      color: 'from-pink-500 to-purple-500',
      createdAt: '2024-12-20 10:00',
      updatedAt: '2024-12-20 10:00',
      parentId: null,
    }
  ];

  // Filter functions
  const filteredImages = processedImages.filter(image =>
    image.filename.toLowerCase().includes(galleryState.searchTerm.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(galleryState.searchTerm.toLowerCase())
  );

  // Event handlers
  const handleImagePreview = (image: ImageFile) => {
    console.log('Preview image:', image);
  };

  const handleImageDownload = (image: ImageFile) => {
    console.log('Download image:', image);
  };

  const handleImageDelete = (image: ImageFile) => {
    console.log('Delete image:', image);
  };

  const handleFolderOpen = (folder: Folder) => {
    console.log('Open folder:', folder);
  };

  const handleImageContextMenu = (e: React.MouseEvent, image: ImageFile) => {
    setContextMenu({
      type: 'image',
      target: image,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    setContextMenu({
      type: 'folder',
      target: folder,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const handleBatchDownload = () => {
    console.log('Batch download:', galleryState.selectedImages);
  };

  const handleBatchDelete = () => {
    console.log('Batch delete:', galleryState.selectedImages);
  };

  const handleCreateFolder = () => {
    console.log('Create new folder');
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <GalleryHeader
        galleryState={galleryState}
        onSearchChange={updateSearchTerm}
        onViewModeChange={setViewMode}
        onBatchDownload={handleBatchDownload}
        onBatchDelete={handleBatchDelete}
        onCreateFolder={handleCreateFolder}
      />

      <main className="flex-1 p-6">
        <GalleryTabs
          filteredImages={filteredImages}
          filteredFolders={filteredFolders}
          selectedImages={galleryState.selectedImages}
          selectedFolders={galleryState.selectedFolders}
          onImageSelect={toggleImageSelection}
          onFolderSelect={toggleFolderSelection}
          onImagePreview={handleImagePreview}
          onImageDownload={handleImageDownload}
          onImageDelete={handleImageDelete}
          onFolderOpen={handleFolderOpen}
          onImageContextMenu={handleImageContextMenu}
          onFolderContextMenu={handleFolderContextMenu}
        />
      </main>
    </div>
  );
};

export default Gallery;
