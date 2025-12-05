'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

type UserContextType = {
  fid: number | null;
  username: string | null;
  pfpUrl: string | null;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);

  useEffect(() => {
    async function getFarcasterUser() {
      try {
        const { user } = await sdk.context;
        if (user) {
          setFid(user.fid);
          setUsername(user.username ?? null);
          setPfpUrl("https://tba-mobile.mypinata.cloud/ipfs/QmcXPLBpv8RDK92kkBvZGG9qFAgKaF7Ti74QVSkihkwwGX?pinataGatewayToken=3nq0UVhtd3rYmgYDdb1I9qv7rHsw-_DzwdWkZPRQ-QW1avFI9dCS8knaSfq_R5_q");
          //setPfpUrl(user.pfpUrl ?? null);
        }
      } catch (error) {
        console.error("Failed to get Farcaster user:", error);
      }
    }
    getFarcasterUser();
  }, []);

  const value = { fid, username, pfpUrl };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}