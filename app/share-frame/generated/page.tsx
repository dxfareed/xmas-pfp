// In: app/share-frame/generated/page.tsx

import { minikitConfig } from '@/minikit.config';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

// This function generates the metadata for the page
export async function generateMetadata({ searchParams }: any): Promise<Metadata> {
  // Get the image url from the search params
  const imageUrl = searchParams.imageUrl as string;

  if (!imageUrl) {
    // Return default metadata or handle error
    return {
      title: 'Error: Image not found',
    };
  }

  // Construct the dynamic image URL for the frame image
  const frameImageUrl = new URL(`${minikitConfig.frame.homeUrl}/api/frame-image/generated`);
  frameImageUrl.searchParams.set('imageUrl', imageUrl);

  // The URL of your mini-app that should be launched
  const launchUrl = minikitConfig.frame.homeUrl || '/';

  console.log('Frame Image URL:', frameImageUrl.toString());

  const fcFrameContent = JSON.stringify({
    version: minikitConfig.frame.version,
    imageUrl: frameImageUrl.toString(),
    button: {
      title: `Generate Religious Warplet`,
      action: {
        name: `Generate ${minikitConfig.frame.name}`,
        type: "launch_frame",
        target: launchUrl,
      },
    },
  });

  /* return {
    title: `A new Warplet was generated!`,
    other: {
      // --- Farcaster Frame Meta Tags ---
      'fc:frame': 'vNext',
      'fc:frame:image': frameImageUrl.toString(),
      'fc:frame:button:1': 'View in App',
      'fc:frame:button:1:action': 'launch',
      'fc:frame:button:1:target': launchUrl,

      // --- Open Graph Meta Tags for fallback ---
      'og:title': `A new Warplet was generated!`,
      'og:image': frameImageUrl.toString(),
    },
  }; */  

  return {
    title: minikitConfig.frame.name,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": fcFrameContent,
    },
  };
    
}

// This page component is not rendered in a browser when a frame is viewed.
// It's good practice to have a fallback for direct navigation.
export default function Page() {
  redirect('/');
  return (
    <div>
      <h1>This is a Farcaster Frame.</h1>
      <p>View it on a Farcaster client to see it in action.</p>
    </div>
  );
}
