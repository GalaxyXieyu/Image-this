'use client';

import { useState } from 'react';
import { RefreshCw, Download, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useDesktopUpdates } from '@/components/providers/DesktopUpdateProvider';

const STATUS_LABELS: Record<string, string> = {
  idle: '待机',
  checking: '检查更新中',
  available: '发现更新',
  downloading: '正在下载',
  downloaded: '可重启安装',
  'not-available': '已是最新版本',
  disabled: '未启用',
  unsupported: '当前渠道不支持',
  error: '更新失败',
};

export function DesktopUpdateCard() {
  const { toast } = useToast();
  const { isDesktop, state, checkForUpdates, restartToUpdate } = useDesktopUpdates();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isDesktop || !state) {
    return null;
  }

  const statusLabel = STATUS_LABELS[state.status] || state.status;
  const progressValue = Math.max(0, Math.min(100, Math.round(state.progress || 0)));
  const canCheck = state.supported && state.status !== 'checking';
  const canRestart = state.status === 'downloaded';

  const handleCheck = async () => {
    setChecking(true);
    try {
      const nextState = await checkForUpdates();
      if (!nextState) {
        return;
      }

      if (nextState.status === 'not-available') {
        toast({
          title: '已经是最新版本',
          description: `当前版本 ${nextState.currentVersion} 无需更新。`,
        });
      } else if (nextState.status === 'disabled' || nextState.status === 'unsupported') {
        toast({
          title: '当前构建不支持自动更新',
          description: nextState.message,
        });
      }
    } catch (error) {
      toast({
        title: '检查更新失败',
        description: error instanceof Error ? error.message : '无法连接更新服务。',
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const handleRestart = async () => {
    setInstalling(true);
    try {
      await restartToUpdate();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <RotateCw className="h-5 w-5 text-blue-600" />
          桌面端更新
        </CardTitle>
        <CardDescription>
          启动时会自动检查并下载更新，下载完成后由你决定何时重启安装。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">当前版本</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{state.currentVersion}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">更新状态</div>
            <div className="mt-1 text-base font-semibold text-slate-900">{statusLabel}</div>
          </div>
        </div>

        {state.targetVersion ? (
          <div className="text-sm text-slate-600">
            目标版本：<span className="font-medium text-slate-900">{state.targetVersion}</span>
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{state.message || '等待更新状态。'}</span>
            <span>{progressValue}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCheck}
            disabled={!canCheck || checking}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            检查更新
          </Button>

          <Button
            type="button"
            onClick={handleRestart}
            disabled={!canRestart || installing}
            className="gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <Download className="h-4 w-4" />
            {installing ? '准备重启...' : '立即重启更新'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
