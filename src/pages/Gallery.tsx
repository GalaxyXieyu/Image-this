import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FolderPlus, Search, Grid3X3, List, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGallery } from '@/hooks/useGallery';
import { ImageFile, Folder, GalleryContextMenuData } from '@/types/gallery';
import ImageCard from '@/components/ImageCard';
import FolderCard from '@/components/FolderCard';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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

  // Mock data - 保持现有的示例数据但转换为新的类型
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

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="border-b border-border/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  图片管理
                </h1>
                <p className="text-sm text-muted-foreground">
                  {galleryState.selectedImages.length > 0 || galleryState.selectedFolders.length > 0
                    ? `已选择 ${galleryState.selectedImages.length + galleryState.selectedFolders.length} 项`
                    : '管理您的处理结果和文件夹'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Selection Actions */}
              {(galleryState.selectedImages.length > 0 || galleryState.selectedFolders.length > 0) && (
                <>
                  <Button variant="outline" size="sm" onClick={handleBatchDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    批量下载
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBatchDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    批量删除
                  </Button>
                </>
              )}
              
              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg p-1 bg-white/90">
                <Button
                  variant={galleryState.viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-7 px-2"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={galleryState.viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-7 px-2"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="搜索图片..."
                  value={galleryState.searchTerm}
                  onChange={(e) => updateSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-white/90"
                />
              </div>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <FolderPlus className="w-4 h-4 mr-2" />
                新建文件夹
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <Tabs defaultValue="results" className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="results" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white">
              处理结果
            </TabsTrigger>
            <TabsTrigger value="folders" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
              文件夹管理
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="h-[calc(100%-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredImages.map((image) => (
                <ContextMenu key={image.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <ImageCard
                        image={image}
                        selected={galleryState.selectedImages.includes(image.id)}
                        onSelect={toggleImageSelection}
                        onPreview={handleImagePreview}
                        onDownload={handleImageDownload}
                        onDelete={handleImageDelete}
                        onContextMenu={handleImageContextMenu}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleImagePreview(image)}>
                      预览
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleImageDownload(image)}>
                      下载
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => console.log('重命名')}>
                      重命名
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => console.log('复制')}>
                      复制
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => handleImageDelete(image)}
                      className="text-red-600"
                    >
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="folders" className="h-[calc(100%-4rem)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredFolders.map((folder) => (
                <ContextMenu key={folder.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <FolderCard
                        folder={folder}
                        selected={galleryState.selectedFolders.includes(folder.id)}
                        onSelect={toggleFolderSelection}
                        onOpen={handleFolderOpen}
                        onContextMenu={handleFolderContextMenu}
                      />
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleFolderOpen(folder)}>
                      打开文件夹
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => console.log('重命名文件夹')}>
                      重命名
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => console.log('复制文件夹')}>
                      复制
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => console.log('删除文件夹')}
                      className="text-red-600"
                    >
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Gallery;
