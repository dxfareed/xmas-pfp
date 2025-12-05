// app/api/generate/route.ts
import { makeCreatureSmile, getCreatureGender, getCreatureDescription } from '@/lib/generative-ai';
import { NextResponse, NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const fid = await isAuthenticated(req);
  if (fid instanceof NextResponse) {
    return fid;
  }

  try {
    const { imageUrl, religion } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    let absoluteImageUrl = imageUrl;
    if (absoluteImageUrl.startsWith('/')) {
        const protocol = req.headers.get('x-forwarded-proto') || 'http';
        const host = req.headers.get('host');
        if (host) {
            absoluteImageUrl = `${protocol}://${host}${imageUrl}`;
        }
    }

    const gender = await getCreatureGender(absoluteImageUrl);
    const description = await getCreatureDescription(absoluteImageUrl);
    const newImageUrl = await makeCreatureSmile(absoluteImageUrl, religion, gender, description);

    if (newImageUrl) {
      return NextResponse.json({ newImageUrl });
    } else {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in generate route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}