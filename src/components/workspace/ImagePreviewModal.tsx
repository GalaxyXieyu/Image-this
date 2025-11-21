import React from 'react';
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface ImagePreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: UploadedImage[];
    selectedIndex: number;
    onNavigate: (direction: 'prev' | 'next') => void;
}

export default function ImagePreviewModal({
    isOpen,
    onClose,
    images,
    selectedIndex,
    onNavigate
}: ImagePreviewModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-4xl max-h-full">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
                >
                    <X className="w-6 h-6" />
                </button>

                {images.length > 1 && (
                    <>
                        <button
                            onClick={() => onNavigate('prev')}
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => onNavigate('next')}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </>
                )}

                <img
                    src={images[selectedIndex]?.preview}
                    alt={images[selectedIndex]?.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                />

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-95 text-gray-900 px-4 py-2 rounded-lg">
                    <p className="text-center font-medium">
                        {images[selectedIndex]?.name}
                    </p>
                    {images.length > 1 && (
                        <p className="text-center text-sm text-gray-600">
                            {selectedIndex + 1} / {images.length}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
