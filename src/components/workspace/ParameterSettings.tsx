import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon } from "lucide-react";
import { ActiveTab } from './WorkspaceSidebar';
import PromptTemplateSelector from './PromptTemplateSelector';
import QualityReviewToggle from './QualityReviewToggle';
import VideoPromptSelector from './VideoPromptSelector';

interface ParameterSettingsProps {
    activeTab: ActiveTab;
    outputResolution: string;
    setOutputResolution: (value: string) => void;
    aiModel?: string;
    setAiModel?: (value: string) => void;
    availableProviders?: string[]; // 可用的提供商列表
    // 提示词相关
    backgroundPrompt?: string;
    setBackgroundPrompt?: (value: string) => void;
    outpaintPrompt?: string;
    setOutpaintPrompt?: (value: string) => void;
    // 一键增强专用：独立的背景替换和扩图提示词
    oneClickBackgroundPrompt?: string;
    setOneClickBackgroundPrompt?: (value: string) => void;
    oneClickOutpaintPrompt?: string;
    setOneClickOutpaintPrompt?: (value: string) => void;
    enableOneClickOutpaint?: boolean;
    setEnableOneClickOutpaint?: (value: boolean) => void;
    // 扩图比例参数
    xScale?: string;
    setXScale?: (value: string) => void;
    yScale?: string;
    setYScale?: (value: string) => void;
    // 智能审核相关
    enableQualityReview?: boolean;
    setEnableQualityReview?: (value: boolean) => void;
    // 视频生成相关
    enableVideo?: boolean;
    setEnableVideo?: (value: boolean) => void;
    videoPrompt?: string;
    setVideoPrompt?: (value: string) => void;
    videoFrames?: number;
    setVideoFrames?: (value: number) => void;
    videoAspectRatio?: string;
    setVideoAspectRatio?: (value: string) => void;
}

export default function ParameterSettings({
    activeTab,
    outputResolution,
    setOutputResolution,
    aiModel = 'gemini',
    setAiModel,
    availableProviders = [],
    backgroundPrompt = '',
    setBackgroundPrompt,
    outpaintPrompt = '',
    setOutpaintPrompt,
    oneClickBackgroundPrompt = '',
    setOneClickBackgroundPrompt,
    oneClickOutpaintPrompt = '',
    setOneClickOutpaintPrompt,
    enableOneClickOutpaint = true,
    setEnableOneClickOutpaint,
    xScale = '2.0',
    setXScale,
    yScale = '2.0',
    setYScale,
    enableQualityReview = false,
    setEnableQualityReview,
    // 视频生成相关
    enableVideo = false,
    setEnableVideo,
    videoPrompt = '',
    setVideoPrompt,
    videoFrames = 121,
    setVideoFrames,
    videoAspectRatio = '16:9',
    setVideoAspectRatio,
}: ParameterSettingsProps) {
    
    // 根据功能类型获取可用的提供商
    const getProvidersForTab = (tab: ActiveTab): string[] => {
        switch (tab) {
            case 'background':
            case 'one-click':
                // 背景替换支持 gemini, gpt, jimeng
                return availableProviders.filter(p => ['gemini', 'gpt', 'jimeng'].includes(p));
            case 'expansion':
                // 扩图支持 qwen, volcengine
                return availableProviders.filter(p => ['qwen', 'volcengine'].includes(p));
            case 'upscaling':
                // 画质增强支持 volcengine
                return availableProviders.filter(p => p === 'volcengine');
            default:
                return availableProviders;
        }
    };
    
    const providersForCurrentTab = getProvidersForTab(activeTab);
    
    // 提供商名称映射
    const providerNames: Record<string, string> = {
        'gemini': 'Gemini',
        'gpt': 'GPT',
        'jimeng': '即梦',
        'volcengine': '火山引擎',
        'qwen': '通义千问'
    };

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
                    <div className="space-y-4">
                        {/* 提示词选择器 */}
                        {setOutpaintPrompt && (
                            <PromptTemplateSelector
                                category="OUTPAINT"
                                value={outpaintPrompt}
                                onChange={setOutpaintPrompt}
                                label="扩图提示词"
                                description="描述如何扩展图像边界"
                            />
                        )}
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="xScale">X轴扩展倍数</Label>
                                <Input
                                    id="xScale"
                                    type="number"
                                    min="1.1"
                                    max="4.0"
                                    step="0.1"
                                    value={xScale}
                                    onChange={(e) => setXScale?.(e.target.value)}
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
                                    value={yScale}
                                    onChange={(e) => setYScale?.(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "upscaling" && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <Label htmlFor="upscalingAiModel">AI 模型选择</Label>
                                <select
                                    id="upscalingAiModel"
                                    value={aiModel}
                                    onChange={(e) => setAiModel?.(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                    disabled={providersForCurrentTab.length === 0}
                                >
                                    {providersForCurrentTab.length === 0 ? (
                                        <option value="">请先配置 AI 提供商</option>
                                    ) : (
                                        providersForCurrentTab.map(provider => (
                                            <option key={provider} value={provider}>
                                                {providerNames[provider] || provider}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500">注意：目前所有模型都使用火山引擎的画质增强服务</p>
                    </div>
                )}

                {activeTab === "background" && (
                    <div className="space-y-4">
                        {/* 智能审核开关 */}
                        {setEnableQualityReview && (
                            <QualityReviewToggle
                                enabled={enableQualityReview}
                                onChange={setEnableQualityReview}
                            />
                        )}

                        {/* 提示词选择器 */}
                        {setBackgroundPrompt && (
                            <PromptTemplateSelector
                                category="BACKGROUND_REPLACE"
                                value={backgroundPrompt}
                                onChange={setBackgroundPrompt}
                                label="背景替换提示词"
                                description="描述如何替换背景，保持主体不变"
                            />
                        )}
                        
                        <div>
                            <Label htmlFor="backgroundAiModel">AI 模型选择</Label>
                            <select
                                id="backgroundAiModel"
                                value={aiModel}
                                onChange={(e) => setAiModel?.(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                disabled={providersForCurrentTab.length === 0}
                            >
                                {providersForCurrentTab.length === 0 ? (
                                    <option value="">请先配置 AI 提供商</option>
                                ) : (
                                    providersForCurrentTab.map(provider => (
                                        <option key={provider} value={provider}>
                                            {providerNames[provider] || provider}
                                        </option>
                                    ))
                                )}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">选择用于背景替换的 AI 模型</p>
                        </div>
                    </div>
                )}

                {(activeTab === "watermark" || activeTab === "one-click") && (
                    <div className="space-y-4">
                        {activeTab === "one-click" && (
                            <>
                                {/* 背景替换提示词 */}
                                {setOneClickBackgroundPrompt && (
                                    <PromptTemplateSelector
                                        category="BACKGROUND_REPLACE"
                                        value={oneClickBackgroundPrompt}
                                        onChange={setOneClickBackgroundPrompt}
                                        label="背景替换提示词"
                                        description="描述如何替换背景，保持产品主体不变"
                                    />
                                )}
                                
                                {/* 扩图提示词 */}
                                {setOneClickOutpaintPrompt && (
                                    <>
                                        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                            <div>
                                                <Label className="text-sm font-medium">启用扩图</Label>
                                                <p className="text-xs text-gray-500 mt-1">关闭后，一键增强只执行背景替换、高清化和水印</p>
                                            </div>
                                            {setEnableOneClickOutpaint && (
                                                <Switch
                                                    checked={enableOneClickOutpaint}
                                                    onCheckedChange={setEnableOneClickOutpaint}
                                                />
                                            )}
                                        </div>
                                        <div className={!enableOneClickOutpaint ? 'pointer-events-none opacity-60' : ''}>
                                            <PromptTemplateSelector
                                                category="OUTPAINT"
                                                value={oneClickOutpaintPrompt}
                                                onChange={setOneClickOutpaintPrompt}
                                                label="扩图提示词"
                                                description="描述如何扩展图像边界，自然延伸背景"
                                            />
                                        </div>
                                    </>
                                )}
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="xScale">X轴扩展倍数</Label>
                                        <Input
                                            id="xScale"
                                            type="number"
                                            min="1.1"
                                            max="4.0"
                                            step="0.1"
                                            value={xScale}
                                            onChange={(e) => setXScale?.(e.target.value)}
                                            className="mt-1"
                                            disabled={!enableOneClickOutpaint}
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
                                            value={yScale}
                                            onChange={(e) => setYScale?.(e.target.value)}
                                            className="mt-1"
                                            disabled={!enableOneClickOutpaint}
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
                                </div>
                                <div>
                                    <Label htmlFor="oneClickAiModel">AI 模型选择</Label>
                                    <select
                                        id="oneClickAiModel"
                                        value={aiModel}
                                        onChange={(e) => setAiModel?.(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                        disabled={providersForCurrentTab.length === 0}
                                    >
                                        {providersForCurrentTab.length === 0 ? (
                                            <option value="">请先配置 AI 提供商</option>
                                        ) : (
                                            providersForCurrentTab.map(provider => (
                                                <option key={provider} value={provider}>
                                                    {providerNames[provider] || provider}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">用于背景替换和画质增强</p>
                                </div>

                                {/* 视频生成选项 */}
                                <div className="border-t pt-4 mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-base font-semibold">启用视频生成</Label>
                                            <p className="text-xs text-gray-500 mt-1">处理完成后自动生成视频</p>
                                        </div>
                                        {setEnableVideo && (
                                            <Switch
                                                checked={enableVideo}
                                                onCheckedChange={setEnableVideo}
                                            />
                                        )}
                                    </div>

                                    {enableVideo && (
                                        <>
                                            <VideoPromptSelector
                                                value={videoPrompt}
                                                onChange={(value) => setVideoPrompt?.(value)}
                                                label="视频生成提示词"
                                                description="选择预设风格或自定义提示词"
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="videoFrames">视频时长</Label>
                                                    <select
                                                        id="videoFrames"
                                                        value={videoFrames}
                                                        onChange={(e) => setVideoFrames?.(parseInt(e.target.value))}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                                    >
                                                        <option value="121">5秒 (121帧)</option>
                                                        <option value="241">10秒 (241帧)</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <Label htmlFor="videoAspectRatio">视频比例</Label>
                                                    <select
                                                        id="videoAspectRatio"
                                                        value={videoAspectRatio}
                                                        onChange={(e) => setVideoAspectRatio?.(e.target.value)}
                                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                                    >
                                                        <option value="16:9">16:9 (横屏)</option>
                                                        <option value="9:16">9:16 (竖屏)</option>
                                                        <option value="1:1">1:1 (正方形)</option>
                                                        <option value="4:3">4:3</option>
                                                        <option value="3:4">3:4</option>
                                                        <option value="21:9">21:9 (超宽)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </>
                                    )}
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
