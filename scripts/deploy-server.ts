
import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

config()

// --- Config ---
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

async function main() {
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
    const signerKey = process.env.DAILY_GIFT_SIGNER_PRIVATE_KEY as `0x${string}`

    if (!privateKey || !signerKey) {
        throw new Error('Missing env vars: DEPLOYER_PRIVATE_KEY or DAILY_GIFT_SIGNER_PRIVATE_KEY')
    }

    const account = privateKeyToAccount(privateKey)
    const signerAccount = privateKeyToAccount(signerKey) // Using the signer public address for contract

    const client = createWalletClient({
        account,
        chain: base,
        transport: http()
    }).extend(publicActions)

    // Load Artifacts
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/DailyGift.sol/DailyGift.json')
    if (!fs.existsSync(artifactPath)) {
        throw new Error('Artifact not found. Run npx hardhat compile first.')
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

    console.log(`Deploying DailyGift (Server Mode)...`)
    console.log(`- Token: ${USDC_ADDRESS}`)
    console.log(`- Signer: ${signerAccount.address}`)
    console.log(`- Owner: ${account.address}`)

    // Deploy
    const hash = await client.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        args: [
            USDC_ADDRESS
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
        console.log(`\n✅ Deployed DailyGift to: ${receipt.contractAddress}\n`)
        console.log(`NEXT STEPS:`)
        console.log(`1. Send USDC to ${receipt.contractAddress}`)
        console.log(`2. Update NEXT_PUBLIC_DAILY_GIFT_CONTRACT in .env`)
    } else {
        console.error('Deployment failed or contract address missing')
    }
}

main().catch(console.error)
