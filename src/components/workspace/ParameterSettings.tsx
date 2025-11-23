import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon } from "lucide-react";
import { ActiveTab } from './WorkspaceSidebar';
import PromptTemplateSelector from './PromptTemplateSelector';

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
    oneClickPrompt?: string;
    setOneClickPrompt?: (value: string) => void;
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
    oneClickPrompt = '',
    setOneClickPrompt,
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
        'gpt': 'GPT-4 Vision',
        'jimeng': '即梦 (火山引擎)',
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
                                {/* 提示词选择器 */}
                                {setOneClickPrompt && (
                                    <PromptTemplateSelector
                                        category="ONE_CLICK"
                                        value={oneClickPrompt}
                                        onChange={setOneClickPrompt}
                                        label="一键增强提示词"
                                        description="综合处理：背景优化 + 扩图 + 高清化"
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
