
import { createWalletClient, createPublicClient, http, defineChain, parseEther, keccak256, encodePacked, decodeEventLog, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

config()

// Will be updated after deployment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT
const SIGNER_KEY = process.env.DAILY_GIFT_SIGNER_PRIVATE_KEY as `0x${string}`
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`

if (!SIGNER_KEY || !DEPLOYER_KEY) {
    throw new Error("Missing KEYS")
}

async function main() {
    console.log(`\n⚡️ Testing Server-Randomness Flow`)

    if (!CONTRACT_ADDRESS) {
        throw new Error("Missing CONTRACT_ADDRESS")
    }

    const account = privateKeyToAccount(DEPLOYER_KEY)
    const signerAccount = privateKeyToAccount(SIGNER_KEY)
    const publicClient = createPublicClient({ chain: base, transport: http() })
    const walletClient = createWalletClient({ account, chain: base, transport: http() })

    // Load ABI
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/DailyGift.sol/DailyGift.json')
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    const abi = artifact.abi

    // 1. Simulate API (Generate Randomness)
    const fid = Math.floor(Math.random() * 1000000)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
    const recipient = account.address
    const amount = BigInt(Math.floor(Math.random() * 1000000) + 1000) // Random amount

    console.log(`- Simulated Prize: ${formatUnits(amount, 6)} USDC`)

    // 2. Sign
    const messageHash = keccak256(
        encodePacked(
            ["uint256", "address", "uint256", "uint256"],
            [BigInt(fid), recipient, amount, deadline]
        )
    )

    const signature = await signerAccount.signMessage({
        message: { raw: messageHash }
    })

    // 3. Claim
    console.log(`- Sending claim()...`)
    try {
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: abi,
            functionName: 'claim',
            args: [BigInt(fid), recipient, amount, deadline, signature],
            value: parseEther('0.0001')
        })

        console.log(`- TX: ${hash}`)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log(`✅ Claim Successful! (Block: ${receipt.blockNumber})`)

    } catch (e) {
        console.error("❌ Claim Failed:", e)
    }
}

main()
