
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageFile, Folder } from '@/types/gallery';
import ImageGrid from '@/components/ImageGrid';
import FolderGrid from '@/components/FolderGrid';

interface GalleryTabsProps {
  filteredImages: ImageFile[];
  filteredFolders: Folder[];
  selectedImages: string[];
  selectedFolders: string[];
  onImageSelect: (imageId: string, multiSelect?: boolean) => void;
  onFolderSelect: (folderId: string, multiSelect?: boolean) => void;
  onImagePreview: (image: ImageFile) => void;
  onImageDownload: (image: ImageFile) => void;
  onImageDelete: (image: ImageFile) => void;
  onFolderOpen: (folder: Folder) => void;
  onImageContextMenu: (e: React.MouseEvent, image: ImageFile) => void;
  onFolderContextMenu: (e: React.MouseEvent, folder: Folder) => void;
}

const GalleryTabs = ({
  filteredImages,
  filteredFolders,
  selectedImages,
  selectedFolders,
  onImageSelect,
  onFolderSelect,
  onImagePreview,
  onImageDownload,
  onImageDelete,
  onFolderOpen,
  onImageContextMenu,
  onFolderContextMenu,
}: GalleryTabsProps) => {
  return (
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
        <ImageGrid
          images={filteredImages}
          selectedImages={selectedImages}
          onImageSelect={onImageSelect}
          onImagePreview={onImagePreview}
          onImageDownload={onImageDownload}
          onImageDelete={onImageDelete}
          onImageContextMenu={onImageContextMenu}
        />
      </TabsContent>

      <TabsContent value="folders" className="h-[calc(100%-4rem)]">
        <FolderGrid
          folders={filteredFolders}
          selectedFolders={selectedFolders}
          onFolderSelect={onFolderSelect}
          onFolderOpen={onFolderOpen}
          onFolderContextMenu={onFolderContextMenu}
        />
      </TabsContent>
    </Tabs>
  );
};

export default GalleryTabs;
