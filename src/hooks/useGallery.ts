
import { useState, useCallback } from 'react';
import { ImageFile, Folder, GalleryState } from '@/types/gallery';

export const useGallery = () => {
  const [galleryState, setGalleryState] = useState<GalleryState>({
    selectedImages: [],
    selectedFolders: [],
    draggedItem: null,
    searchTerm: '',
    sortBy: 'date',
    sortOrder: 'desc',
    viewMode: 'grid',
    showFolders: true,
  });

  const updateSearchTerm = useCallback((term: string) => {
    setGalleryState(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const toggleImageSelection = useCallback((imageId: string, multiSelect = false) => {
    setGalleryState(prev => {
      if (!multiSelect) {
        return { ...prev, selectedImages: [imageId], selectedFolders: [] };
      }
      
      const isSelected = prev.selectedImages.includes(imageId);
      return {
        ...prev,
        selectedImages: isSelected 
          ? prev.selectedImages.filter(id => id !== imageId)
          : [...prev.selectedImages, imageId]
      };
    });
  }, []);

  const toggleFolderSelection = useCallback((folderId: string, multiSelect = false) => {
    setGalleryState(prev => {
      if (!multiSelect) {
        return { ...prev, selectedFolders: [folderId], selectedImages: [] };
      }
      
      const isSelected = prev.selectedFolders.includes(folderId);
      return {
        ...prev,
        selectedFolders: isSelected 
          ? prev.selectedFolders.filter(id => id !== folderId)
          : [...prev.selectedFolders, folderId]
      };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setGalleryState(prev => ({ 
      ...prev, 
      selectedImages: [], 
      selectedFolders: [] 
    }));
  }, []);

  const selectAll = useCallback((images: ImageFile[], folders: Folder[]) => {
    setGalleryState(prev => ({
      ...prev,
      selectedImages: images.map(img => img.id),
      selectedFolders: folders.map(folder => folder.id),
    }));
  }, []);

  const setDraggedItem = useCallback((item: { type: 'image' | 'folder'; id: string } | null) => {
    setGalleryState(prev => ({ ...prev, draggedItem: item }));
  }, []);

  const setSortBy = useCallback((sortBy: GalleryState['sortBy'], sortOrder?: GalleryState['sortOrder']) => {
    setGalleryState(prev => ({ 
      ...prev, 
      sortBy, 
      sortOrder: sortOrder || prev.sortOrder 
    }));
  }, []);

  const setViewMode = useCallback((viewMode: GalleryState['viewMode']) => {
    setGalleryState(prev => ({ ...prev, viewMode }));
  }, []);

  return {
    galleryState,
    updateSearchTerm,
    toggleImageSelection,
    toggleFolderSelection,
    clearSelection,
    selectAll,
    setDraggedItem,
    setSortBy,
    setViewMode,
  };
};
