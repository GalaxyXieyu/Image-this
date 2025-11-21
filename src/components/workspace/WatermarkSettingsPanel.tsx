import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileImage } from "lucide-react";
import WatermarkEditor from '@/components/watermark/WatermarkEditor';

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface WatermarkSettingsPanelProps {
    watermarkLogo: UploadedImage | null;
    onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onLogoRemove: () => void;
    logoInputRef: React.RefObject<HTMLInputElement | null>;
    uploadedImages: UploadedImage[];
    selectedIndex: number;
    onPositionChange: (position: any) => void;
    // For One-Click mode integration
    isOneClickMode?: boolean;
    enableWatermark?: boolean;
    setEnableWatermark?: (enable: boolean) => void;
    watermarkType?: 'text' | 'logo';
    setWatermarkType?: (type: 'text' | 'logo') => void;
    watermarkText?: string;
    setWatermarkText?: (text: string) => void;
    fileInputRef?: React.RefObject<HTMLInputElement | null>; // For changing background in editor
}

export default function WatermarkSettingsPanel({
    watermarkLogo,
    onLogoUpload,
    onLogoRemove,
    logoInputRef,
    uploadedImages,
    selectedIndex,
    onPositionChange,
    isOneClickMode = false,
    enableWatermark,
    setEnableWatermark,
    watermarkType,
    setWatermarkType,
    watermarkText,
    setWatermarkText,
    fileInputRef
}: WatermarkSettingsPanelProps) {

    if (isOneClickMode) {
        return (
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        id="enableWatermark"
                        checked={enableWatermark}
                        onChange={(e) => setEnableWatermark?.(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                    />
                    <Label htmlFor="enableWatermark" className="text-sm font-medium text-gray-900 cursor-pointer">
                        启用水印功能
                    </Label>
                </div>
                {enableWatermark && (
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="oneClickWatermarkType" className="text-sm">水印类型</Label>
                            <select
                                id="oneClickWatermarkType"
                                value={watermarkType}
                                onChange={(e) => setWatermarkType?.(e.target.value as 'text' | 'logo')}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 bg-white text-sm"
                            >
                                <option value="text">文字水印</option>
                                <option value="logo">Logo水印</option>
                            </select>
                        </div>
                        {watermarkType === 'text' ? (
                            <div>
                                <Label htmlFor="oneClickWatermarkText" className="text-sm">水印文字</Label>
                                <Input
                                    id="oneClickWatermarkText"
                                    type="text"
                                    value={watermarkText}
                                    onChange={(e) => setWatermarkText?.(e.target.value)}
                                    placeholder="输入水印文字..."
                                    className="mt-1 text-sm"
                                />
                            </div>
                        ) : (
                            <div>
                                <Label className="text-sm">Logo图片</Label>
                                {watermarkLogo ? (
                                    <div className="mt-1 p-2 border border-gray-300 rounded-md bg-white">
                                        <div className="flex items-center gap-2">
                                            <img src={watermarkLogo.preview} alt="Logo" className="w-8 h-8 object-contain" />
                                            <span className="text-xs flex-1 truncate">{watermarkLogo.name}</span>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={onLogoRemove}
                                                className="h-6 px-2"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-1"
                                        onClick={() => logoInputRef.current?.click()}
                                    >
                                        <Upload className="w-3 h-3 mr-1" />
                                        上传Logo
                                    </Button>
                                )}
                            </div>
                        )}
                        {watermarkType === 'logo' && watermarkLogo && uploadedImages.length > 0 && (
                            <div className="mt-3">
                                <Label className="text-sm mb-2 block">调整Logo位置和大小</Label>
                                <WatermarkEditor
                                    imageUrl={uploadedImages[selectedIndex]?.preview || ''}
                                    logoUrl={watermarkLogo.preview}
                                    onPositionChange={onPositionChange}
                                    width={400}
                                    height={300}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Standalone Watermark Mode
    if (!watermarkLogo) {
        return (
            <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-all bg-white">
                <CardContent className="p-6">
                    <div className="text-center py-8">
                        <div
                            className="w-32 h-32 mx-auto mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => logoInputRef.current?.click()}
                        >
                            <FileImage className="w-12 h-12 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-700 mb-3 truncate px-4">
                            支持PNG透明背景格式
                        </p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                type="button"
                                className="bg-blue-500 hover:bg-blue-600"
                                onClick={() => logoInputRef.current?.click()}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                选择图片
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">水印编辑器</CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef?.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        更换背景
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" />
                        更换Logo
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mx-auto">
                    <WatermarkEditor
                        imageUrl={uploadedImages[selectedIndex]?.preview || ''}
                        logoUrl={watermarkLogo.preview}
                        onPositionChange={onPositionChange}
                        width={800}
                        height={600}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
