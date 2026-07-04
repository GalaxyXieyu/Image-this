/**
 * AI 商品套图 - 出词服务。
 * 调用用户配置的「文案/出词多模态模型」（OpenAI 兼容 chat/vision），
 * 读取商品图 + 商品信息，为选中的套图类型各产出「指定数量段」图像生成提示词草稿，供用户确认。
 * 同一类型的多段提示词保持统一风格，仅构图/角度不同。
 */

import { getUserConfig, normalizeChatBaseUrl } from '@/lib/user-config';
import {
  LISTING_TYPES,
  buildListingPrompt,
  type ListingImageType,
  type ListingProductInfo,
} from '@/lib/workbench/listing-set';

export interface PlanItem {
  listingType: ListingImageType;
  index: string;
  label: string;
  /** 同类内第几张（1-based） */
  variant: number;
  prompt: string;
}

function extractJson(text: string): Record<string, unknown> | null {
  // 去掉 ```json fence
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** 从解析结果里取某类型的提示词数组（兼容字符串 / 数组 / 缺失） */
function extractPromptList(parsed: Record<string, unknown> | null, type: ListingImageType): string[] {
  if (!parsed) return [];
  const raw = parsed[type];
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

export async function planListingPrompts(
  userId: string,
  imageDataUrl: string,
  product: ListingProductInfo,
  /** 每类目标张数；缺省/未含某类=按选中类型各 1 张 */
  counts?: Partial<Record<ListingImageType, number>>,
  /** 可选：指定出词模型 id（须为用户已配置的多模态语言模型之一），缺省用自动选中的第一个 */
  modelOverride?: string
): Promise<PlanItem[]> {
  const config = await getUserConfig(userId);
  // 指定了模型就在候选里按 id 匹配，否则用默认 copywriter
  const cw =
    (modelOverride && config.copywriterCandidates?.find((c) => c.modelName === modelOverride)) ||
    config.copywriter;
  if (!cw?.apiKey) {
    throw new Error('未配置文案/出词模型，请在设置页面将某个模型类型设为「多模态语言模型」后再试');
  }

  // 需要出词的 (类型, 张数)：counts 里 >0 的类型；没有传 counts 时默认全部各 1 张
  const requested = LISTING_TYPES.map((t) => ({
    meta: t,
    count: Math.max(0, Math.floor(counts?.[t.type] ?? (counts ? 0 : 1))),
  })).filter((r) => r.count > 0);
  const active = requested.length > 0
    ? requested
    : LISTING_TYPES.map((t) => ({ meta: t, count: 1 }));
  const totalPrompts = active.reduce((sum, r) => sum + r.count, 0);

  const baseUrl = normalizeChatBaseUrl(cw.baseUrl);
  const typeLines = active
    .map((r) => `- ${r.meta.type}（${r.meta.label}）× ${r.count} 段：${r.meta.rule}`)
    .join('\n');
  const brief = [
    product.name ? `商品名称：${product.name}` : '',
    product.category ? `品类：${product.category}` : '',
    product.description ? `描述：${product.description}` : '',
    product.sellingPoints ? `卖点：${product.sellingPoints}` : '',
  ]
    .filter(Boolean)
    .join('；');

  const systemPrompt =
    '你是资深电商视觉提示词专家。你会先观察用户上传的商品图，结合商品信息，为一套电商套图按要求的类型和数量撰写「图像生成提示词」（中文）。' +
    '每段提示词都要：严格保持商品主体外观/比例/材质/品牌特征不变；贴合该类型的版式规则；具体描述背景、光线、构图、氛围与点缀。' +
    '同一类型若需要多段，必须保持统一的背景基调、光线、色彩与品牌调性（成套风格一致），仅在构图、机位、角度、取景或道具组合上做出明显差异，切勿重复。' +
    '只输出 JSON，键为类型英文标识，值为「字符串数组」，数组长度必须等于该类型请求的段数，不要任何额外解释或 markdown。';

  const jsonSkeleton = `{${active
    .map((r) => `"${r.meta.type}": [${Array.from({ length: r.count }, () => '"..."').join(', ')}]`)
    .join(', ')}}`;

  const userText =
    `本次需要出词的类型与数量（值为该类型要生成的提示词段数）：\n${typeLines}\n\n` +
    (brief ? `商品信息：${brief}\n\n` : '') +
    `请观察这张商品图，为每个类型输出恰好对应数量段提示词，输出 JSON（数组长度需与数量一致）：${jsonSkeleton}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cw.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cw.modelName,
      // 随总段数放大 token 预算，单段约 ~250 token
      max_tokens: Math.min(1200 + totalPrompts * 320, 8000),
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`出词模型调用失败: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);

  // 扁平化为 PlanItem[]，并对每类做「稳定性兜底」：少返用模板变体补齐，多返截断
  const items: PlanItem[] = [];
  for (const { meta, count } of active) {
    const modelPrompts = extractPromptList(parsed, meta.type);
    for (let v = 1; v <= count; v++) {
      const fromModel = modelPrompts[v - 1];
      const prompt =
        fromModel && fromModel.length > 0
          ? fromModel
          : buildListingPrompt(meta.type, product, v, count);
      items.push({
        listingType: meta.type,
        index: meta.index,
        label: meta.label,
        variant: v,
        prompt,
      });
    }
  }

  return items;
}
