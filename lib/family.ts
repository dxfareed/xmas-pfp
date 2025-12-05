import { BestFriend } from "./neynar";
import { sdk } from '@farcaster/miniapp-sdk';

export async function getFamily(fid: number): Promise<BestFriend[]> {
  const response = await sdk.quickAuth.fetch(`/api/family?fid=${fid}`);
  if (!response.ok) {
    throw new Error('Failed to fetch family');
  }
  const { family } = await response.json();
  return family;
}
