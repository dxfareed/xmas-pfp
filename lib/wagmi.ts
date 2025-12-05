import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'
import { http, fallback } from 'wagmi'

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
})

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base],
})

export const config = wagmiAdapter.wagmiConfig;