import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ActiveTab = "one-click" | "background" | "expansion" | "upscaling" | "watermark";

interface Tab {
    id: ActiveTab;
    title: string;
    icon: LucideIcon;
    description: string;
    color: string;
}

interface WorkspaceSidebarProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    tabs: Tab[];
}

export default function WorkspaceSidebar({ activeTab, onTabChange, tabs }: WorkspaceSidebarProps) {
    return (
        <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">功能模块</h2>
                    <div className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange(tab.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all duration-200 text-left group ${isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive
                                        ? 'text-white'
                                        : 'text-gray-500'
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold truncate">{tab.title}</div>
                                        <div className={`text-xs mt-0.5 truncate ${isActive ? 'text-blue-100' : 'text-gray-500'
                                            }`}>
                                            {tab.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
