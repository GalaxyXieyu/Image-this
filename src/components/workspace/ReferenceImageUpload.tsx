import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ImageIcon, X } from "lucide-react";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface ReferenceImageUploadProps {
    referenceImage: UploadedImage | null;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
    title?: string;
    description?: string;
}

export default function ReferenceImageUpload({
    referenceImage,
    onUpload,
    onRemove,
    inputRef,
    title = "参考图片",
    description = "选择背景参考图片"
}: ReferenceImageUploadProps) {
    return (
        <Card className="border-2 border-dashed border-blue-300 hover:border-blue-300 transition-all duration-300 bg-white">
            <CardContent className="p-6">
                {!referenceImage ? (
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                            <ImageIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                        <p className="text-gray-500 text-sm mb-3">
                            {description}
                        </p>
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => inputRef.current?.click()}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            选择图片
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                            <img
                                src={referenceImage.preview}
                                alt={referenceImage.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <p className="text-sm text-gray-700 mb-2 truncate">{referenceImage.name}</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => inputRef.current?.click()}
                            >
                                更换
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={onRemove}
                            >
                                <X className="w-4 h-4 mr-1" />
                                删除
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
