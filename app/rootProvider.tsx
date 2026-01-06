"use client";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { UserProvider } from '@/app/context/UserContext';
import { MiniAppProvider } from "@neynar/react";
import { sdk } from "@farcaster/miniapp-sdk";
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';

const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    sdk.actions.ready({ disableNativeGestures: true });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniAppProvider>
          <RainbowKitProvider theme={darkTheme()}>
            <UserProvider>
              {children}
            </UserProvider>
          </RainbowKitProvider>
        </MiniAppProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}