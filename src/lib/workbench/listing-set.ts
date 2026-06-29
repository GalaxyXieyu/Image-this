/**
 * AI 商品套图：从一张商品图一次性生成整套电商图。
 *
 * 移植自 ec-visual 的「按 image-type 分别构建提示词」思路：
 * 主图(白底/合规) / 场景展示 / 模特场景 / 细节说明 / 卖点详解，
 * 每类用各自的版式规则 + 复用品类感知画像（detectSceneCategoryProfile）。
 */

import { detectSceneCategoryProfile } from '@/lib/workbench/scene-prompt';

export type ListingImageType = 'main' | 'scene' | 'model' | 'detail' | 'sellingpoint';

export interface ListingTypeMeta {
  type: ListingImageType;
  /** 序号标签，如 01 */
  index: string;
  label: string;
  /** 该类型的版式/规则提示 */
  rule: string;
}

export interface ListingProductInfo {
  name?: string;
  category?: string;
  description?: string;
  sellingPoints?: string;
}

export const LISTING_TYPES: ListingTypeMeta[] = [
  {
    type: 'main',
    index: '01',
    label: '主图（白底/合规）',
    rule:
      '电商主图：纯白色背景（#FFFFFF），商品居中、正面标准展示，无多余文字与装饰，商品占画面约 80%-85%，符合主流电商平台主图规范，专业棚拍布光，边缘干净。',
  },
  {
    type: 'scene',
    index: '02',
    label: '场景展示',
    rule:
      '场景展示图：把商品自然放置在贴合其调性的真实场景中，强调氛围、构图与光线，可少量留白用于文案，画面高级、有质感。',
  },
  {
    type: 'model',
    index: '03',
    label: '模特场景',
    rule:
      '模特场景图：真实模特在生活化场景中自然使用 / 佩戴 / 搭配该商品，模特与商品比例真实、互动自然，杂志感构图与光线，突出使用体验。',
  },
  {
    type: 'detail',
    index: '04',
    label: '细节说明',
    rule:
      '细节说明图：商品多个细节特写的精致拼图版式，突出材质、工艺、关键部件与做工，背景干净，可加少量简短英文标注，体现品质感。',
  },
  {
    type: 'sellingpoint',
    index: '05',
    label: '卖点详解',
    rule:
      '卖点详解图：围绕商品核心卖点的可视化展示，科技感 / 高级感构图，可配卖点示意元素与简短文案，信息层级清晰、有说服力。',
  },
];

export function getListingTypeMeta(type: ListingImageType): ListingTypeMeta {
  return LISTING_TYPES.find((t) => t.type === type) ?? LISTING_TYPES[0];
}

/**
 * 为某一类套图构建最终提示词。
 */
export function buildListingPrompt(type: ListingImageType, product: ListingProductInfo): string {
  const meta = getListingTypeMeta(type);
  const profile = detectSceneCategoryProfile(product.category, product.name, product.description);

  const brief = [
    product.name ? `商品：${product.name}` : undefined,
    product.category ? `品类：${product.category}` : undefined,
    product.description ? `描述：${product.description}` : undefined,
    product.sellingPoints ? `核心卖点：${product.sellingPoints}` : undefined,
  ]
    .filter(Boolean)
    .join('，');

  return [
    '基于上传的商品图生成一张电商用图。先分析该商品的结构、比例、轮廓、主次颜色、材质质感、包装与品牌标识；生成时必须严格保持商品主体的外观、比例、材质、品牌特征和数量稳定，不得改变或替换商品本身。',
    `本张图片类型：${meta.label}。版式规则：${meta.rule}`,
    type === 'main'
      ? '严格使用纯白背景，不要加入场景、道具或文字。'
      : `场景风格参考（${profile.label}）：${profile.guidance}`,
    brief ? `商品信息：${brief}。文字信息仅作辅助，不得覆盖商品图本身呈现的事实。` : undefined,
    '专业摄影、真实光影、高质量、干净可商用，避免明显伪影与杂乱元素。',
  ]
    .filter(Boolean)
    .join('\n');
}

/** 默认输出比例（主图用方图，其余可用更适合的比例） */
export function getListingAspectRatio(type: ListingImageType): string {
  switch (type) {
    case 'main':
      return '1:1';
    case 'detail':
      return '1:1';
    case 'scene':
    case 'sellingpoint':
      return '4:3';
    case 'model':
      return '3:4';
    default:
      return '1:1';
  }
}
