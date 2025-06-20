
export interface ImageFile {
  id: string;
  filename: string;
  originalUrl: string;
  processedUrl?: string;
  thumbnailUrl: string;
  processType?: string;
  status: 'completed' | 'processing' | 'failed';
  createdAt: string;
  updatedAt: string;
  size: string;
  dimensions?: {
    width: number;
    height: number;
  };
  folderId: string | null;
  tags?: string[];
  selected?: boolean;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  selected?: boolean;
}

export interface GalleryState {
  selectedImages: string[];
  selectedFolders: string[];
  draggedItem: {
    type: 'image' | 'folder';
    id: string;
  } | null;
  searchTerm: string;
  sortBy: 'name' | 'date' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  showFolders: boolean;
}

export interface GalleryContextMenuData {
  type: 'image' | 'folder' | 'empty';
  target?: ImageFile | Folder;
  position: { x: number; y: number };
}
