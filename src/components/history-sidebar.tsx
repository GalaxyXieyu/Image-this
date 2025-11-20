"use client";
import React, { useState, useMemo } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconPhoto,
  IconHistory,
  IconDownload,
  IconTrash,
  IconFolder,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface HistoryImage {
  id: string;
  filename: string;
  thumbnailUrl?: string;
  processedUrl?: string;
  originalUrl?: string;
  createdAt: string;
  status: string;
  processType?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}

interface HistorySidebarProps {
  images: HistoryImage[];
  selectedImage?: HistoryImage | null;
  onImageSelect: (image: HistoryImage) => void;
  onImageDownload?: (image: HistoryImage) => void;
  onImageDelete?: (imageId: string) => void;
  className?: string;
}

export default function HistorySidebar({
  images,
  selectedImage,
  onImageSelect,
  onImageDownload,
  onImageDelete,
  className,
}: HistorySidebarProps) {
  const [open, setOpen] = useState(false);

  // 按日期分组图片 - 使用 useMemo 避免无限循环
  const groupedImages = useMemo(() => {
    return images.reduce((groups, image) => {
      const date = new Date(image.createdAt).toLocaleDateString('zh-CN');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(image);
      return groups;
    }, {} as Record<string, HistoryImage[]>);
  }, [images]);

  const links = useMemo(() => [
    {
      label: "全部图片",
      href: "#all",
      icon: (
        <IconPhoto className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "最近处理",
      href: "#recent",
      icon: (
        <IconHistory className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "下载全部",
      href: "#download",
      icon: (
        <IconDownload className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
    {
      label: "清空历史",
      href: "#clear",
      icon: (
        <IconTrash className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
      ),
    },
  ], []);

  return (
    <div
      className={cn(
        "flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-gray-100 md:flex-row dark:border-neutral-700 dark:bg-neutral-800",
        "h-full",
        className
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
            
            {/* 图片列表 */}
            <div className="mt-6">
              <div className="mb-4">
                <h3 className={cn(
                  "text-sm font-medium text-neutral-700 dark:text-neutral-200",
                  !open && "hidden"
                )}>
                  历史图片
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(groupedImages).slice(0, open ? undefined : 3).map(([date, dateImages]) => (
                  <div key={date} className="space-y-2">
                    <div className={cn(
                      "text-xs font-medium text-neutral-500 dark:text-neutral-400",
                      !open && "hidden"
                    )}>
                      {date}
                    </div>
                    {dateImages.slice(0, open ? undefined : 2).map((image) => (
                      <div
                        key={image.id}
                        className={cn(
                          "group relative flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors",
                          selectedImage?.id === image.id && "bg-neutral-200 dark:bg-neutral-700"
                        )}
                        onClick={() => onImageSelect(image)}
                      >
                        <div className="relative w-8 h-8 overflow-hidden rounded">
                          <img
                            src={image.thumbnailUrl || image.processedUrl || image.originalUrl}
                            alt={image.filename}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Crect width='32' height='32' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='10' fill='%239ca3af'%3E图片%3C/text%3E%3C/svg%3E";
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm text-neutral-700 dark:text-neutral-200 truncate",
                            !open && "hidden"
                          )}>
                            {image.filename}
                          </p>
                          <p className={cn(
                            "text-xs text-neutral-500 dark:text-neutral-400",
                            !open && "hidden"
                          )}>
                            {new Date(image.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        
                        {/* 操作按钮 */}
                        {open && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onImageDownload && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onImageDownload(image);
                                }}
                                className="p-1 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                              >
                                <IconDownload className="h-3 w-3 text-neutral-600 dark:text-neutral-300" />
                              </button>
                            )}
                            {onImageDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onImageDelete(image.id);
                                }}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900"
                              >
                                <IconTrash className="h-3 w-3 text-red-600 dark:text-red-300" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* 底部用户信息 */}
          <div>
            <SidebarLink
              link={{
                label: "历史记录",
                href: "#history",
                icon: (
                  <IconFolder className="h-5 w-5 shrink-0 text-neutral-700 dark:text-neutral-200" />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* 主内容区域 */}
      <div className="flex flex-1">
        <div className="flex h-full w-full flex-1 flex-col rounded-tl-2xl border border-neutral-200 bg-white p-2 md:p-10 dark:border-neutral-700 dark:bg-neutral-900">
          {selectedImage ? (
            <div className="flex flex-col h-full">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {selectedImage.filename}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {new Date(selectedImage.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <img
                  src={selectedImage.processedUrl || selectedImage.originalUrl}
                  alt={selectedImage.filename}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onError={(e) => {
                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='16' fill='%239ca3af'%3E图片加载失败%3C/text%3E%3C/svg%3E";
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <IconPhoto className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-500 dark:text-neutral-400">
                  选择一张图片查看详情
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const Logo = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-black dark:text-white"
      >
        历史图片
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};
