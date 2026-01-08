import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPublicClient, http, erc20Abi } from "viem";
import { base } from "viem/chains";
import { dailyGiftAbi } from "@/lib/dailyGiftAbi";

const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_HTTPS_IN_URL || 'https://mainnet.base.org';

const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
});

export async function GET(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        console.log("Checking gift status for FID:", fid);
        console.log("Contract Address:", DAILY_GIFT_CONTRACT);

        if (!DAILY_GIFT_CONTRACT) {
            console.error("DAILY_GIFT_CONTRACT is not defined");
            return NextResponse.json({ message: "Contract not configured" }, { status: 500 });
        }

        // Check if user can claim
        console.log("Reading canClaim...");
        const canClaim = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "canClaim",
            args: [BigInt(fid)],
        });
        console.log("canClaim result:", canClaim);

        // Get time until next claim
        const timeUntilNextClaim = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "timeUntilNextClaim",
            args: [BigInt(fid)],
        });

        // Get daily amount
        const dailyAmount = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "dailyAmount",
        });

        // Get claim interval
        const claimInterval = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "claimInterval",
        });

        // Get token address
        const tokenAddress = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "token",
        });

        // Check contract balance
        const contractBalance = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "getBalance",
        });

        // Get Token Details (Symbol & Decimals)
        let tokenSymbol = 'TOKEN';
        let tokenDecimals = 18;

        try {
            if (tokenAddress) {
                const [symbol, decimals] = await Promise.all([
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'symbol'
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'decimals'
                    })
                ]);
                tokenSymbol = symbol;
                tokenDecimals = decimals;
            }
        } catch (e) {
            console.error("Failed to fetch token details:", e);
        }

        const hasSufficientBalance = BigInt(contractBalance as bigint) >= BigInt(dailyAmount as bigint);

        return NextResponse.json({
            fid: fid,
            canClaim: canClaim,
            timeUntilNextClaim: Number(timeUntilNextClaim),
            dailyAmount: dailyAmount.toString(),
            tokenAddress: tokenAddress,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals,
            claimInterval: Number(claimInterval),
            hasSufficientBalance: hasSufficientBalance,
        });
    } catch (error: any) {
        console.error("Error checking claim status. Full error:", error);
        return NextResponse.json(
            { message: "Failed to check claim status", error: error.message || String(error) },
            { status: 500 }
        );
    }
}
