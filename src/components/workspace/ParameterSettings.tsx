import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon } from "lucide-react";
import { ActiveTab } from './WorkspaceSidebar';

interface ParameterSettingsProps {
    activeTab: ActiveTab;
    outputResolution: string;
    setOutputResolution: (value: string) => void;
    // Additional props for specific settings can be added here or handled via children/context if complex
    // For now, we'll use direct DOM access for some inputs as in the original code, 
    // or better, we should lift state up. 
    // To keep refactor simple, I will replicate the structure but ideally these should be controlled inputs.
}

export default function ParameterSettings({
    activeTab,
    outputResolution,
    setOutputResolution,
}: ParameterSettingsProps) {

    // Note: In the original code, some inputs like xScale, yScale, upscaleFactor were uncontrolled (using document.getElementById).
    // We will keep them as uncontrolled for now to minimize logic changes, but render them here.
    // Ideally, these should be converted to controlled components in a future iteration.

    return (
        <Card className="bg-white shadow-lg border-2 border-gray-200">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-gray-900 text-base">
                    <SettingsIcon className="w-5 h-5 text-blue-600" />
                    参数设置
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
                {activeTab === "expansion" && (
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="xScale">X轴扩展倍数</Label>
                            <Input
                                id="xScale"
                                type="number"
                                min="1.1"
                                max="4.0"
                                step="0.1"
                                defaultValue="2.0"
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="yScale">Y轴扩展倍数</Label>
                            <Input
                                id="yScale"
                                type="number"
                                min="1.1"
                                max="4.0"
                                step="0.1"
                                defaultValue="2.0"
                                className="mt-1"
                            />
                        </div>
                    </div>
                )}

                {activeTab === "upscaling" && (
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="upscaleFactor">高清化倍数</Label>
                            <select
                                id="upscaleFactor"
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                defaultValue="2"
                            >
                                <option value="2">2x</option>
                                <option value="4">4x</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === "background" && (
                    <div>
                        <Label htmlFor="customPrompt">自定义提示词（可选）</Label>
                        <textarea
                            id="customPrompt"
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                            rows={3}
                            placeholder="描述期望的背景效果..."
                        />
                    </div>
                )}

                {(activeTab === "watermark" || activeTab === "one-click") && (
                    <div className="grid grid-cols-3 gap-4">
                        {activeTab === "one-click" && (
                            <>
                                <div>
                                    <Label htmlFor="xScale">X轴扩展倍数</Label>
                                    <Input
                                        id="xScale"
                                        type="number"
                                        min="1.1"
                                        max="4.0"
                                        step="0.1"
                                        defaultValue="2.0"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="yScale">Y轴扩展倍数</Label>
                                    <Input
                                        id="yScale"
                                        type="number"
                                        min="1.1"
                                        max="4.0"
                                        step="0.1"
                                        defaultValue="2.0"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="upscaleFactor">高清化倍数</Label>
                                    <select
                                        id="upscaleFactor"
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                        defaultValue="2"
                                    >
                                        <option value="2">2x</option>
                                        <option value="4">4x</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div>
                            <Label htmlFor={activeTab === "one-click" ? "oneClickOutputResolution" : "outputResolution"}>
                                输出分辨率
                            </Label>
                            <select
                                id={activeTab === "one-click" ? "oneClickOutputResolution" : "outputResolution"}
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
                )}
            </CardContent>
        </Card>
    );
}
