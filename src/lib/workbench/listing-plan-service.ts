/**
 * AI 商品套图 - 出词服务。
 * 调用用户配置的「文案/出词多模态模型」（OpenAI 兼容 chat/vision），
 * 读取商品图 + 商品信息，为 5 类套图各产出一段图像生成提示词草稿，供用户确认。
 */

import { getUserConfig, normalizeChatBaseUrl } from '@/lib/user-config';
import { LISTING_TYPES, type ListingImageType, type ListingProductInfo } from '@/lib/workbench/listing-set';

export interface PlanItem {
  listingType: ListingImageType;
  index: string;
  label: string;
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

export async function planListingPrompts(
  userId: string,
  imageDataUrl: string,
  product: ListingProductInfo,
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

  const baseUrl = normalizeChatBaseUrl(cw.baseUrl);
  const typeLines = LISTING_TYPES.map((t) => `- ${t.type}（${t.label}）：${t.rule}`).join('\n');
  const brief = [
    product.name ? `商品名称：${product.name}` : '',
    product.category ? `品类：${product.category}` : '',
    product.description ? `描述：${product.description}` : '',
    product.sellingPoints ? `卖点：${product.sellingPoints}` : '',
  ]
    .filter(Boolean)
    .join('；');

  const systemPrompt =
    '你是资深电商视觉提示词专家。你会先观察用户上传的商品图，结合商品信息，为一套电商套图的 5 个类型分别撰写一段「图像生成提示词」（中文）。' +
    '每段提示词都要：严格保持商品主体外观/比例/材质/品牌特征不变；贴合该类型的版式规则；具体描述背景、光线、构图、氛围与点缀。' +
    '只输出 JSON，键为类型英文标识，值为对应提示词字符串，不要任何额外解释或 markdown。';

  const userText =
    `套图 5 个类型与版式规则：\n${typeLines}\n\n` +
    (brief ? `商品信息：${brief}\n\n` : '') +
    `请观察这张商品图，输出 JSON：{${LISTING_TYPES.map((t) => `"${t.type}": "..."`).join(', ')}}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cw.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cw.modelName,
      max_tokens: 1500,
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

  return LISTING_TYPES.map((t) => ({
    listingType: t.type,
    index: t.index,
    label: t.label,
    prompt: (parsed && typeof parsed[t.type] === 'string' ? (parsed[t.type] as string) : '').trim(),
  }));
}
