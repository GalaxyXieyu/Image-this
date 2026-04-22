import { NextResponse } from 'next/server';
import { downloadReleaseAsset } from '@/lib/github-release-broker';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { asset, buffer } = await downloadReleaseAsset('latest.yml');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': asset.content_type || 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('[desktop-updates] latest.yml proxy failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch update metadata.',
      },
      { status: 502 }
    );
  }
}
