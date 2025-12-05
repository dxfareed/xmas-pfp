import { NextResponse, NextRequest } from 'next/server';
import prisma from '../../../lib/prisma';
import { isAuthenticated } from '../../../lib/auth';
import { withRetry } from '@/lib/retry';

export async function GET(request: Request) {
  const authResult = await isAuthenticated(request as NextRequest);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const fid = authResult;

  try {
    const userNfts = await withRetry(() => prisma.userNFTs.findUnique({
      where: {
        ownerFid: BigInt(fid),
      },
    }));

    const nfts = userNfts ? userNfts.nfts : [];

    return NextResponse.json({ nfts });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Failed to fetch NFTs from database' }, { status: 500 });
  }
}
