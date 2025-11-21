import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, X } from "lucide-react";

interface Task {
    id: string;
    type: string;
    status: string;
    progress: number;
    currentStep: string;
    createdAt: string;
    originalImageId?: string;
    originalName?: string;
    outputData?: string;
    errorMessage?: string;
}

interface TaskProgressProps {
    tasks: Task[];
    isProcessing: boolean;
    getProcessTypeName: (type: string) => string;
}

export default function TaskProgress({ tasks, isProcessing, getProcessTypeName }: TaskProgressProps) {
    if (!isProcessing || tasks.length === 0) {
        return null;
    }

    return (
        <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <h3 className="text-lg font-semibold text-gray-900">
                        正在处理 {tasks.length} 个任务
                    </h3>
                </div>

                <div className="space-y-3">
                    {tasks.map((task) => (
                        <div key={task.id} className="bg-white rounded-lg p-4 border border-orange-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">
                                    {task.originalName || 'Unknown'} - {getProcessTypeName(task.type)}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {task.status === 'COMPLETED' ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : task.status === 'FAILED' ? (
                                        <X className="w-5 h-5 text-red-500" />
                                    ) : (
                                        `${Math.round(task.progress)}%`
                                    )}
                                </span>
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${task.status === 'COMPLETED' ? 'bg-green-500' :
                                        task.status === 'FAILED' ? 'bg-red-500' :
                                            'bg-orange-500'
                                        }`}
                                    style={{ width: `${Math.max(task.progress, 5)}%` }}
                                ></div>
                            </div>

                            <p className="text-sm text-gray-600">{task.currentStep}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
