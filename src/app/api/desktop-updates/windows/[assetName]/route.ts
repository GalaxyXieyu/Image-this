import { NextRequest, NextResponse } from 'next/server';
import { downloadReleaseAsset } from '@/lib/github-release-broker';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ assetName: string }> }
) {
  try {
    const { assetName } = await params;
    const decodedAssetName = decodeURIComponent(assetName);
    const { asset, buffer } = await downloadReleaseAsset(decodedAssetName);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': asset.content_type || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': `attachment; filename="${asset.name}"`,
      },
    });
  } catch (error) {
    console.error('[desktop-updates] asset proxy failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch update asset.',
      },
      { status: 502 }
    );
  }
}
