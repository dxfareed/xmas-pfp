// lib/nft-client.ts
import { User } from '@/lib/neynar';
import { withRetry } from './retry';

export async function checkNftOwnership(user: User): Promise<{ user: User; holdingNft: boolean; nftImage: string | null }> {
  return withRetry(async () => {
    const response = await fetch('/api/nft/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Failed to check NFT ownership:', response.status, errorBody);
      throw new Error(`Failed to check NFT ownership: ${response.status}`);
    }

    return response.json();
  });
}
