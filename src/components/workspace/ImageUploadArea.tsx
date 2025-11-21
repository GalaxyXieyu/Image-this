import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileImage, Trash2, ZoomIn, ChevronLeft, ChevronRight, X } from "lucide-react";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface ImageUploadAreaProps {
    uploadedImages: UploadedImage[];
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onFolderUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    onRemove: (id: string) => void;
    onPreview: (index: number) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    selectedIndex: number;
    onSelectIndex: (index: number) => void;
    isFullWidth?: boolean;
}

export default function ImageUploadArea({
    uploadedImages,
    onUpload,
    onFolderUpload,
    onClear,
    onRemove,
    onPreview,
    fileInputRef,
    folderInputRef,
    selectedIndex,
    onSelectIndex,
    isFullWidth = false
}: ImageUploadAreaProps) {

    const navigateImage = (direction: 'prev' | 'next', e: React.MouseEvent) => {
        e.stopPropagation();
        if (direction === 'prev') {
            onSelectIndex(selectedIndex > 0 ? selectedIndex - 1 : uploadedImages.length - 1);
        } else {
            onSelectIndex(selectedIndex < uploadedImages.length - 1 ? selectedIndex + 1 : 0);
        }
    };

    return (
        <Card className={`border-2 border-dashed border-gray-300 hover:border-orange-400 transition-all duration-300 bg-white ${isFullWidth ? 'lg:col-span-2' : ''}`}>
            <CardContent className="p-6">
                {uploadedImages.length === 0 ? (
                    // Empty State
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                            <FileImage className="w-6 h-6 text-orange-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">上传图片</h3>
                        <p className="text-gray-500 text-sm mb-3">
                            支持 JPG, PNG 格式，支持批量上传或文件夹上传
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                size="sm"
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                选择图片
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={() => folderInputRef.current?.click()}
                            >
                                <FileImage className="w-4 h-4 mr-2" />
                                选择文件夹
                            </Button>
                        </div>
                    </div>
                ) : (
                    // Image Preview State
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">已选择 {uploadedImages.length} 张图片</span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    添加图片
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onClear}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    清空
                                </Button>
                            </div>
                        </div>

                        {/* Large Preview */}
                        <div className="mb-4">
                            <div
                                className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-orange-300 transition-colors"
                                onClick={() => onPreview(selectedIndex)}
                            >
                                <img
                                    src={uploadedImages[selectedIndex]?.preview}
                                    alt={uploadedImages[selectedIndex]?.name}
                                    className="w-full h-full object-contain"
                                />

                                {/* Zoom Overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                                        <ZoomIn className="w-5 h-5 text-gray-700" />
                                    </div>
                                </div>

                                {uploadedImages.length > 1 && (
                                    <>
                                        <button
                                            onClick={(e) => navigateImage('prev', e)}
                                            className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 shadow-md"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={(e) => navigateImage('next', e)}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 shadow-md"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                                <div className="absolute bottom-2 left-2 right-2 bg-white bg-opacity-90 rounded px-3 py-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{uploadedImages[selectedIndex]?.name}</p>
                                    {uploadedImages.length > 1 && (
                                        <p className="text-xs text-gray-600">{selectedIndex + 1} / {uploadedImages.length}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail Grid */}
                        {uploadedImages.length > 1 && (
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                                {uploadedImages.map((image, index) => (
                                    <div
                                        key={image.id}
                                        className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${index === selectedIndex
                                            ? 'ring-2 ring-orange-400 ring-offset-2'
                                            : 'hover:ring-2 hover:ring-gray-300'
                                            }`}
                                        onClick={() => onSelectIndex(index)}
                                    >
                                        <img
                                            src={image.preview}
                                            alt={image.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(image.id);
                                            }}
                                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 text-xs"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
