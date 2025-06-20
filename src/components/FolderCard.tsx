
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder } from '@/types/gallery';
import { cn } from '@/lib/utils';

interface FolderCardProps {
  folder: Folder;
  selected: boolean;
  onSelect: (folderId: string, multiSelect?: boolean) => void;
  onOpen: (folder: Folder) => void;
  onContextMenu: (e: React.MouseEvent, folder: Folder) => void;
}

const FolderCard = ({ 
  folder, 
  selected, 
  onSelect, 
  onOpen,
  onContextMenu 
}: FolderCardProps) => {
  const handleClick = (e: React.MouseEvent) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(folder.id, multiSelect);
  };

  const handleDoubleClick = () => {
    onOpen(folder);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, folder);
  };

  return (
    <Card 
      className={cn(
        "bg-white/90 backdrop-blur-sm border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none",
        selected && "ring-2 ring-amber-500 ring-offset-2"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
            folder.color
          )}>
            <span className="text-white text-2xl">📁</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{folder.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{folder.imageCount} 张图片</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(folder);
            }}
          >
            打开文件夹
          </Button>
        </div>
        {selected && (
          <div className="absolute inset-0 bg-amber-500/20 border-2 border-amber-500 rounded-lg" />
        )}
      </CardContent>
    </Card>
  );
};

export default FolderCard;
