import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Play, RefreshCw, RotateCcw, Wand2 } from "lucide-react";
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

    const resetRequestState = () => {
        clearResetTimer();
        setIsClicked(false);
    };

    // 切换标签或修改参数时，立即恢复按钮状态
    useEffect(() => {
        resetRequestState();
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

    const renderButtonContent = () => {
        if (isClicked && !isProcessing) {
            return (
                <>
                    <CheckCircle2 className="w-6 h-6 mr-3 text-green-400" />
                    已接收请求
                </>
            );
        }

        if (isProcessing) {
            if (activeTab === "watermark") {
                return (
                    <>
                        <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                        处理中...
                    </>
                );
            }

            return (
                <>
                    <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                    处理中...
                </>
            );
        }

        if (activeTab === "watermark") {
            return (
                <>
                    <Wand2 className="w-6 h-6 mr-3" />
                    开始处理
                </>
            );
        }

        return (
            <>
                <Play className="w-6 h-6 mr-3" />
                开始{currentTabTitle}
            </>
        );
    };

    return (
        <div className="space-y-3">
            {isClicked && !isProcessing && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetRequestState}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        重置请求
                    </Button>
                </div>
            )}

            <Button
                size="lg"
                onClick={handleClick}
                disabled={disabled || isClicked || (activeTab === "watermark" && isProcessing)}
                className="w-full py-6 text-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
                {renderButtonContent()}
            </Button>
        </div>
    );
}
