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
    name: "Religious Warplet",
    subtitle: "Choose your warplet faith",
    description: "Warplet for all religions, choose your warplet faith",
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/icon.png`,
    splashBackgroundColor: "#7A6FAF",
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/hero.png`,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "social",
    tags: ["social", "enternainment"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    ogTitle: "Choose your warplet faith",
    ogDescription: "Warplet for all religions, choose your warplet faith",
    ogImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Choose your warplet faith"
  },
} as const;