// lib/nft.ts
import { User } from '@/lib/neynar';
import prisma from '@/lib/prisma';


// mainnet 
//0x999F46f34292771f77Ed1a5F59ca18eA1Ac29fF7
const NFT_CONTRACT_ADDRESS = '0x699727f9e01a822efdcf7333073f0461e5914b4e';
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

// Cache is considered stale after 6 hours
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

async function checkIfUserMintedNft(address: string): Promise<boolean> {
  if (!ALCHEMY_API_KEY) {
    console.error('Alchemy API key is not set.');
    return false;
  }
  const url = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [
      {
        fromAddress: "0x0000000000000000000000000000000000000000",
        toAddress: address,
        contractAddresses: [NFT_CONTRACT_ADDRESS],
        category: ["erc721"],
        withMetadata: false,
        maxCount: '0x1',
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data.result && data.result.transfers.length > 0;
  } catch (error) {
    console.error(`Error checking mint status for ${address}:`, error);
    return false;
  }
}

async function getNftImageFromAlchemy(address: string): Promise<string | null> {
  if (!ALCHEMY_API_KEY) {
    console.error('Alchemy API key is not set.');
    return null;
  }
  const url = `https://base-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}/getNFTs?owner=${address}&contractAddresses[]=${NFT_CONTRACT_ADDRESS}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Error fetching NFT data from Alchemy: ${errorBody}`);
    }
    const data = await res.json();
    if (data.ownedNfts.length > 0) {
      return data.ownedNfts[0].media[0].gateway;
    }
  } catch (error) {
    console.error('Error fetching NFT data from Alchemy:', error);
  }
  return null;
}

export async function checkNftOwnershipOnServer(user: User): Promise<{ user: User; holdingNft: boolean; nftImage: string | null }> {
  const fid = BigInt(user.fid);
  console.log(`Fetching live minting status for FID: ${fid}...`);
  
  let holdingNft = false;
  let nftImage: string | null = null;

  const addresses = user.verified_addresses.eth_addresses || [];
  if (user.verified_addresses.primary?.eth_address && !addresses.includes(user.verified_addresses.primary.eth_address)) {
    addresses.push(user.verified_addresses.primary.eth_address);
  }

  for (const address of addresses) {
    const hasMinted = await checkIfUserMintedNft(address);
    if (hasMinted) {
      holdingNft = true;
      nftImage = await getNftImageFromAlchemy(address);
      break; 
    }
  }

  return { user, holdingNft, nftImage };
}

