'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

interface QualityReviewToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export default function QualityReviewToggle({
  enabled,
  onChange,
  disabled = false,
}: QualityReviewToggleProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <div>
          <Label className="text-sm font-medium text-gray-900 cursor-pointer">
            智能审核
          </Label>
          <p className="text-xs text-gray-500">
            AI 自动评估生成质量并给出优化建议
          </p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
