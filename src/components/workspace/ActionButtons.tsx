import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Play, Wand2, Loader2, CheckCircle2 } from "lucide-react";
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
    const [isClicked, setIsClicked] = useState(false);

    const currentTabTitle = tabs.find(tab => tab.id === activeTab)?.title;

    // 当标签页切换时，重置点击状态
    useEffect(() => {
        setIsClicked(false);
    }, [activeTab]);

    const handleClick = async () => {
        setIsClicked(true);
        try {
            await onProcess();
        } finally {
            // 延迟重置点击状态，确保用户看到反馈
            setTimeout(() => setIsClicked(false), 1000);
        }
    };

    if (activeTab === "watermark") {
        return (
            <Button
                size="lg"
                onClick={handleClick}
                disabled={disabled || isProcessing || isClicked}
                className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
                {isClicked && !isProcessing ? (
                    <>
                        <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                        已接收请求
                    </>
                ) : isProcessing ? (
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
            onClick={handleClick}
            disabled={disabled || isClicked}
            className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
        >
            {isClicked && !isProcessing ? (
                <>
                    <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                    已接收请求
                </>
            ) : isProcessing ? (
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
