'use client';

import { useState } from 'react';
import { X, Copy, Check, Save, AlertCircle, CheckCircle, Lightbulb, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { QualityReviewResult } from '@/types/quality-review';
import { getScoreColorClass, getScoreProgressColor } from '@/types/quality-review';

interface QualityReviewResultProps {
  isOpen: boolean;
  onClose: () => void;
  result: QualityReviewResult;
  productImage: string;
  referenceImage: string;
  resultImage: string;
  prompt: string;
  onSaveAsTemplate: () => void;
  onApplySuggestion?: (suggestion: string) => void;
  onRetryWithSuggestions?: (newPrompt: string) => void;
}

export default function QualityReviewResultModal({
  isOpen,
  onClose,
  result,
  productImage,
  referenceImage,
  resultImage,
  prompt,
  onSaveAsTemplate,
  onApplySuggestion,
  onRetryWithSuggestions,
}: QualityReviewResultProps) {
  const { toast } = useToast();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const isLowScore = result.overallScore < 7;
  const isVeryLowScore = result.overallScore < 5;

  const handleCopySuggestion = async (suggestion: string, index: number) => {
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopiedIndex(index);
      toast({ title: '已复制到剪贴板' });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast({ title: '复制失败', variant: 'destructive' });
    }
  };

  // 生成优化后的提示词
  const generateOptimizedPrompt = () => {
    const suggestions = result.promptSuggestions || [];
    if (suggestions.length === 0) return prompt;
    return prompt + '\n' + suggestions.join('\n');
  };

  const handleQuickRetry = () => {
    const optimizedPrompt = generateOptimizedPrompt();
    onRetryWithSuggestions?.(optimizedPrompt);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 根据分数显示不同状态 */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isVeryLowScore ? 'bg-red-50 border-red-200' :
          isLowScore ? 'bg-yellow-50 border-yellow-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            {isVeryLowScore ? (
              <AlertTriangle className="w-6 h-6 text-red-500" />
            ) : isLowScore ? (
              <AlertCircle className="w-6 h-6 text-yellow-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
            <div>
              <h2 className="text-lg font-semibold">
                {isVeryLowScore ? '审核不通过 - 建议重新生成' :
                 isLowScore ? '审核警告 - 质量有待提升' :
                 '审核通过'}
              </h2>
              <p className="text-sm text-gray-600">
                总体评分: <span className={`font-bold ${
                  isVeryLowScore ? 'text-red-600' :
                  isLowScore ? 'text-yellow-600' :
                  'text-green-600'
                }`}>{result.overallScore}/10</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 低分警告横幅 */}
        {isLowScore && (
          <div className={`px-4 py-3 ${isVeryLowScore ? 'bg-red-100' : 'bg-yellow-100'} border-b ${isVeryLowScore ? 'border-red-200' : 'border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${isVeryLowScore ? 'text-red-600' : 'text-yellow-600'}`} />
                <span className={`font-medium ${isVeryLowScore ? 'text-red-800' : 'text-yellow-800'}`}>
                  {isVeryLowScore
                    ? '生成质量较差，强烈建议使用优化后的提示词重新生成'
                    : '生成质量一般，建议参考优化建议改进'}
                </span>
              </div>
              {onRetryWithSuggestions && result.promptSuggestions.length > 0 && (
                <Button
                  onClick={handleQuickRetry}
                  size="sm"
                  className={isVeryLowScore ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  一键优化重试
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 三图对比 */}
          <ImageCompareSection
            productImage={productImage}
            referenceImage={referenceImage}
            resultImage={resultImage}
          />

          {/* 评分区域 */}
          <ScoreSection result={result} />

          {/* 问题和优点 */}
          <IssuesAndStrengthsSection result={result} />

          {/* 提示词优化建议 */}
          <SuggestionsSection
            suggestions={result.promptSuggestions}
            copiedIndex={copiedIndex}
            onCopy={handleCopySuggestion}
            onApply={onApplySuggestion}
          />

          {/* 当前提示词 */}
          <CurrentPromptSection prompt={prompt} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <div>
            {onRetryWithSuggestions && result.promptSuggestions.length > 0 && (
              <Button onClick={handleQuickRetry} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                使用优化提示词重试
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            {result.recommendSaveAsTemplate && (
              <Button onClick={onSaveAsTemplate} className="gap-2">
                <Save className="w-4 h-4" />
                保存为模板
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 三图对比区域
function ImageCompareSection({
  productImage,
  referenceImage,
  resultImage,
}: {
  productImage: string;
  referenceImage: string;
  resultImage: string;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">图片对比</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500 text-center">产品原图</p>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={productImage}
              alt="产品原图"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500 text-center">背景参考</p>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={referenceImage}
              alt="背景参考"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500 text-center">生成结果</p>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-purple-300">
            <img
              src={resultImage}
              alt="生成结果"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// 评分区域
function ScoreSection({ result }: { result: QualityReviewResult }) {
  const scores = [
    { label: '总体评分', value: result.overallScore, key: 'overall' },
    { label: '产品细节', value: result.productDetailScore, key: 'detail' },
    { label: '纹理一致', value: result.textureConsistencyScore, key: 'texture' },
    { label: '背景融合', value: result.backgroundBlendScore, key: 'background' },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">质量评分</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {scores.map((score) => (
          <div
            key={score.key}
            className={`p-3 rounded-lg border ${getScoreColorClass(score.value)}`}
          >
            <p className="text-xs opacity-80">{score.label}</p>
            <p className="text-2xl font-bold">{score.value}</p>
            <div className="mt-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreProgressColor(score.value)} transition-all`}
                style={{ width: `${score.value * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 问题和优点区域
function IssuesAndStrengthsSection({ result }: { result: QualityReviewResult }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 问题 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          发现的问题
        </h3>
        {result.issues.length > 0 ? (
          <ul className="space-y-1">
            {result.issues.map((issue, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                {issue}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">未发现明显问题</p>
        )}
      </div>

      {/* 优点 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          优点
        </h3>
        {result.strengths.length > 0 ? (
          <ul className="space-y-1">
            {result.strengths.map((strength, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                {strength}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">暂无</p>
        )}
      </div>
    </div>
  );
}

// 提示词优化建议区域
function SuggestionsSection({
  suggestions,
  copiedIndex,
  onCopy,
  onApply,
}: {
  suggestions: string[];
  copiedIndex: number | null;
  onCopy: (suggestion: string, index: number) => void;
  onApply?: (suggestion: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1">
        <Lightbulb className="w-4 h-4 text-yellow-500" />
        提示词优化建议
      </h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
          >
            <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => onCopy(suggestion, index)}
                className="p-1.5 hover:bg-yellow-100 rounded transition-colors"
                title="复制"
              >
                {copiedIndex === index ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {onApply && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onApply(suggestion)}
                  className="text-xs h-7"
                >
                  应用
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 当前提示词区域
function CurrentPromptSection({ prompt }: { prompt: string }) {
  if (!prompt) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">当前使用的提示词</h3>
      <div className="p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
        {prompt}
      </div>
    </div>
  );
}
