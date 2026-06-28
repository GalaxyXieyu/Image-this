/**
 * 场景生成提示词构建（品类感知）
 *
 * 移植并精简自 ec-visual 的 fallbackWorkflowPrompts 思路：
 * 先按商品品类识别出对应的视觉风格画像（光线 / 背景 / 材质 / 点缀 / 氛围），
 * 再结合「先分析上传商品、严格保持主体不变」的指令组装最终 prompt。
 * 不再使用电商平台（淘宝/拼多多/Amazon 等）这一冗余参数。
 */

export interface SceneCategoryProfile {
  /** 画像 key，便于调试与扩展 */
  key: string;
  /** 中文可读名 */
  label: string;
  /** 该品类的场景风格指引，直接拼进 prompt */
  guidance: string;
}

interface CategoryRule {
  profile: SceneCategoryProfile;
  /** 命中任一关键词即归入该品类（中英大小写不敏感） */
  keywords: string[];
}

const GENERIC_PROFILE: SceneCategoryProfile = {
  key: 'generic',
  label: '通用',
  guidance:
    '干净协调的电商场景，专业布光，背景调性与产品气质一致，浅景深突出主体，整体高级简约。',
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    profile: {
      key: 'food',
      label: '食品饮品',
      guidance:
        '新鲜诱人、有食欲感的画面，自然光或暖色调灯光，木质 / 石材 / 亚麻等天然材质台面，搭配相关食材、餐具或饮品点缀，浅景深突出主体，质感真实。',
    },
    keywords: ['食品', '饮品', '零食', '生鲜', '茶', '咖啡', '酒', '果汁', '牛奶', '糖', '巧克力', 'food', 'drink', 'beverage', 'snack', 'coffee', 'tea'],
  },
  {
    profile: {
      key: 'beauty',
      label: '美妆个护',
      guidance:
        '高级简约的质感氛围，柔和均匀的棚拍光，干净的莫兰迪色或大理石背景，水珠 / 花瓣 / 丝绸等精致点缀，强调肤感、通透与品质感。',
    },
    keywords: ['美妆', '护肤', '化妆', '面膜', '精华', '口红', '香水', '洗护', '个护', '彩妆', '乳液', '面霜', 'beauty', 'skincare', 'cosmetic', 'makeup', 'perfume', 'serum'],
  },
  {
    profile: {
      key: 'electronics',
      label: '3C 数码',
      guidance:
        '科技简约的现代感，冷调或中性光，几何线条 / 渐变背景，金属 / 玻璃 / 磨砂材质氛围，干净利落，突出产品工艺与细节，弱化多余道具。',
    },
    keywords: ['3c', '数码', '电子', '家电', '耳机', '手机', '充电', '相机', '电脑', '键盘', '音箱', '手表', 'electronic', 'digital', 'gadget', 'phone', 'earphone', 'camera', 'laptop'],
  },
  {
    profile: {
      key: 'fashion',
      label: '服饰箱包',
      guidance:
        '时尚杂志风格，自然光或影棚光，质感背景墙或生活场景，强调材质纹理、版型与廓形，可搭配模特或精致平铺陈列。',
    },
    keywords: ['服饰', '服装', '衣', '鞋', '包', '配饰', '首饰', '箱', '帽', '围巾', '裙', '裤', 'fashion', 'apparel', 'clothing', 'shoe', 'bag', 'jewelry', 'accessory'],
  },
  {
    profile: {
      key: 'home',
      label: '家居日用',
      guidance:
        '温馨真实的居家生活场景，自然窗光，融入真实使用环境（客厅 / 厨房 / 卧室 / 书桌），强调使用场景与空间协调，画面整洁有生活气息。',
    },
    keywords: ['家居', '家具', '日用', '厨房', '收纳', '家纺', '杯', '锅', '清洁', '灯', '床', '沙发', '桌', 'home', 'furniture', 'kitchen', 'household', 'decor', 'storage'],
  },
  {
    profile: {
      key: 'baby_pet',
      label: '母婴宠物',
      guidance:
        '柔和温暖、安全亲和的氛围，明亮柔光，温柔治愈的色调，干净简洁的背景，传递安心、呵护与健康的感受。',
    },
    keywords: ['母婴', '宝宝', '婴', '儿童', '玩具', '宠物', '猫', '狗', '保健', '健康', '孕', '奶粉', 'baby', 'kid', 'toy', 'pet', 'health', 'wellness'],
  },
];

/**
 * 根据品类 / 产品类型 / 商品名关键词，识别场景风格画像。
 */
export function detectSceneCategoryProfile(...hints: Array<string | undefined>): SceneCategoryProfile {
  const haystack = hints.filter(Boolean).join(' ').toLowerCase();
  if (!haystack) return GENERIC_PROFILE;
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw.toLowerCase()))) {
      return rule.profile;
    }
  }
  return GENERIC_PROFILE;
}
