// app/api/nft/check/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { checkNftOwnershipOnServer } from '@/lib/nft';
import { fetchUsersOnServer } from '@/lib/neynar-server';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const fid = await isAuthenticated(req);
  if (fid instanceof NextResponse) {
    return fid;
  }

  try {
    // Fetch the full user object to ensure verified_addresses is present
    const [fullUser] = await fetchUsersOnServer([fid], fid);
    if (!fullUser) {
      return NextResponse.json({ error: 'Failed to fetch full user profile' }, { status: 500 });
    }

    const result = await checkNftOwnershipOnServer(fullUser);
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
