import { User, BestFriend } from "./neynar";
import { withRetry } from "./retry";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
if (!NEYNAR_API_KEY) {
  throw new Error("NEYNAR_API_KEY is not set");
}

const options = {
  method: 'GET',
  headers: { 'api_key': NEYNAR_API_KEY },
};

/**
 * Fetches a user's best friends directly from the Neynar API.
 * Server-side use only.
 */
export async function getFamilyOnServer(fid: number): Promise<BestFriend[]> {
  const url = `https://api.neynar.com/v2/farcaster/user/best_friends?limit=30&fid=${fid}`;
  
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to fetch family from Neynar API: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.users as BestFriend[];
}

/**
 * Fetches user profiles in bulk directly from the Neynar API.
 * Server-side use only.
 */
export async function fetchUsersOnServer(fids: number[], viewerFid: number): Promise<User[]> {
  const fidsStr = fids.join(',');
  const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsStr}&viewer_fid=${viewerFid}`;
 
  try {
    const response = await fetch(url, options);   
    const responseBody = await response.text();
    
    if (!response.ok) {
      throw new Error(`Failed to fetch users from Neynar API: ${response.statusText}`);
    }

    const data = JSON.parse(responseBody);
    return data.users as User[];
  } catch (error) {
    console.error(`[neynar-server] Error fetching users:`, error);
    throw error;
  }
}
