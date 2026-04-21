import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Play, RefreshCw, Wand2 } from "lucide-react";
import { ActiveTab } from './WorkspaceSidebar';

interface ActionButtonsProps {
    isProcessing: boolean;
    onProcess: () => void;
    disabled: boolean;
    activeTab: ActiveTab;
    tabs: { id: ActiveTab; title: string }[];
    resetKey?: string;
}

export default function ActionButtons({
    isProcessing,
    onProcess,
    disabled,
    activeTab,
    tabs,
    resetKey
}: ActionButtonsProps) {
    const [isClicked, setIsClicked] = useState(false);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const currentTabTitle = tabs.find(tab => tab.id === activeTab)?.title;

    const clearResetTimer = () => {
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
    };

    // 切换标签或修改参数时，立即恢复按钮状态
    useEffect(() => {
        clearResetTimer();
        setIsClicked(false);
    }, [activeTab, resetKey]);

    useEffect(() => {
        return () => {
            clearResetTimer();
        };
    }, []);

    const handleClick = async () => {
        clearResetTimer();
        setIsClicked(true);

        try {
            await onProcess();
        } finally {
            // 保留短暂的“已接收请求”反馈，但允许外部变更立即重置
            resetTimerRef.current = setTimeout(() => {
                setIsClicked(false);
                resetTimerRef.current = null;
            }, 1000);
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
        );
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
