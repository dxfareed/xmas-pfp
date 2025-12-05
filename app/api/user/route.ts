import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { User } from "@/lib/neynar";

import { withRetry } from "@/lib/retry";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

// Cache is considered stale after 1 hour
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const res = await isAuthenticated(request);
  if (res instanceof NextResponse) {
    return res;
  }

  const { searchParams } = new URL(request.url);
  const fidsStr = searchParams.get('fids');
  const viewerFid = searchParams.get('viewerFid');

  if (!fidsStr) {
    return NextResponse.json({ message: "Missing fids" }, { status: 400 });
  }

  if (!viewerFid) {
    return NextResponse.json({ message: "Missing viewerFid" }, { status: 400 });
  }

  const fids = fidsStr.split(',').map(id => BigInt(id));
  let finalUsers: User[] = [];
  let fidsToFetch: bigint[] = [];

  try {//@ts-ignore
    const cachedUsers = await prisma.userCache.findMany({
      where: { fid: { in: fids } },
    });

    const now = new Date().getTime();
    //@ts-ignore
    const freshCachedUsers = cachedUsers.filter(cachedUser => (now - cachedUser.updatedAt.getTime()) < CACHE_DURATION_MS);
    //@ts-ignore
    finalUsers = freshCachedUsers.map(cu => cu.userProfile as unknown as User);
    //@ts-ignore
    const cachedFids = new Set(freshCachedUsers.map(cu => cu.fid));
    fidsToFetch = fids.filter(fid => !cachedFids.has(fid));

    if (fidsToFetch.length > 0) {
      const fidsToFetchStr = fidsToFetch.join(',');
      const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsToFetchStr}&viewer_fid=${viewerFid}`;
      const options = {
        method: 'GET',
        headers: { 'x-api-key': NEYNAR_API_KEY },
      };
      
      //@ts-ignore
      const fetchOperation = () => fetch(url, options);
      //@ts-ignore
      const response = await withRetry(fetchOperation);
      
      const data = await response.json();
      const newlyFetchedUsers: User[] = data.users;

      // Add new users to the final list and update cache
      if (newlyFetchedUsers && newlyFetchedUsers.length > 0) {
        finalUsers.push(...newlyFetchedUsers);
        
        // Asynchronously update cache without blocking the response
        Promise.all(newlyFetchedUsers.map(user => 
          //@ts-ignore
          prisma.userCache.upsert({
            where: { fid: BigInt(user.fid) },
            update: { userProfile: user as any, updatedAt: new Date() },
            create: { fid: BigInt(user.fid), userProfile: user as any },
          })
        )).catch(console.error);
      }
    }

    return NextResponse.json({ users: finalUsers });
  } catch (e) {
    console.error(e);
    if (e instanceof Error) {
      return NextResponse.json({ message: e.message, name: e.name, stack: e.stack }, { status: 500 });
    }

    throw e;
  }
}
