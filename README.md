# Xmas PFP Generator & Daily Gift 🎄

A Farcaster Mini App that allows users to generate festive AI-powered PFPs, mint them as NFTs on Base, and claim daily ERC20 token rewards.

## ⚡ Performance
- **Server Side Rendering (SSR)**: Enabled for instant page loads, removing hydration delays.
- **Optimized Fonts**: Uses `next/font/local` for zero layout shift and fast rendering.
- **Efficient Builds**: Clean dependencies with no unused heavy libraries.

## 🌟 Key Features

### 1. **AI PFP Generator**
- **Image Generation**: Uses Google's Generative AI (`@google/generative-ai`) to transform existing Farcaster PFPs or uploaded images into Christmas-themed avatars.
- **Customization**: Offers style options (e.g., "Christian", "Santa", "Elf") via prompts sent to the backend.
- **Preview & Share**: Users can preview their generated PFP and instantly share it on Farcaster via `sdk.actions.composeCast`.

### 2. **Unlimited Casino Mode 🎰**
- **Pay-to-Play**: Users pay a small entry fee (**0.0001 ETH**) to spin the wheel.
- **Unlimited Action**: No cooldowns or timers. Play as many times as you like!
- **Verifiable Randomness**: Powered by **Chainlink VRF V2.5** to guarantee fair and tamper-proof outcomes.
- **Live Winners Marquee**: Real-time scrolling feed of recent winners to build excitement.
- **Verified Player Badge**: Displays your Farcaster PFP and Username on the game card.

### 3. **NFT Minting on Base**
- **Mint generated PFPs**: Users can mint their favorite AI-generated creations as NFTs on the Base L2 network.
- **IPFS Storage**: Images are uploaded to IPFS (via Pinata or similar service) before minting to ensure decentralized storage of metadata.

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Library**: React 19
- **language**: TypeScript
- **Styling**: CSS Modules (`.module.css`) & Global CSS
- **Farcaster SDK**: `@farcaster/miniapp-sdk` for Frame/Mini App context and actions.

### **Blockchain & Web3**
- **Interaction**: [Wagmi v2](https://wagmi.sh/) & [Viem](https://viem.sh/)
- **Wallets**: [RainbowKit](https://www.rainbowkit.com/)
- **Network**: **Base Mainnet** (Chain ID: 8453)
- **Contracts**: Solidity (`^0.8.20`), deployed via Hardhat.

### **Backend & Database**
- **API**: Next.js Serverless Functions (`app/api/*`)
- **Database**: PostgreSQL (via [Prisma ORM](https://www.prisma.io/))
- **Auth**: Farcaster Auth (SIWF) verified via `@farcaster/quick-auth`.
- **Sybil Protection**: [Neynar SDK](https://neynar.com/) for user reputation scoring.

### **AI Services**
- **Model**: Google Gemini / Generative AI (`@google/generative-ai`) for image-to-image transformations.

---

## 🔐 Smart Contract Architecture

### `DailyGiftVRF.sol`
The upgraded core contract managing the "Casino Mode" logic.

- **Address**: `0xbac70c40c21dca315b46d7705c9dff6ee12a40de` (Base Mainnet)
- **Key Features**:
  - **Payable Claim**: Accepts `0.0001 ETH` per transaction.
  - **Chainlink VRF V2.5**: Requests random words from Chainlink's VRF Coordinator to determine gift amounts.
  - **Security**:
    - `ReentrancyGuard`: Prevents reentrancy attacks.
    - `VRFConsumerBaseV2Plus`: Inherits standard Chainlink VRF security patterns.
    - `Ownable`: Restricts admin functions (withdraw ETH, update params).

#### 🤖 AI Agent Context: Contract Flow
```mermaid
graph TD
    User([User]) -->|"1. Pay 0.0001 ETH"| Contract[DailyGiftVRF]
    Contract -->|"2. Request Randomness"| VRF[Chainlink VRF]
    VRF -->|"3. Callback (Random Word)"| Contract
    Contract -->|"4. Determine Prize"| User
    
    subgraph "Verification"
    User -->|"Sign Message"| API[Backend Signer]
    API -->|"Signature"| User
    end
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- Farcaster Account (for testing auth)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd mini-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root directory:

    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/xmas_pfp"

    # Farcaster
    NEXT_PUBLIC_URL="https://your-app-url.com"
    NEXT_PUBLIC_PROJECT_ID="your-walletconnect-project-id"

    # Contracts
    NEXT_PUBLIC_DAILY_GIFT_CONTRACT="0x64c603..."
    # DAILY_GIFT_SIGNER_PRIVATE_KEY="" # (Optional) If using signatures
    VRF_SUBSCRIPTION_ID="your-chainlink-sub-id"
    
    # APIs
    NEYNAR_API_KEY="your-neynar-key"
    GOOGLE_API_KEY="your-gemini-api-key"
    PINATA_JWT="your-pinata-jwt" # If using Pinata
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) (Note: Auth will fail outside Farcaster context unless mocked).

### Development Tips
- **Testing Auth**: Use the Farcaster Developer Playground or a local debugger to simulate the Mini App environment.
- **Contract Verify**: Contracts are verified on Basescan. Use `npx hardhat verify` in the `contracts/` folder if redeploying.

---

## 📂 Project Structure

```
mini-app/
├── app/
│   ├── api/            # Serverless API routes (Auth, Claim, Generate)
│   ├── components/     # React components (Countdown, Loader, etc.)
│   ├── context/        # React Context (UserContext)
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout (Providers included)
│   └── page.tsx        # Main UI (Dashboard)
├── components/         # Shared UI components
├── contracts/          # (Optional) Hardhat project reference
├── lib/
│   ├── auth.ts         # Authentication helper (JWT verify)
│   ├── dailyGiftAbi.ts # Contract ABI
│   ├── prisma.ts       # Database client
│   └── retry.ts        # Utility for retrying failed requests
├── prisma/             # Database schema & migrations
└── public/             # Static assets
```

## 🤖 AI Agent & Developer Notes

### Critical Invariants
1.  **Contract Address**: `0xbac70c40c21dca315b46d7705c9dff6ee12a40de` (Base Mainnet).
2.  **Entry Fee**: Must be exactly `0.0001 ETH` or transaction reverts (`InvalidEntryFee`).
3.  **VRF**: Uses V2.5. Subscription ID is `uint256`.
4.  **Auth**: Backend requires valid Farcaster `custody` or `signer` address for signatures.

### Key File Mapping
-   **Contract Logic**: `contracts/DailyGiftVRF.sol`
-   **Deployment**: `scripts/deploy-vrf.ts`
-   **Frontend Claim**: `app/components/DailyGiftCard.tsx`
-   **Signer API**: `app/api/daily-gift/sign/route.ts`