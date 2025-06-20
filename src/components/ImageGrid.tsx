
import { ImageFile } from '@/types/gallery';
import ImageCard from '@/components/ImageCard';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface ImageGridProps {
  images: ImageFile[];
  selectedImages: string[];
  onImageSelect: (imageId: string, multiSelect?: boolean) => void;
  onImagePreview: (image: ImageFile) => void;
  onImageDownload: (image: ImageFile) => void;
  onImageDelete: (image: ImageFile) => void;
  onImageContextMenu: (e: React.MouseEvent, image: ImageFile) => void;
}

const ImageGrid = ({
  images,
  selectedImages,
  onImageSelect,
  onImagePreview,
  onImageDownload,
  onImageDelete,
  onImageContextMenu,
}: ImageGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {images.map((image) => (
        <ContextMenu key={image.id}>
          <ContextMenuTrigger asChild>
            <div>
              <ImageCard
                image={image}
                selected={selectedImages.includes(image.id)}
                onSelect={onImageSelect}
                onPreview={onImagePreview}
                onDownload={onImageDownload}
                onDelete={onImageDelete}
                onContextMenu={onImageContextMenu}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onImagePreview(image)}>
              预览
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onImageDownload(image)}>
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
              onClick={() => onImageDelete(image)}
              className="text-red-600"
            >
              删除
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
};

export default ImageGrid;
