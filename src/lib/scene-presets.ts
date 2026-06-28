export interface SceneStyleTemplate {
  id: string;
  name: string;
  desc: string;
  image: string;
  stylePreference: string;
  productType?: string;
  candidateCount?: number;
}

export const sceneStyleTemplates: SceneStyleTemplate[] = [
  {
    id: "elegant",
    name: "简约自然",
    desc: "干净自然光，适合美妆护肤",
    image: "/scene-presets/scene-elegant.webp",
    stylePreference: "minimal natural ecommerce scene, soft morning light, clean stone surface, premium skincare photography",
    productType: "beauty",
  },
  {
    id: "lifestyle",
    name: "生活场景",
    desc: "真实居家氛围，适合家居日用",
    image: "/scene-presets/scene-lifestyle.webp",
    stylePreference: "warm lifestyle home scene, modern living room table, natural daylight, comfortable commercial photography",
    productType: "home",
  },
  {
    id: "minimal",
    name: "极简商务",
    desc: "清爽留白，适合 3C 数码",
    image: "/scene-presets/scene-minimal.webp",
    stylePreference: "minimal technology product scene, matte white desk, acrylic geometry, cool studio lighting",
    productType: "electronics",
  },
  {
    id: "warm",
    name: "温馨居家",
    desc: "柔和暖光，适合母婴用品",
    image: "/scene-presets/scene-warm.webp",
    stylePreference: "cozy warm home scene, soft fabric, pale wood shelf, gentle lamp glow, family-friendly mood",
    productType: "baby",
  },
  {
    id: "outdoor",
    name: "户外自然",
    desc: "阳光绿植，适合运动户外",
    image: "/scene-presets/scene-outdoor.webp",
    stylePreference: "outdoor nature scene, stone platform, green foliage, bright daylight, fresh commercial photography",
  },
  {
    id: "fresh",
    name: "清新食品",
    desc: "明亮餐厨，适合食品饮料",
    image: "/scene-presets/scene-fresh.webp",
    stylePreference: "fresh food and beverage scene, bright kitchen counter, citrus and herb accents, crisp morning light",
    productType: "food",
  },
  {
    id: "luxury",
    name: "奢华高端",
    desc: "暗调金边，适合珠宝配饰",
    image: "/scene-presets/scene-luxury.webp",
    stylePreference: "luxury premium product scene, dark stone plinth, satin fabric, champagne gold rim light",
  },
  {
    id: "festival",
    name: "节日氛围",
    desc: "暖色促销，适合礼品节庆",
    image: "/scene-presets/scene-festival.webp",
    stylePreference: "festive promotional ecommerce scene, warm lights, red and gold accents, clean central display",
  },
  {
    id: "business",
    name: "商业办公",
    desc: "专业办公，适合商务用品",
    image: "/scene-presets/scene-business.webp",
    stylePreference: "modern business office scene, executive desk surface, city window light, polished professional mood",
  },
];
