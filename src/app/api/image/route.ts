import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Cache resized images for 1 week
const CACHE_DURATION = 60 * 60 * 24 * 7;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const width = parseInt(searchParams.get('w') || '400', 10);
    const quality = parseInt(searchParams.get('q') || '75', 10);

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Only allow S3 URLs for security
    const allowedHosts = ['amazonaws.com'];
    const urlObj = new URL(url);
    if (!allowedHosts.some(host => urlObj.hostname.endsWith(host))) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }

    // Fetch the original image
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 502 });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize with sharp
    const resized = await sharp(buffer)
      .resize(width, null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    // Return with cache headers
    return new Response(new Uint8Array(resized), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': `public, max-age=${CACHE_DURATION}, immutable`,
        'CDN-Cache-Control': `public, max-age=${CACHE_DURATION}`,
      },
    });
  } catch (error) {
    console.error('Image resize error:', error);
    return NextResponse.json(
      { error: 'Image processing failed' },
      { status: 500 }
    );
  }
}
