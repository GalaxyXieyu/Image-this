'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, X } from 'lucide-react';

interface VideoResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  originalImage?: string;
  prompt?: string;
  onDownload?: () => void;
  onRegenerate?: () => void;
}

export function VideoResultModal({
  isOpen,
  onClose,
  videoUrl,
  originalImage,
  prompt,
  onDownload,
  onRegenerate,
}: VideoResultModalProps) {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `video-${Date.now()}.mp4`;
      a.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>视频生成结果</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {originalImage && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">原始图片</div>
              <img
                src={originalImage}
                alt="Original"
                className="w-full rounded-lg object-contain max-h-[300px] bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">生成视频</div>
            {videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full rounded-lg max-h-[300px] bg-black"
              />
            ) : (
              <div className="w-full h-[300px] rounded-lg bg-black flex items-center justify-center text-muted-foreground">
                视频加载中...
              </div>
            )}
          </div>
        </div>

        {prompt && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-xs font-medium text-muted-foreground mb-1">提示词</div>
            <div className="text-sm">{prompt}</div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          {onRegenerate && (
            <Button variant="outline" onClick={onRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重新生成
            </Button>
          )}
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            下载视频
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
