
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

config()

// --- Config ---
// Base Mainnet
const VRF_COORDINATOR = '0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE'
const LINK_TOKEN = '0x88Rb47EF68bC278C3Af339ea252D8b72D9da7542' // Native LINK on Base? Check docs.
// VRF V2 Wrapper or Direct? Direct usually needs LINK.
// Note: Base Mainnet VRF Coordinator V2 address might differ.
// Official Docs: https://docs.chain.link/vrf/v2/subscription/supported-networks#base-mainnet
// Coordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
// Key Hash (30 gwei): 0x9e128cb839b98683526139c87faa7883b2767f73752766324e93d183A89f5D23

const KEY_HASH = '0x9e128cb839b98683526139c87faa7883b2767f73752766324e93d183A89f5D23'

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const MIN_AMOUNT = BigInt(1000) // 0.001 USDC (6 decimals)
const MAX_AMOUNT = BigInt(1000000) // 1 USDC (6 decimals)

async function main() {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
    const subIdString = process.env.VRF_SUBSCRIPTION_ID

    if (!privateKey || !subIdString) {
        throw new Error('Missing env vars: DEPLOYER_PRIVATE_KEY or VRF_SUBSCRIPTION_ID')
    }

    const subId = BigInt(subIdString)
    const account = privateKeyToAccount(privateKey)

    const client = createWalletClient({
        account,
        chain: base,
        transport: http()
    }).extend(publicActions)

    // Load Artifacts
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/DailyGiftVRF.sol/DailyGiftVRF.json')
    if (!fs.existsSync(artifactPath)) {
        throw new Error('Artifact not found. Run npx hardhat compile first.')
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

    console.log(`Deploying DailyGiftVRF...`)
    console.log(`- Coordinator: ${VRF_COORDINATOR}`)
    console.log(`- Token: ${USDC_ADDRESS}`)
    console.log(`- Signer: ${account.address}`)
    console.log(`- SubId: ${subId}`)

    // Deploy
    const hash = await client.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [
            VRF_COORDINATOR,
            USDC_ADDRESS,
            account.address, // Signer (default to deployer)
            subId,
            KEY_HASH,
            MIN_AMOUNT,
            MAX_AMOUNT
        ]
    })

    console.log(`Transaction Hash: ${hash}`)

    // We need a public client to wait for receipt
    const { createPublicClient } = await import('viem');
    const publicClient = createPublicClient({
        chain: base,
        transport: http()
    })

    console.log('Waiting for confirmation...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    if (receipt.contractAddress) {
        console.log(`\n✅ Deployed DailyGiftVRF to: ${receipt.contractAddress}\n`)
        console.log(`NEXT STEPS:`)
        console.log(`1. Add consumer ${receipt.contractAddress} to VRF Subscription ${subId}`)
        console.log(`2. Send USDC to ${receipt.contractAddress}`)
        console.log(`3. Send LINK to ${receipt.contractAddress} (if using direct funding)`)
        console.log(`4. Update NEXT_PUBLIC_DAILY_GIFT_CONTRACT in .env`)
    } else {
        console.error('Deployment failed or contract address missing')
    }
}

main().catch(console.error)
