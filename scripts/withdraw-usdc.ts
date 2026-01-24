
import { createWalletClient, createPublicClient, http, erc20Abi, formatUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

config()


const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const CONTRACT_ADDRESS = "0xee8a4d91935001fb3ab3700deecc16530b1fc3b3";

async function main() {
    if (!CONTRACT_ADDRESS) {
        throw new Error('Missing CONTRACT_ADDRESS env var or arg')
    }

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
    if (!privateKey) {
        throw new Error('Missing DEPLOYER_PRIVATE_KEY env var')
    }

    const account = privateKeyToAccount(privateKey)

    // Clients
    const publicClient = createPublicClient({
        chain: base,
        transport: http()
    })

    const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http()
    })

    console.log(`\n🏦 Withdrawing USDC from: ${CONTRACT_ADDRESS}`)
    console.log(`Owner: ${account.address}`)

    // 1. Check USDC Balance
    const usdcBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [CONTRACT_ADDRESS as `0x${string}`]
    })
    console.log(`Contract USDC Balance: ${formatUnits(usdcBalance, 6)} USDC`)

    // 2. Check ETH Balance
    const ethBalance = await publicClient.getBalance({ address: CONTRACT_ADDRESS as `0x${string}` })
    console.log(`Contract ETH Balance: ${formatUnits(ethBalance, 18)} ETH`)

    if (usdcBalance === 0n && ethBalance === 0n) {
        console.log("Empty balance. Nothing to withdraw.")
        return
    }

    // 3. Load ABI
    const artifactPath = path.join(process.cwd(), 'artifacts/contracts/DailyGiftVRF.sol/DailyGiftVRF.json')
    if (!fs.existsSync(artifactPath)) {
        throw new Error('Artifact not found. Run npx hardhat compile first.')
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

    // 4. Withdraw Logic
    console.log("Initiating withdrawal...")

    // Get gas price and bump it
    const feeData = await publicClient.estimateFeesPerGas()
    const maxFeePerGas = feeData.maxFeePerGas ? (feeData.maxFeePerGas * 150n) / 100n : undefined
    const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ? (feeData.maxPriorityFeePerGas * 150n) / 100n : undefined
    console.log(`Using aggressive gas: MaxFee=${maxFeePerGas ? formatUnits(maxFeePerGas, 9) : 'auto'} Gwei`)

    // Withdraw USDC
    if (usdcBalance > 0n) {
        console.log("Withdrawing USDC...")
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: artifact.abi,
            functionName: 'withdrawToken',
            args: [USDC_ADDRESS, usdcBalance],
            maxFeePerGas,
            maxPriorityFeePerGas
        })
        console.log(`USDC TX Hash: ${hash}`)
        await publicClient.waitForTransactionReceipt({ hash })
        console.log("✅ USDC Withdrawal successful!")
    }

    // Withdraw ETH
    if (ethBalance > 0n) {
        console.log("Withdrawing ETH...")
        const hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: artifact.abi,
            functionName: 'withdrawETH',
            args: [],
            maxFeePerGas,
            maxPriorityFeePerGas
        })
        console.log(`ETH TX Hash: ${hash}`)
        await publicClient.waitForTransactionReceipt({ hash })
        console.log("✅ ETH Withdrawal successful!")
    }
}

main().catch(console.error)
