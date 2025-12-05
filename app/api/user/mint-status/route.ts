
import { NextResponse, NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';
import { withRetry } from '@/lib/retry';

export async function GET(req: NextRequest) {
  const fid = await isAuthenticated(req);
  if (fid instanceof NextResponse) {
    return fid;
  }

  try {
    const user = await withRetry(() => 
      //@ts-ignore
      prisma.user.findUnique({
        where: { fid: BigInt(fid) },
        include: { claims: true },
      })
    );

    if (!user) {
      // If user does not exist in our DB, they definitely haven't minted with us.
      return NextResponse.json({ hasMinted: false });
    }


    //@ts-ignore
    const hasMinted = user.claims.length > 0;

    return NextResponse.json({ hasMinted });
  } catch (error) {
    console.error('Error checking mint status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
