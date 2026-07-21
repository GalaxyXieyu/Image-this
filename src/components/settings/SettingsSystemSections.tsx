"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Image, SlidersHorizontal, HardDrive, FolderOpen, Folder, User, LogOut } from "lucide-react";

const DesktopUpdateCard = dynamic(
  () => import("@/components/settings/DesktopUpdateCard").then((m) => m.DesktopUpdateCard),
  { loading: () => <div className="h-44 animate-pulse rounded-[18px] bg-surface-muted" /> }
);
const LogDiagnosticsCard = dynamic(
  () => import("@/components/settings/LogDiagnosticsCard").then((m) => m.LogDiagnosticsCard),
  { loading: () => <div className="h-64 animate-pulse rounded-[18px] bg-surface-muted" /> }
);

export function renderSettingsSystemSection(activeSection: string, ctx: any): React.ReactNode {
  const {
    apiSettings, setApiSettings, handleInputChange, renderInlineSaveButton,
    isDesktop, handleSelectFolder, session, isSaving,
  } = ctx;
  switch (activeSection) {
      case 'imagehosting':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="flex items-center text-[18px] sm:text-body">
                  <Image className="w-5 h-5 mr-2 text-primary" />
                  图床服务
                </CardTitle>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-data text-muted-foreground mb-4">
                  支持：Superbed 图床服务，用于存储和访问生成的图片
                </div>
                <div>
                  <Label htmlFor="superbedToken">Superbed Token</Label>
                  <Input
                    id="superbedToken"
                    type="password"
                    placeholder="输入 Superbed API Token"
                    value={apiSettings.superbedToken}
                    onChange={(e) => handleInputChange('superbedToken', e.target.value)}
                  />
                  <div className="text-caption text-muted-foreground mt-1">
                    访问 <a href="https://superbed.cn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">superbed.cn</a> 获取 API Token
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 本地存储配置：仅桌面版可见。该路径指向运行服务的本机磁盘，Web 版配置无效且会误导用户 */}
            {isDesktop && (
              <Card>
                <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                  <CardTitle className="flex items-center text-[18px] sm:text-body">
                    <div className="flex items-center">
                      <HardDrive className="w-5 h-5 mr-2 text-primary" />
                      本地存储配置
                    </div>
                  </CardTitle>
                  {renderInlineSaveButton()}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-data text-muted-foreground mb-4">
                    配置图片本地保存路径，默认为应用目录下的 public/uploads/
                  </div>
                  <div>
                    <Label htmlFor="localStoragePath">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-4 h-4" />
                        保存路径
                      </div>
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="localStoragePath"
                        type="text"
                        placeholder="例如：/Users/yourname/Pictures/ai-images 或 ~/Pictures/ai-images"
                        value={apiSettings.localStoragePath}
                        onChange={(e) => handleInputChange('localStoragePath', e.target.value)}
                        className="min-h-11 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSelectFolder}
                        className="min-h-11 gap-2 whitespace-nowrap"
                      >
                        <Folder className="w-4 h-4" />
                        浏览
                      </Button>
                    </div>
                    <div className="text-caption text-muted-foreground mt-2 space-y-1">
                      <div>• 留空使用默认路径：public/uploads/</div>
                      <div>• 支持绝对路径：/Users/yourname/Pictures/ai-images</div>
                      <div>• 支持相对路径：./my-images（相对于项目根目录）</div>
                      <div>• 支持 ~ 符号：~/Pictures/ai-images（用户主目录）</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );


      case 'runtime':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center text-[18px] sm:text-body">
                    <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
                    后台任务并发
                  </CardTitle>
                  <CardDescription className="mt-1 hidden sm:block">
                    控制同时调用大模型、视频和图床服务的任务数量
                  </CardDescription>
                </div>
                {renderInlineSaveButton()}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="taskConcurrency">最大并发任务数</Label>
                  <Input
                    id="taskConcurrency"
                    type="number"
                    min={1}
                    max={10}
                    value={apiSettings.taskConcurrency}
                    onChange={(e) => {
                      const value = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      handleInputChange('taskConcurrency', value);
                    }}
                    className="min-h-11 w-full sm:max-w-xs"
                  />
                  <div className="hidden text-caption text-muted-foreground mt-2 space-y-1 sm:block">
                    <div>建议保持 1-2，避免触发大模型或图床限流。</div>
                    <div>修改后新触发的后台队列会按该值领取任务。</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'logs':
        return <LogDiagnosticsCard />;

      case 'profile':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[18px] sm:text-body">
                  <User className="w-5 h-5 mr-2 text-muted-foreground" />
                  用户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>邮箱</Label>
                  <div className="break-all rounded border bg-muted px-3 py-2.5 text-muted-foreground">
                    {session.user?.email}
                  </div>
                </div>
                <div>
                  <Label>用户ID</Label>
                  <div className="break-all rounded border bg-muted px-3 py-2.5 font-mono text-data text-muted-foreground">
                    {session.user?.id}
                  </div>
                </div>
                <div className="border-t border-line pt-4">
                  <Button
                    variant="outline"
                    className="min-h-11 w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
                    onClick={() => signOut({ callbackUrl: '/auth/login' })}
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </Button>
                </div>
              </CardContent>
            </Card>

          </div>
        );

      case 'updates':
        return <DesktopUpdateCard />;


    default:
      return null;
  }
}
