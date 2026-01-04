'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BatchWarningDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDontShowAgain: (dontShow: boolean) => void;
  imageCount: number;
}

export default function BatchWarningDialog({
  isOpen,
  onConfirm,
  onCancel,
  onDontShowAgain,
  imageCount,
}: BatchWarningDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain) {
      onDontShowAgain(true);
    }
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            批量处理提示
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-2">
            <p>
              您即将批量处理 <strong>{imageCount}</strong> 张图片。
            </p>
            <p className="text-yellow-600">
              如果不确定效果，建议先在「背景替换」中测试单张图片，
              开启「智能审核」功能可以帮助您优化提示词。
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-2">
          <Checkbox
            id="dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <label
            htmlFor="dont-show-again"
            className="text-sm text-gray-600 cursor-pointer"
          >
            不再提醒
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={handleConfirm}>
            继续处理
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
