import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Wand2, Loader2 } from "lucide-react";
import { ActiveTab } from './WorkspaceSidebar';

interface ActionButtonsProps {
    isProcessing: boolean;
    onProcess: () => void;
    disabled: boolean;
    activeTab: ActiveTab;
    tabs: { id: ActiveTab; title: string }[];
}

export default function ActionButtons({
    isProcessing,
    onProcess,
    disabled,
    activeTab,
    tabs
}: ActionButtonsProps) {

    const currentTabTitle = tabs.find(tab => tab.id === activeTab)?.title;

    if (activeTab === "watermark") {
        return (
            <div className="flex justify-center">
                <Button
                    size="lg"
                    onClick={onProcess}
                    disabled={disabled || isProcessing}
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
            </div>
        )
    }

    return (
        <div className="flex justify-center">
            <Button
                size="lg"
                onClick={onProcess}
                disabled={disabled}
                className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
                {isProcessing ? (
                    <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        处理中...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5 mr-2" />
                        开始{currentTabTitle}
                    </>
                )}
            </Button>
        </div>
    );
}
