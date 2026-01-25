import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { base } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

if (!DAILY_GIFT_CONTRACT) {
    console.error("❌ Error: NEXT_PUBLIC_DAILY_GIFT_CONTRACT is not defined in .env");
    process.exit(1);
}

const client = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_HTTPS_IN_URL),
});

async function main() {
    console.log("🔍 Checking Balances...");
    console.log(`- Contract: ${DAILY_GIFT_CONTRACT}`);
    console.log(`- USDC Token: ${USDC_ADDRESS}`);

    try {
        // 1. Check ETH Balance
        const ethBalance = await client.getBalance({ address: DAILY_GIFT_CONTRACT as `0x${string}` });
        console.log(`\n💰 ETH Balance: ${formatUnits(ethBalance, 18)} ETH`);

        // 2. Check USDC Balance
        const abi = parseAbi([
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ]);

        const usdcBalance = await client.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: abi,
            functionName: "balanceOf",
            args: [DAILY_GIFT_CONTRACT as `0x${string}`],
        });

        const decimals = await client.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: abi,
            functionName: "decimals",
        })

        console.log(`💰 USDC Balance: ${formatUnits(usdcBalance, decimals)} USDC`);

        if (usdcBalance === 0n) {
            console.warn("\n⚠️  WARNING: Contract has 0 USDC. The Pot shows 0 because it IS empty.");
            console.warn("👉 Send USDC to:", DAILY_GIFT_CONTRACT);
        } else {
            console.log("\n✅ Contract is funded.");
        }

    } catch (error) {
        console.error("❌ Error fetching balances:", error);
    }
}

main();
