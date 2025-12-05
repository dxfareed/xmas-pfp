// In: app/api/frame-image/generated/route.tsx

import { ImageResponse } from 'next/og';

export const runtime = 'edge'; // Required for ImageResponse

// Fetch the custom font
const w95fa = fetch(
  new URL('/fonts/W95FA/W95FA.otf', process.env.NEXT_PUBLIC_URL!)
).then((res) => res.arrayBuffer());

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1. Get the image to display from query parameters
  const imageUrl = searchParams.get('imageUrl');
  const fontData = await w95fa;

  if (!imageUrl) {
    return new Response('Missing image URL', { status: 400 });
  }

  // Convert IPFS URI to a public gateway URL if necessary
  const fetchableImageUrl = imageUrl.startsWith("ipfs://")
    ? imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/")
    : imageUrl;

  // Fetch the image and convert it to a data URL
  const imageResponse = await fetch(fetchableImageUrl);
  const imageArrayBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
  const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';
  const imageDataUrl = `data:${imageMimeType};base64,${imageBase64}`;


  // 2. Return the ImageResponse
  return new ImageResponse(
    (
      // Display the provided image within the frame
      <div
        style={{
          display: 'flex',
          flexDirection: 'column', // Allow vertical stacking
          alignItems: 'center',
          justifyContent: 'space-between', // Distribute space between items
          width: '100%',
          height: '100%',
          backgroundColor: '#000000', // Black background
          position: 'relative', // For absolute positioning of footer
          paddingBottom: '30px', // Add padding to make space for the footer
        }}
      >
        <img
            src={imageDataUrl}
            alt="Generated Creature"
            width="285"
            height="255" // Reduced height
            style={{ borderRadius: '20px', marginTop: '20px' }} // Add top margin to center it better
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            color: '#FFFFFF',
            fontSize: '17px',
            fontFamily: '"W95FA"',
          }}
        >
          Religious Warplet: mwe founwd faithw
        </div>
      </div>
    ),
    {
      width: 600,
      height: 315,
      fonts: [
        {
          name: 'W95FA',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  );
}
