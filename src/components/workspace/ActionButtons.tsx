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
            <Button
                size="lg"
                onClick={onProcess}
                disabled={disabled || isProcessing}
                className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        处理中...
                    </>
                ) : (
                    <>
                        <Wand2 className="w-6 h-6 mr-3" />
                        开始处理
                    </>
                )}
            </Button>
        )
    }

    return (
        <Button
            size="lg"
            onClick={onProcess}
            disabled={disabled}
            className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
        >
            {isProcessing ? (
                <>
                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                    处理中...
                </>
            ) : (
                <>
                    <Play className="w-6 h-6 mr-3" />
                    开始{currentTabTitle}
                </>
            )}
        </Button>
    );
}
