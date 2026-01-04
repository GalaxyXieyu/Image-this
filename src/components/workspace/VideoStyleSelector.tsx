'use client';

import { cn } from '@/lib/utils';
import { VIDEO_STYLE_TEMPLATES } from '@/lib/video-style-templates';
import { RotateCw, Home, Zap, Leaf, Crown, Cpu, Square, Edit, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const ICONS: Record<string, React.ElementType> = {
  'product-showcase': RotateCw,
  'lifestyle-scene': Home,
  'dynamic-intro': Zap,
  'nature-blend': Leaf,
  'luxury-style': Crown,
  'tech-future': Cpu,
  'minimal-clean': Square,
  'custom': Edit,
};

const STYLE_CONFIG: Record<string, { gradient: string; iconBg: string; selectedBorder: string }> = {
  'product-showcase': {
    gradient: 'from-blue-500/20 to-blue-600/5',
    iconBg: 'bg-blue-500/20 text-blue-600',
    selectedBorder: 'ring-2 ring-blue-500 border-blue-500',
  },
  'lifestyle-scene': {
    gradient: 'from-green-500/20 to-green-600/5',
    iconBg: 'bg-green-500/20 text-green-600',
    selectedBorder: 'ring-2 ring-green-500 border-green-500',
  },
  'dynamic-intro': {
    gradient: 'from-purple-500/20 to-purple-600/5',
    iconBg: 'bg-purple-500/20 text-purple-600',
    selectedBorder: 'ring-2 ring-purple-500 border-purple-500',
  },
  'nature-blend': {
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    iconBg: 'bg-emerald-500/20 text-emerald-600',
    selectedBorder: 'ring-2 ring-emerald-500 border-emerald-500',
  },
  'luxury-style': {
    gradient: 'from-amber-500/20 to-amber-600/5',
    iconBg: 'bg-amber-500/20 text-amber-600',
    selectedBorder: 'ring-2 ring-amber-500 border-amber-500',
  },
  'tech-future': {
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    iconBg: 'bg-cyan-500/20 text-cyan-600',
    selectedBorder: 'ring-2 ring-cyan-500 border-cyan-500',
  },
  'minimal-clean': {
    gradient: 'from-gray-500/20 to-gray-600/5',
    iconBg: 'bg-gray-500/20 text-gray-600',
    selectedBorder: 'ring-2 ring-gray-500 border-gray-500',
  },
  'custom': {
    gradient: 'from-orange-500/20 to-orange-600/5',
    iconBg: 'bg-orange-500/20 text-orange-600',
    selectedBorder: 'ring-2 ring-orange-500 border-orange-500',
  },
};

interface VideoStyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

export function VideoStyleSelector({
  selectedStyle,
  onStyleChange,
  customPrompt,
  onCustomPromptChange,
}: VideoStyleSelectorProps) {
  const selectedTemplate = VIDEO_STYLE_TEMPLATES.find(t => t.id === selectedStyle);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {VIDEO_STYLE_TEMPLATES.map((template) => {
          const Icon = ICONS[template.id] || Square;
          const config = STYLE_CONFIG[template.id];
          const isSelected = selectedStyle === template.id;

          return (
            <button
              key={template.id}
              onClick={() => onStyleChange(template.id)}
              className={cn(
                'relative p-3 sm:p-4 rounded-xl border-2 border-transparent transition-all duration-200 text-left group',
                'bg-gradient-to-br hover:scale-[1.02] hover:shadow-md',
                config.gradient,
                isSelected && config.selectedBorder
              )}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                </div>
              )}
              <div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2 sm:mb-3', config.iconBg)}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="font-semibold text-xs sm:text-sm text-gray-800">{template.name}</div>
              <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-2">
                {template.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* 选中风格的提示词预览 */}
      {selectedStyle !== 'custom' && selectedTemplate && (
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="text-xs text-gray-500 mb-1">当前风格提示词：</div>
          <div className="text-sm text-gray-700">{selectedTemplate.prompt}</div>
        </div>
      )}

      {selectedStyle === 'custom' && (
        <Textarea
          placeholder="输入自定义视频提示词，描述你想要的视频效果..."
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          className="min-h-[100px]"
        />
      )}
    </div>
  );
}
