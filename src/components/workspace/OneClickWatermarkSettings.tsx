import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import WatermarkEditor from '@/components/watermark/WatermarkEditor';

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface OneClickWatermarkSettingsProps {
    enableWatermark: boolean;
    setEnableWatermark: (enable: boolean) => void;
    watermarkType: 'text' | 'logo';
    setWatermarkType: (type: 'text' | 'logo') => void;
    watermarkText: string;
    setWatermarkText: (text: string) => void;
    watermarkLogo: UploadedImage | null;
    removeWatermarkLogo: () => void;
    watermarkLogoInputRef: React.RefObject<HTMLInputElement | null>;
    uploadedImages: UploadedImage[];
    selectedPreviewIndex: number;
    onPositionChange: (position: any) => void;
}

export default function OneClickWatermarkSettings({
    enableWatermark,
    setEnableWatermark,
    watermarkType,
    setWatermarkType,
    watermarkText,
    setWatermarkText,
    watermarkLogo,
    removeWatermarkLogo,
    watermarkLogoInputRef,
    uploadedImages,
    selectedPreviewIndex,
    onPositionChange
}: OneClickWatermarkSettingsProps) {
    return (
        <Card className="bg-white mt-6">
            <CardContent className="p-6">
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 mb-3">
                        <input
                            type="checkbox"
                            id="enableWatermark"
                            checked={enableWatermark}
                            onChange={(e) => setEnableWatermark(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <Label htmlFor="enableWatermark" className="text-sm font-medium text-gray-900 cursor-pointer">
                            启用水印功能
                        </Label>
                    </div>
                    {enableWatermark && (
                        <div className="space-y-4">
                            {/* 水印类型和内容配置 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="oneClickWatermarkType" className="text-sm font-medium">水印类型</Label>
                                    <select
                                        id="oneClickWatermarkType"
                                        value={watermarkType}
                                        onChange={(e) => setWatermarkType(e.target.value as 'text' | 'logo')}
                                        className="mt-1.5 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    >
                                        <option value="text">文字水印</option>
                                        <option value="logo">Logo水印</option>
                                    </select>
                                </div>
                                {watermarkType === 'text' ? (
                                    <div>
                                        <Label htmlFor="oneClickWatermarkText" className="text-sm font-medium">水印文字</Label>
                                        <Input
                                            id="oneClickWatermarkText"
                                            type="text"
                                            value={watermarkText}
                                            onChange={(e) => setWatermarkText(e.target.value)}
                                            placeholder="输入水印文字..."
                                            className="mt-1.5 text-sm"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <Label className="text-sm font-medium">Logo图片</Label>
                                        {watermarkLogo ? (
                                            <div className="mt-1.5 p-3 border-2 border-gray-200 rounded-lg bg-gradient-to-br from-gray-50 to-white hover:border-gray-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                                                        <img 
                                                            src={watermarkLogo.preview} 
                                                            alt="Logo" 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {watermarkLogo.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            已上传
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={removeWatermarkLogo}
                                                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="default"
                                                className="w-full mt-1.5 h-auto py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                                onClick={() => watermarkLogoInputRef.current?.click()}
                                            >
                                                <div className="flex flex-col items-center gap-1">
                                                    <Upload className="w-5 h-5 text-gray-400" />
                                                    <span className="text-sm font-medium">上传Logo图片</span>
                                                    <span className="text-xs text-gray-500">支持 PNG、JPG 格式</span>
                                                </div>
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Logo 位置调整编辑器 */}
                            {watermarkType === 'logo' && watermarkLogo && uploadedImages.length > 0 && (
                                <div className="pt-2">
                                    <div className="mb-3">
                                        <Label className="text-sm font-medium">调整Logo位置和大小</Label>
                                        <p className="text-xs text-gray-500 mt-1">拖动Logo调整位置，拖动边角调整大小</p>
                                    </div>
                                    <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-white shadow-sm">
                                        <WatermarkEditor
                                            imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                                            logoUrl={watermarkLogo.preview}
                                            onPositionChange={onPositionChange}
                                            width={400}
                                            height={300}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
