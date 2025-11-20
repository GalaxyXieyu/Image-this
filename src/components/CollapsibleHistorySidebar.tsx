"use client";

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, History, Image as ImageIcon, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  filename: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  originalUrl?: string;
  createdAt: string;
  status: string;
  processType?: string;
}

interface CollapsibleHistorySidebarProps {
  items: HistoryItem[];
  onItemClick?: (item: HistoryItem) => void;
  className?: string;
}

export default function CollapsibleHistorySidebar({
  items,
  onItemClick,
  className
}: CollapsibleHistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={cn(
        "relative h-full bg-white border-l border-gray-200 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-12" : "w-80",
        className
      )}
    >
      {/* 折叠按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleCollapse}
        className="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full border border-gray-200 bg-white p-0 shadow-sm hover:bg-gray-50"
      >
        {isCollapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* 侧边栏内容 */}
      <div className="h-full overflow-hidden">
        {isCollapsed ? (
          /* 折叠状态 - 只显示图标 */
          <div className="flex flex-col items-center gap-4 p-2 pt-16">
            <div className="flex flex-col items-center gap-2">
              <History className="h-5 w-5 text-gray-400" />
              <div className="h-px w-6 bg-gray-200" />
              <span className="text-xs text-gray-400 writing-mode-vertical">
                {items.length}
              </span>
            </div>
          </div>
        ) : (
          /* 展开状态 - 显示完整内容 */
          <div className="flex h-full flex-col">
            {/* 标题 */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-orange-50 to-white p-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-gray-900">处理历史</h3>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                点击图片查看详情
              </p>
            </div>

            {/* 历史列表 */}
            <div className="flex-1 overflow-y-auto p-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">暂无处理历史</p>
                  <p className="text-xs text-gray-400 mt-1">
                    上传图片开始处理
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-orange-300 hover:shadow-md"
                    >
                      {/* 图片预览 */}
                      <div className="relative aspect-video overflow-hidden rounded-md bg-gray-100">
                        {item.thumbnailUrl || item.processedUrl || item.originalUrl ? (
                          <img
                            src={item.thumbnailUrl || item.processedUrl || item.originalUrl}
                            alt={item.filename}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150'%3E%3Crect width='200' height='150' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='14' fill='%239ca3af'%3E图片%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                        
                        {/* 状态标识 */}
                        {item.status === 'COMPLETED' && (
                          <div className="absolute right-1 top-1 rounded-full bg-green-500 p-1">
                            <CheckCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* 文件信息 */}
                      <div className="mt-2">
                        <p className="truncate text-xs font-medium text-gray-900">
                          {item.filename}
                        </p>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {item.processType && (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-700">
                              {item.processType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 悬停效果 */}
                      <div className="absolute inset-0 border-2 border-transparent transition-colors group-hover:border-orange-400 rounded-lg pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部统计 */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>共 {items.length} 张图片</span>
                  <span className="text-orange-600">
                    {items.filter(i => i.status === 'COMPLETED').length} 已完成
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
