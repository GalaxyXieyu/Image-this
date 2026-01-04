// 视频风格模板 - 共享配置
export interface VideoStyleTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
}

export const VIDEO_STYLE_TEMPLATES: VideoStyleTemplate[] = [
  {
    id: 'product-showcase',
    name: '产品展示',
    description: '360度旋转展示产品细节',
    prompt: '产品缓慢旋转展示，光线柔和，背景简洁，专业产品摄影风格',
  },
  {
    id: 'lifestyle-scene',
    name: '生活场景',
    description: '产品融入日常生活场景',
    prompt: '产品置于温馨的生活场景中，自然光线，有人物互动，生活化氛围',
  },
  {
    id: 'dynamic-intro',
    name: '动感开场',
    description: '炫酷的产品入场动画',
    prompt: '产品从画面外飞入，带有光效和粒子特效，动感十足，科技感强',
  },
  {
    id: 'nature-blend',
    name: '自然融合',
    description: '产品与自然元素结合',
    prompt: '产品置于自然环境中，有花草树木，阳光透过，清新自然风格',
  },
  {
    id: 'luxury-style',
    name: '奢华质感',
    description: '高端大气的展示风格',
    prompt: '产品置于大理石台面，金色光效，高端奢华氛围，质感细腻',
  },
  {
    id: 'tech-future',
    name: '科技未来',
    description: '充满科技感的展示',
    prompt: '产品悬浮在空中，周围有全息投影和数据流，未来科技风格',
  },
  {
    id: 'minimal-clean',
    name: '极简纯净',
    description: '简约干净的展示风格',
    prompt: '纯白背景，产品居中，极简风格，干净利落，突出产品本身',
  },
  {
    id: 'custom',
    name: '自定义',
    description: '输入自定义提示词',
    prompt: '',
  },
];
