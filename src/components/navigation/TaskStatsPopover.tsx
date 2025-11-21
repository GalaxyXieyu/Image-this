'use client';

import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, Loader, CheckCircle, XCircle } from 'lucide-react';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export default function TaskStatsPopover() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/tasks/worker', {
          signal: AbortSignal.timeout(3000) // 3秒超时
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.status) {
            setStats(data.status);
          }
        }
      } catch (err) {
        // 静默失败，不打印错误（避免日志刷屏）
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('获取任务统计失败:', err);
        }
      }
    };

    // 只在打开弹窗时才轮询
    if (isOpen) {
      fetchStats();
      const interval = setInterval(fetchStats, 10000); // 10秒轮询一次
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const hasActiveTasks = stats.pending > 0 || stats.processing > 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative"
        >
          <ListTodo className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">任务</span>
          {hasActiveTasks && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 items-center justify-center text-[10px] text-white font-bold">
                {stats.pending + stats.processing}
              </span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">任务统计</h3>
            <Badge variant="outline" className="text-xs">
              总计 {stats.total}
            </Badge>
          </div>
          
          <div className="space-y-3">
            {/* 等待中 */}
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">等待中</p>
                  <p className="text-xs text-gray-600">待处理任务</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
            </div>

            {/* 处理中 */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">处理中</p>
                  <p className="text-xs text-gray-600">正在执行</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{stats.processing}</span>
            </div>

            {/* 已完成 */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">已完成</p>
                  <p className="text-xs text-gray-600">成功处理</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
            </div>

            {/* 失败 */}
            {stats.failed > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">失败</p>
                    <p className="text-xs text-gray-600">处理失败</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">{stats.failed}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t">
            <Button 
              className="w-full bg-orange-500 hover:bg-orange-600" 
              size="sm"
              onClick={() => {
                window.location.href = '/history';
                setIsOpen(false);
              }}
            >
              查看全部任务
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
