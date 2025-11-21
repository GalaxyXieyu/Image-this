import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Wand2, Loader2, Settings as SettingsIcon } from "lucide-react";
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
    onLogoUpload
}: WatermarkEditorViewProps) {
    return (
        <div className="space-y-6">
            <Card className="bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">水印编辑器</CardTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            上传图片
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
                            <Upload className="w-4 h-4 mr-2" />
                            上传文件夹
                        </Button>
                        <Button variant="outline" size="sm" onClick={onChangeLogo}>
                            <Upload className="w-4 h-4 mr-2" />
                            上传Logo
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mx-auto">
                        <WatermarkEditor
                            imageUrl={uploadedImages[selectedPreviewIndex]?.preview || ''}
                            logoUrl={watermarkLogo?.preview || ''}
                            onPositionChange={onPositionChange}
                            width={600}
                            height={400}
                        />
                    </div>

                    {/* Thumbnail Strip for Multiple Images */}
                    {uploadedImages.length > 1 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 justify-center">
                            {uploadedImages.map((image, index) => (
                                <div
                                    key={image.id}
                                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden cursor-pointer border-2 transition-all ${index === selectedPreviewIndex
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
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="bg-white">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                        <SettingsIcon className="w-5 h-5" />
                        参数设置
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
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
                        {uploadedImages.length === 0 && !watermarkLogo && "请先上传背景图片和 Logo"}
                        {uploadedImages.length === 0 && watermarkLogo && "请先上传背景图片"}
                        {uploadedImages.length > 0 && !watermarkLogo && "请先上传 Logo"}
                    </p>
                )}
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
