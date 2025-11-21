import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Wand2, Loader2, Settings as SettingsIcon, X, FolderOpen, Image as ImageIcon } from "lucide-react";
import WatermarkEditor from '@/components/watermark/WatermarkEditor';

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    name: string;
}

interface WatermarkEditorViewProps {
    uploadedImages: UploadedImage[];
    watermarkLogo: UploadedImage | null;
    selectedPreviewIndex: number;
    onSelectIndex: (index: number) => void;
    onPositionChange: (position: any) => void;
    onChangeBackground: () => void;
    onChangeLogo: () => void;
    outputResolution: string;
    setOutputResolution: (value: string) => void;
    isProcessing: boolean;
    onProcess: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    watermarkLogoInputRef: React.RefObject<HTMLInputElement | null>;
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onFolderUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage?: (id: string) => void;
}

export default function WatermarkEditorView({
    uploadedImages,
    watermarkLogo,
    selectedPreviewIndex,
    onSelectIndex,
    onPositionChange,
    onChangeBackground,
    onChangeLogo,
    outputResolution,
    setOutputResolution,
    isProcessing,
    onProcess,
    fileInputRef,
    watermarkLogoInputRef,
    folderInputRef,
    onFileUpload,
    onFolderUpload,
    onLogoUpload,
    onRemoveImage
}: WatermarkEditorViewProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 水印编辑器区域 - 撑满空间 */}
            <Card className="bg-white flex-1 flex flex-col overflow-hidden mb-4">
                <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        水印编辑器
                        {uploadedImages.length > 0 && (
                            <span className="text-sm font-normal text-gray-500">
                                (已上传 {uploadedImages.length} 张图片)
                            </span>
                        )}
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="w-4 h-4 mr-2" />
                            选择图片
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                            <FolderOpen className="w-4 h-4 mr-2" />
                            选择文件夹
                        </Button>
                        <Button variant="outline" size="sm" onClick={onChangeLogo}>
                            <Upload className="w-4 h-4 mr-2" />
                            上传Logo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 flex items-center justify-center min-h-0">
                        <WatermarkEditor
                            imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                            logoUrl={watermarkLogo?.preview || ''}
                            onPositionChange={onPositionChange}
                            width={600}
                            height={400}
                        />
                    </div>

                    {/* Thumbnail Strip for Multiple Images */}
                    {uploadedImages.length > 0 && (
                        <div className="mt-4 flex-shrink-0">
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm text-gray-600">
                                    待处理图片列表 ({uploadedImages.length})
                                </Label>
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 max-h-24">
                                {uploadedImages.map((image, index) => (
                                    <div
                                        key={image.id}
                                        className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all group ${
                                            index === selectedPreviewIndex
                                                ? 'border-blue-500 ring-2 ring-blue-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => onSelectIndex(index)}
                                    >
                                        <img
                                            src={image.preview}
                                            alt={image.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {onRemoveImage && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveImage(image.id);
                                                }}
                                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 truncate">
                                            {image.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 底部固定区域 - 参数设置和按钮 */}
            <div className="flex-shrink-0 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-4 pb-2 space-y-4 border-t border-gray-200">
                <Card className="bg-white shadow-lg border-2 border-gray-200">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
                            <SettingsIcon className="w-5 h-5 text-blue-600" />
                            参数设置
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-3">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="outputResolution">输出分辨率</Label>
                                <select
                                    id="outputResolution"
                                    value={outputResolution}
                                    onChange={(e) => setOutputResolution(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                >
                                    <option value="original">原始分辨率</option>
                                    <option value="1920x1080">1920x1080 (Full HD)</option>
                                    <option value="2560x1440">2560x1440 (2K)</option>
                                    <option value="3840x2160">3840x2160 (4K)</option>
                                    <option value="1080x1080">1080x1080 (正方形)</option>
                                    <option value="1024x1024">1024x1024 (正方形)</option>
                                    <option value="2048x2048">2048x2048 (正方形)</option>
                                </select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col items-center gap-2">
                    <Button
                        size="lg"
                        onClick={onProcess}
                        disabled={isProcessing || uploadedImages.length === 0 || !watermarkLogo}
                        className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
                    >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            处理中...
                        </>
                    ) : (
                        <>
                            <Wand2 className="w-5 h-5 mr-2" />
                            开始处理
                        </>
                    )}
                    </Button>
                    {(uploadedImages.length === 0 || !watermarkLogo) && (
                        <p className="text-sm text-gray-500">
                            {uploadedImages.length === 0 && !watermarkLogo && "请先上传图片和 Logo"}
                            {uploadedImages.length === 0 && watermarkLogo && "请先上传图片（支持批量上传或选择文件夹）"}
                            {uploadedImages.length > 0 && !watermarkLogo && "请先上传 Logo"}
                        </p>
                    )}
                    {uploadedImages.length > 1 && watermarkLogo && (
                        <p className="text-sm text-blue-600">
                            将为 {uploadedImages.length} 张图片批量添加水印
                        </p>
                    )}
                </div>
            </div>

            {/* Hidden Inputs */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={onFileUpload}
            />
            <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                className="hidden"
                onChange={onFolderUpload}
            />
            <input
                ref={watermarkLogoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onLogoUpload}
            />
        </div>
    );
}
