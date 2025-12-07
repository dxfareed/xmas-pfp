'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

type UserContextType = {
  fid: number | null;
  username: string | null;
  pfpUrl: string | null;
  isLoading: boolean;
  isInFarcaster: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [pfpUrl, setPfpUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInFarcaster, setIsInFarcaster] = useState(false);

  useEffect(() => {
    async function getFarcasterUser() {
      try {
        const { user } = await sdk.context;
        if (user) {
          setFid(user.fid);
          setUsername(user.username ?? null);
          //setPfpUrl("https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/fa551416-4bdd-4e0f-63f3-08f2b82dc700/original");
          //setPfpUrl("https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/14a815fa-d6cc-4388-e8b7-eaf187f60400/rectcrop3");
          //setPfpUrl("https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/0a933a84-7f05-42da-9e4d-1b7d10507600/original");
          setPfpUrl(user.pfpUrl ?? null);
          setIsInFarcaster(true);
        }
      } catch (error) {
        console.error("Failed to get Farcaster user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getFarcasterUser();
  }, []);

  const value = { fid, username, pfpUrl, isLoading, isInFarcaster };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}