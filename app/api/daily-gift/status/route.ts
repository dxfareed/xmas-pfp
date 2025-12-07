import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { dailyGiftAbi } from "@/lib/dailyGiftAbi";

const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

const publicClient = createPublicClient({
    chain: base,
    transport: http(),
});

export async function GET(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        if (!DAILY_GIFT_CONTRACT) {
            return NextResponse.json({ message: "Contract not configured" }, { status: 500 });
        }

        // Check if user can claim
        const canClaim = await publicClient.readContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: "canClaim",
            args: [BigInt(fid)],
        });

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

        return NextResponse.json({
            fid: fid,
            canClaim: canClaim,
            timeUntilNextClaim: Number(timeUntilNextClaim),
            dailyAmount: dailyAmount.toString(),
        });
    } catch (error) {
        console.error("Error checking claim status:", error);
        return NextResponse.json(
            { message: "Failed to check claim status" },
            { status: 500 }
        );
    }
}
