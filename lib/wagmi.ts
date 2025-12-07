import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'
import { http, fallback } from 'wagmi'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
const in_rpc_url = process.env.NEXT_PUBLIC_HTTPS_IN_URL;

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [base],
  transports: {
    [base.id]: fallback([
      http(in_rpc_url),
    ]),
  },
  connectors: [farcasterMiniApp()],
})

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base],
})

export const config = wagmiAdapter.wagmiConfig;