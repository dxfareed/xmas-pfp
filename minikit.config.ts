const ROOT_URL = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL;

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: process.env.NEXT_PUBLIC_HEADER,
    payload: process.env.NEXT_PUBLIC_PAYLOAD,
    signature: process.env.NEXT_PUBLIC_SIGNATURE,
  },
  "baseBuilder": {
    "allowedAddresses": [process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS || ''],
  },
  frame: {
    version: "1",
    name: "Xmas PFP",
    subtitle: "Merry Christmas",
    description: "Update your pfp for Christmas",
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/icon.png`,
    splashBackgroundColor: "#f4f3faff",
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/hero.png`,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["social", "enternainment"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    ogTitle: "Update your pfp for Christmas",
    ogDescription: "Update your pfp for Christmas",
    ogImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Update your pfp for Christmas"
  },
} as const;