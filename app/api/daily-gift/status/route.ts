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

        if (!DAILY_GIFT_CONTRACT) {
            console.error("DAILY_GIFT_CONTRACT is not defined");
            return NextResponse.json({ message: "Contract not configured" }, { status: 500 });
        }

        // --- Unlimited Casino Mode ---
        // Always allow claim, no cooldowns, no daily limit checks here (handled by entry fee/rng)

        const canClaim = true;
        const timeUntilNextClaim = 0;
        const claimInterval = 0;
        const dailyAmount = "0"; // Varies per spin

        // Get token address from contract
        let tokenAddress: `0x${string}` | undefined;
        try {
            tokenAddress = await publicClient.readContract({
                address: DAILY_GIFT_CONTRACT,
                abi: dailyGiftAbi,
                functionName: "token",
            }) as `0x${string}`;
        } catch (e) {
            console.error("Failed to read token address:", e);
        }

        // Get Token Details & Balance
        let tokenSymbol = 'TOKEN';
        let tokenDecimals = 18;
        let hasSufficientBalance = true;

        if (tokenAddress) {
            try {
                const [symbol, decimals, balance] = await Promise.all([
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'symbol'
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'decimals'
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'balanceOf',
                        args: [DAILY_GIFT_CONTRACT]
                    })
                ]);
                tokenSymbol = symbol as string;
                tokenDecimals = Number(decimals);
                // Just check if contract has ANY tokens to pay out
                //@ts-ignore
                hasSufficientBalance = (balance as bigint) > 0n;
            } catch (e) {
                console.error("Failed to fetch token details:", e);
            }
        }

        return NextResponse.json({
            fid: fid,
            canClaim: canClaim,
            timeUntilNextClaim: timeUntilNextClaim,
            dailyAmount: dailyAmount,
            tokenAddress: tokenAddress,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals,
            claimInterval: claimInterval,
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
