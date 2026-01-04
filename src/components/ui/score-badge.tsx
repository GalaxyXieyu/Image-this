'use client';

import { getScoreColorClass } from '@/types/quality-review';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function ScoreBadge({
  score,
  size = 'sm',
  showLabel = false
}: ScoreBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium border
        ${getScoreColorClass(score)}
        ${sizeClasses[size]}
      `}
      title={`质量评分: ${score}/10`}
    >
      {showLabel && <span>评分:</span>}
      <span>{score}</span>
    </span>
  );
}
