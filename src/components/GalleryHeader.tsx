
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { FolderPlus, Search, Grid3X3, List, Download, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GalleryState } from '@/types/gallery';

interface GalleryHeaderProps {
  galleryState: GalleryState;
  onSearchChange: (term: string) => void;
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onBatchDownload: () => void;
  onBatchDelete: () => void;
  onCreateFolder: () => void;
}

const GalleryHeader = ({
  galleryState,
  onSearchChange,
  onViewModeChange,
  onBatchDownload,
  onBatchDelete,
  onCreateFolder,
}: GalleryHeaderProps) => {
  const hasSelection = galleryState.selectedImages.length > 0 || galleryState.selectedFolders.length > 0;
  const totalSelected = galleryState.selectedImages.length + galleryState.selectedFolders.length;

  return (
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
                {hasSelection ? `已选择 ${totalSelected} 项` : '管理您的处理结果和文件夹'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Selection Actions */}
            {hasSelection && (
              <>
                <Button variant="outline" size="sm" onClick={onBatchDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  批量下载
                </Button>
                <Button variant="outline" size="sm" onClick={onBatchDelete} className="text-red-600">
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
                onClick={() => onViewModeChange('grid')}
                className="h-7 px-2"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={galleryState.viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
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
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-64 bg-white/90"
              />
            </div>
            
            <Button 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={onCreateFolder}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              新建文件夹
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GalleryHeader;
