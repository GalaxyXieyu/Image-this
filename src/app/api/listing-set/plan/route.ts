import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { planListingPrompts } from '@/lib/workbench/listing-plan-service';
import type { ListingProductInfo } from '@/lib/workbench/listing-set';

/**
 * AI 商品套图 - 出词：读商品图，产出 5 段提示词草稿供用户确认。
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { imageDataUrl, product = {}, counts, model } = body as {
      imageDataUrl?: string;
      product?: ListingProductInfo;
      counts?: Record<string, number>;
      model?: string;
    };
    if (!imageDataUrl) {
      return NextResponse.json({ error: '缺少商品图' }, { status: 400 });
    }

    const items = await planListingPrompts(session.user.id, imageDataUrl, product, counts, model);
    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error('[商品套图] 出词失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '出词失败' },
      { status: 500 }
    );
  }
}
