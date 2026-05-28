'use client';

import { Download, Info, RefreshCw, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useDesktopUpdates } from '@/components/providers/DesktopUpdateProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const STATUS_LABELS: Record<string, string> = {
  idle: '待机',
  checking: '检查更新中',
  available: '发现更新',
  downloading: '正在下载',
  downloaded: '可重启安装',
  'not-available': '已是最新版本',
  disabled: '未配置更新服务',
  unsupported: '当前渠道不支持',
  error: '更新失败',
};

function getStatusHint(status: string, message: string) {
  if (status === 'disabled') {
    return message || '还没有配置 DESKTOP_UPDATE_FEED_URL，所以当前无法连接更新服务。';
  }

  if (status === 'unsupported') {
    return message || '只有 Windows 安装版支持自动更新，Portable 和开发模式不支持。';
  }

  return message || '等待更新状态。';
}

export function DesktopUpdateCard() {
  const { toast } = useToast();
  const { isDesktop, state, checkForUpdates, restartToUpdate, installOnQuit } = useDesktopUpdates();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [schedulingInstall, setSchedulingInstall] = useState(false);

  if (!isDesktop || !state) {
    return null;
  }

  const statusLabel = STATUS_LABELS[state.status] || state.status;
  const progressValue = Math.max(0, Math.min(100, Math.round(state.progress || 0)));
  const statusHint = getStatusHint(state.status, state.message);
  const canCheck = state.status !== 'checking' && state.status !== 'unsupported';
  const canRestart = state.status === 'downloaded';
  const canInstallOnQuit = state.status === 'downloaded' && state.installMode !== 'on-quit';

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
        return;
      }

      if (nextState.status === 'disabled') {
        toast({
          title: '还没配置更新服务',
          description: getStatusHint(nextState.status, nextState.message),
        });
        return;
      }

      if (nextState.status === 'unsupported') {
        toast({
          title: '当前渠道不支持自动更新',
          description: getStatusHint(nextState.status, nextState.message),
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

  const handleInstallOnQuit = async () => {
    setSchedulingInstall(true);
    try {
      await installOnQuit();
      toast({
        title: '已安排退出时安装',
        description: '关闭应用后会自动安装更新，下次启动就是新版本。',
      });
    } finally {
      setSchedulingInstall(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <RotateCw className="h-5 w-5 text-blue-600" />
            应用更新
          </CardTitle>
          <CardDescription>
            桌面安装版会在启动后自动检查更新。发现新版本后会后台下载，等你确认后再重启安装。
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
            <div className="flex items-start justify-between gap-4 text-sm text-slate-600">
              <span>{statusHint}</span>
              <span className="shrink-0">{progressValue}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </div>

          {state.status === 'disabled' ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-medium">
                <Info className="h-4 w-4" />
                还没有配置更新地址
              </div>
              <div className="mt-2">
                请在打包用的 `.env.production` 里配置 `DESKTOP_UPDATE_FEED_URL`，并确保该地址能访问
                `latest.yml` 和安装包。
              </div>
            </div>
          ) : null}

          {state.installMode === 'on-quit' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              更新已安排在退出应用时安装。关闭 ImagineThis 后会自动完成安装，下次启动即为新版本。
            </div>
          ) : null}

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

            <Button
              type="button"
              variant="outline"
              onClick={handleInstallOnQuit}
              disabled={!canInstallOnQuit || schedulingInstall}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {schedulingInstall ? '正在安排...' : '退出时安装'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
