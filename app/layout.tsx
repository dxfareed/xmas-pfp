import type { Metadata, Viewport } from "next";
import localFont from 'next/font/local';
import { minikitConfig } from "@/minikit.config";
import { RootProvider } from "./rootProvider";
import "./globals.css";
//import { ErudaLoader } from "./components/ErudaLoader";
import { Analytics } from "@vercel/analytics/next"; // Import Analytics

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
}

export async function generateMetadata(): Promise<Metadata> {

  return {
    title: minikitConfig.frame.name,
    description: minikitConfig.frame.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.frame.version,
        imageUrl: minikitConfig.frame.heroImageUrl,
        button: {
          title: `Generate ${minikitConfig.frame.name}`,
          action: {
            name: `Launch ${minikitConfig.frame.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  };
}

const w95fa = localFont({
  src: [
    {
      path: '../public/fonts/W95FA/w95fa.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/W95FA/w95fa.woff',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-w95fa'
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="en">
      <body className={w95fa.className}>
        <RootProvider>{children}</RootProvider>
        <Analytics />
      </body>
    </html>
  );
}
