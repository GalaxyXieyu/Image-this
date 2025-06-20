
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { ImageFile } from '@/types/gallery';
import { cn } from '@/lib/utils';

interface ImageCardProps {
  image: ImageFile;
  selected: boolean;
  onSelect: (imageId: string, multiSelect?: boolean) => void;
  onPreview: (image: ImageFile) => void;
  onDownload: (image: ImageFile) => void;
  onDelete: (image: ImageFile) => void;
  onContextMenu: (e: React.MouseEvent, image: ImageFile) => void;
}

const ImageCard = ({ 
  image, 
  selected, 
  onSelect, 
  onPreview, 
  onDownload, 
  onDelete,
  onContextMenu 
}: ImageCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(image.id, multiSelect);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, image);
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden bg-white/90 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none",
        selected && "ring-2 ring-amber-500 ring-offset-2"
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img 
          src={image.processedUrl || image.originalUrl}
          alt={image.filename}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse" />
        )}
        <div className="absolute top-2 right-2">
          <Badge className={cn(
            "text-white border-0",
            image.status === 'completed' && "bg-green-500",
            image.status === 'processing' && "bg-amber-500",
            image.status === 'failed' && "bg-red-500"
          )}>
            {image.status === 'completed' ? '已完成' : 
             image.status === 'processing' ? '处理中' : '失败'}
          </Badge>
        </div>
        {selected && (
          <div className="absolute inset-0 bg-amber-500/20 border-2 border-amber-500" />
        )}
      </div>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium truncate">{image.filename}</CardTitle>
        <CardDescription className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>{image.processType || '原图'}</span>
            <span>{image.size}</span>
          </div>
          <div className="text-muted-foreground">{image.createdAt}</div>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(image);
            }}
          >
            <Eye className="w-3 h-3 mr-1" />
            预览
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(image);
            }}
          >
            <Download className="w-3 h-3 mr-1" />
            下载
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(image);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageCard;
