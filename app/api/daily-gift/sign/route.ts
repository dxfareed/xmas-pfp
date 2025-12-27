import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked } from "viem";
import { base } from "viem/chains";
import { NeynarAPIClient, Configuration } from "@neynar/nodejs-sdk";

// Signer private key - MUST be the same address set in the DailyGift contract
const SIGNER_PRIVATE_KEY = process.env.DAILY_GIFT_SIGNER_PRIVATE_KEY as `0x${string}`;
const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

// Signature validity period (5 minutes)
const SIGNATURE_VALIDITY_SECONDS = 5 * 60;

export async function POST(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        const { recipientAddress } = await request.json();

        if (!recipientAddress) {
            return NextResponse.json({ message: "Missing recipient address" }, { status: 400 });
        }

        if (!SIGNER_PRIVATE_KEY) {
            console.error("DAILY_GIFT_SIGNER_PRIVATE_KEY not set");
            return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
        }

        if (!DAILY_GIFT_CONTRACT) {
            console.error("NEXT_PUBLIC_DAILY_GIFT_CONTRACT not set");
            return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
        }

        // Verify Neynar Score
        const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
        if (!NEYNAR_API_KEY) {
            console.error("NEYNAR_API_KEY not set");
            return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
        }

        const neynarClient = new NeynarAPIClient(
            new Configuration({
                apiKey: NEYNAR_API_KEY,
            })
        );

        const user = await neynarClient.fetchBulkUsers({
            fids: [Number(fid)],
        });
        const neynarScore = user.users[0]?.score;

        if (neynarScore !== undefined && neynarScore <= 0.2) {
            return NextResponse.json(
                { message: "Neynar score too low to claim." },
                { status: 403 }
            );
        }

        // Create the signer account
        const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);

        // Calculate deadline (current time + validity period)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS);

        // Create the message hash
        // Must match contract: keccak256(abi.encodePacked(fid, recipient, deadline, chainId, contractAddress))
        const messageHash = keccak256(
            encodePacked(
                ["uint256", "address", "uint256", "uint256", "address"],
                [
                    BigInt(fid),
                    recipientAddress as `0x${string}`,
                    deadline,
                    BigInt(base.id),  // Chain ID (Base mainnet = 8453)
                    DAILY_GIFT_CONTRACT
                ]
            )
        );

        // Sign the message (this produces an EIP-191 signed message)
        const signature = await account.signMessage({
            message: { raw: messageHash as `0x${string}` },
        });

        return NextResponse.json({
            success: true,
            fid: fid,
            recipient: recipientAddress,
            deadline: deadline.toString(),
            signature: signature,
        });
    } catch (error) {
        console.error("Error signing claim:", error);
        return NextResponse.json(
            { message: "Failed to sign claim" },
            { status: 500 }
        );
    }
}
