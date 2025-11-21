"use client";

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, History, Image as ImageIcon, Clock, CheckCircle, Trash2 } from 'lucide-react';
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
  onItemDelete?: (itemId: string) => void;
  className?: string;
  title?: string;
  subtitle?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function CollapsibleHistorySidebar({
  items,
  onItemClick,
  onItemDelete,
  className,
  title = "处理历史",
  subtitle = "点击图片查看详情",
  isOpen = false,
  onToggle
}: CollapsibleHistorySidebarProps) {
  const isCollapsed = !isOpen;
  const [validItems, setValidItems] = useState<HistoryItem[]>([]);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const filtered = items.filter(item => !brokenImages.has(item.id));
    setValidItems(filtered);
  }, [items, brokenImages]);

  const handleImageError = (itemId: string) => {
    setBrokenImages(prev => new Set(prev).add(itemId));
  };

  return (
    <div
      className={cn(
        "relative h-full bg-white border-l border-gray-200 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0 border-0" : "w-80",
        className
      )}
    >

      {/* 侧边栏内容 */}
      <div className="h-full overflow-hidden">
        {!isCollapsed && (
          /* 展开状态 - 显示完整内容 */
          <div className="flex h-full flex-col">
            {/* 历史列表 - 直接显示，无标题 */}
            <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              {validItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">暂无处理历史</p>
                  <p className="text-xs text-gray-400 mt-1">
                    上传图片开始处理
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validItems.map((item) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-2 transition-all hover:border-orange-300 hover:shadow-md"
                    >
                      {/* 图片预览 */}
                      <div 
                        className="relative aspect-video overflow-hidden rounded-md bg-gray-100 cursor-pointer"
                        onClick={() => onItemClick?.(item)}
                      >
                        {item.thumbnailUrl || item.processedUrl || item.originalUrl ? (
                          <img
                            src={item.thumbnailUrl || item.processedUrl || item.originalUrl}
                            alt={item.filename}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            onError={() => handleImageError(item.id)}
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="flex-1 truncate text-xs font-medium text-gray-900">
                            {item.filename}
                          </p>
                          {/* 删除按钮 */}
                          {onItemDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onItemDelete(item.id);
                              }}
                              className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="删除"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
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
                              WATERMARK
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

          </div>
        )}
      </div>
    </div>
  );
}
