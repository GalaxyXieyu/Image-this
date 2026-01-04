// 图片质量审核相关类型定义

/**
 * 审核结果数据结构
 */
export interface QualityReviewResult {
  /** 总体评分 1-10 */
  overallScore: number;
  /** 产品细节保持评分 1-10 */
  productDetailScore: number;
  /** 纹理一致性评分 1-10 */
  textureConsistencyScore: number;
  /** 背景融合度评分 1-10 */
  backgroundBlendScore: number;
  /** 问题列表 */
  issues: string[];
  /** 优点列表 */
  strengths: string[];
  /** 提示词优化建议 */
  promptSuggestions: string[];
  /** 是否推荐保存为模板 */
  recommendSaveAsTemplate: boolean;
  /** 审核时间 */
  reviewedAt: string;
  /** 审核使用的模型 */
  reviewModel: string;
}

/**
 * 审核请求参数
 */
export interface QualityReviewRequest {
  /** 产品原图 base64 */
  productImageBase64: string;
  /** 参考图 base64 */
  referenceImageBase64: string;
  /** 生成结果图 base64 */
  resultImageBase64: string;
  /** 使用的提示词 */
  prompt: string;
  /** 关联的 ProcessedImage ID（可选） */
  processedImageId?: string;
}

/**
 * 审核响应
 */
export interface QualityReviewResponse {
  success: boolean;
  data?: QualityReviewResult;
  error?: string;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 批量处理提示是否不再显示 */
  hideBatchWarning: boolean;
  /** 智能审核默认开启状态 */
  defaultReviewEnabled: boolean;
}

/**
 * 评分等级
 */
export type ScoreLevel = 'high' | 'medium' | 'low';

/**
 * 根据评分获取等级
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

/**
 * 根据评分获取颜色类名
 */
export function getScoreColorClass(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-100 border-green-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'low':
      return 'text-red-600 bg-red-100 border-red-200';
  }
}

/**
 * 根据评分获取进度条颜色
 */
export function getScoreProgressColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'high':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-red-500';
  }
}
