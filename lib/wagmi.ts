import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
const in_rpc_url = process.env.NEXT_PUBLIC_HTTPS_IN_URL;

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        rainbowWallet,
        walletConnectWallet,
        coinbaseWallet,
        metaMaskWallet,
      ],
    },
  ],
  {
    appName: 'Xmas PFP',
    projectId,
  }
);

export const config = createConfig({
  connectors: [...connectors, farcasterMiniApp()],
  chains: [base],
  transports: {
    [base.id]: http(in_rpc_url),
  },
  ssr: true,
});