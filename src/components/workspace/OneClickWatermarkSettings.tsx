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
    // 扩图比例（用于水印预览）
    xScale?: number;
    yScale?: number;
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
    onPositionChange,
    xScale = 1,
    yScale = 1
}: OneClickWatermarkSettingsProps) {
    return (
        <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
                <div className="space-y-6">
                    {/* 标题区域 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="enableWatermark"
                                checked={enableWatermark}
                                onChange={(e) => setEnableWatermark(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                            />
                            <Label htmlFor="enableWatermark" className="text-base font-semibold text-gray-900 cursor-pointer">
                                水印设置
                            </Label>
                        </div>
                    </div>

                    {enableWatermark && (
                        <div className="space-y-6 pt-2 border-t border-gray-100">
                            {/* 水印类型选择 */}
                            <div className="space-y-2">
                                <Label htmlFor="oneClickWatermarkType" className="text-sm font-medium text-gray-700">
                                    水印类型
                                </Label>
                                <select
                                    id="oneClickWatermarkType"
                                    value={watermarkType}
                                    onChange={(e) => setWatermarkType(e.target.value as 'text' | 'logo')}
                                    className="w-full h-10 px-3 border border-gray-200 rounded-lg bg-white text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                >
                                    <option value="text">文字水印</option>
                                    <option value="logo">Logo水印</option>
                                </select>
                            </div>

                            {/* 水印内容配置 */}
                            {watermarkType === 'text' ? (
                                <div className="space-y-2">
                                    <Label htmlFor="oneClickWatermarkText" className="text-sm font-medium text-gray-700">
                                        水印文字
                                    </Label>
                                    <Input
                                        id="oneClickWatermarkText"
                                        type="text"
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        placeholder="输入水印文字..."
                                        className="h-10 text-sm"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium text-gray-700">Logo图片</Label>
                                    {watermarkLogo ? (
                                        <div className="p-3.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white transition-colors shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                                                    <img
                                                        src={watermarkLogo.preview}
                                                        alt="Logo"
                                                        className="w-full h-full object-contain p-1.5"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {watermarkLogo.name}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        已上传
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={removeWatermarkLogo}
                                                    className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors rounded-lg flex-shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-auto py-6 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all rounded-lg group"
                                            onClick={() => watermarkLogoInputRef.current?.click()}
                                        >
                                            <div className="flex flex-col items-center gap-2.5">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                                                    <Upload className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-900">上传Logo图片</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">支持 PNG、JPG 格式</p>
                                                </div>
                                            </div>
                                        </Button>
                                    )}
                                </div>
                            )}
                            
                            {/* Logo 位置调整编辑器 */}
                            {watermarkType === 'logo' && watermarkLogo && uploadedImages.length > 0 && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-sm font-semibold text-gray-900">
                                            调整Logo位置和大小
                                        </Label>
                                        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                            拖动Logo调整位置，拖动边角调整大小
                                            {(xScale > 1 || yScale > 1) && (
                                                <span className="ml-2 text-blue-600 font-medium">
                                                    （灰色区域为扩图后的范围，蓝色虚线为原图边界）
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm p-4">
                                        <WatermarkEditor
                                            imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                                            logoUrl={watermarkLogo.preview}
                                            onPositionChange={onPositionChange}
                                            width={400}
                                            height={300}
                                            xScale={xScale}
                                            yScale={yScale}
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
