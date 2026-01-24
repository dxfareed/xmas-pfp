
import { createWalletClient, createPublicClient, http, defineChain, parseEther, formatUnits, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

config()

// Will be updated after deployment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT
const SIGNER_KEY = process.env.DAILY_GIFT_SIGNER_PRIVATE_KEY as `0x${string}`
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` // User

if (!SIGNER_KEY || !DEPLOYER_KEY) {
    throw new Error("Missing KEYS")
}

async function main() {
    console.log(`\n⚡️ Testing Secure Commit-Reveal Flow`)

    if (!CONTRACT_ADDRESS) {
        throw new Error("Missing CONTRACT_ADDRESS")
    }

    const userAccount = privateKeyToAccount(DEPLOYER_KEY)
    const serverAccount = privateKeyToAccount(SIGNER_KEY)

    // Clients
    const publicClient = createPublicClient({ chain: base, transport: http() })
    const userWallet = createWalletClient({ account: userAccount, chain: base, transport: http() })
    const serverWallet = createWalletClient({ account: serverAccount, chain: base, transport: http() })

    // Load ABI
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/DailyGift.sol/DailyGift.json')
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    const abi = artifact.abi

    // 1. User Plays (Commit)
    console.log(`1. User Plays (Entry Fee 0.0001 ETH)...`)
    const fid = BigInt(Math.floor(Math.random() * 1000000))

    try {
        const playHash = await userWallet.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: abi,
            functionName: 'play',
            args: [fid],
            value: parseEther('0.0001')
        })
        console.log(`- Play Tx: ${playHash}`)

        const receipt = await publicClient.waitForTransactionReceipt({ hash: playHash })
        console.log(`✅ Commit Confirmed (Block: ${receipt.blockNumber})`)

        // 2. Server Reveals (Payout)
        console.log(`2. Server Detecting & Paying Out...`)

        // Simulate "Random" logic
        const amount = BigInt(Math.floor(Math.random() * 1000000) + 1000)
        console.log(`- Prize: ${formatUnits(amount, 6)} USDC`)

        const payoutHash = await serverWallet.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: abi,
            functionName: 'payout',
            args: [fid, userAccount.address, amount]
        })

        console.log(`- Payout Tx: ${payoutHash}`)
        const payoutReceipt = await publicClient.waitForTransactionReceipt({ hash: payoutHash })
        console.log(`✅ Payout Successful! (Block: ${payoutReceipt.blockNumber})`)

    } catch (e: any) {
        console.error("❌ Test Failed:", e.message || e)
    }
}

main()
