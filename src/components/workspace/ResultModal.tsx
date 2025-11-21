import React from 'react';
import { X } from "lucide-react";

interface ProcessedResult {
    id: string;
    originalImageId: string;
    originalName: string;
    processedImageUrl: string;
    processType: string;
    timestamp: string;
    parameters?: Record<string, unknown>;
}

interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: ProcessedResult | null;
}

export default function ResultModal({ isOpen, onClose, result }: ResultModalProps) {
    if (!isOpen || !result) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-12 h-12 bg-white bg-opacity-90 text-gray-700 rounded-full flex items-center justify-center hover:bg-opacity-100 z-10 transition-all shadow-lg"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Image Container */}
                <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
                    <img
                        src={result.processedImageUrl}
                        alt={`${result.originalName} - ${result.processType}`}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>
    );
}
