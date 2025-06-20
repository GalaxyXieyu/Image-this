
import { Folder } from '@/types/gallery';
import FolderCard from '@/components/FolderCard';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface FolderGridProps {
  folders: Folder[];
  selectedFolders: string[];
  onFolderSelect: (folderId: string, multiSelect?: boolean) => void;
  onFolderOpen: (folder: Folder) => void;
  onFolderContextMenu: (e: React.MouseEvent, folder: Folder) => void;
}

const FolderGrid = ({
  folders,
  selectedFolders,
  onFolderSelect,
  onFolderOpen,
  onFolderContextMenu,
}: FolderGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {folders.map((folder) => (
        <ContextMenu key={folder.id}>
          <ContextMenuTrigger asChild>
            <div>
              <FolderCard
                folder={folder}
                selected={selectedFolders.includes(folder.id)}
                onSelect={onFolderSelect}
                onOpen={onFolderOpen}
                onContextMenu={onFolderContextMenu}
              />
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => onFolderOpen(folder)}>
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
  );
};

export default FolderGrid;
