
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { createPublicClient, createWalletClient, http, decodeEventLog, parseAbiItem } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { dailyGiftAbi } from "@/lib/dailyGiftAbi";

// Keys
const SIGNER_PRIVATE_KEY = process.env.DAILY_GIFT_SIGNER_PRIVATE_KEY as `0x${string}`;
const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_HTTPS_IN_URL || 'https://mainnet.base.org'; // Use explicit RPC if available

// Setup Clients
const account = privateKeyToAccount(SIGNER_PRIVATE_KEY);

const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
});

const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
});

export async function POST(request: NextRequest) {
    // 1. Auth Check
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        const { txHash, recipientAddress } = await request.json();

        if (!txHash || !recipientAddress) {
            return NextResponse.json({ message: "Missing txHash or recipient" }, { status: 400 });
        }

        console.log(`Reveal requested for FID: ${fid}, Tx: ${txHash}`);

        // 2. Verify Transaction on Chain
        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash as `0x${string}`,
            timeout: 60_000 // 60s timeout
        });

        if (receipt.status !== 'success') {
            return NextResponse.json({ message: "Transaction failed" }, { status: 400 });
        }

        // Verify Event Emitted: Played(fid, player, timestamp)
        // We need to parse logs to be sure it was THIS contract and THIS event
        let playedEventFound = false;

        for (const log of receipt.logs) {
            try {
                if (log.address.toLowerCase() === DAILY_GIFT_CONTRACT.toLowerCase()) {
                    const parsedLog = decodeEventLog({
                        abi: dailyGiftAbi,
                        data: log.data,
                        topics: log.topics
                    });

                    if (parsedLog.eventName === 'Played') {
                        // Optional: Check if args match fid/sender
                        // @ts-ignore
                        const eventFid = parsedLog.args.fid;
                        // @ts-ignore
                        const eventPlayer = parsedLog.args.player;

                        if (String(eventFid) === String(fid) && eventPlayer.toLowerCase() === recipientAddress.toLowerCase()) {
                            playedEventFound = true;
                            break;
                        }
                    }
                }
            } catch (e) {
                // Ignore logs that don't match ABI
            }
        }

        if (!playedEventFound) {
            return NextResponse.json({ message: "Invalid transaction: Played event not found or mismatch" }, { status: 400 });
        }

        // 3. Generate Random Prize
        const MIN_AMOUNT = 1000;
        const MAX_AMOUNT = 1000000;
        const amount = Math.floor(Math.random() * (MAX_AMOUNT - MIN_AMOUNT + 1)) + MIN_AMOUNT;

        console.log(`- Sending Payout: ${amount} to ${recipientAddress}`);

        // 4. Send Payout (Server Transaction)
        // We act as Owner calling payout()
        const hash = await walletClient.writeContract({
            address: DAILY_GIFT_CONTRACT,
            abi: dailyGiftAbi,
            functionName: 'payout',
            args: [BigInt(fid), recipientAddress as `0x${string}`, BigInt(amount)]
        });

        console.log(`- Payout Tx: ${hash}`);

        // Optional: Wait for payout confirmation? Or just return success and let UI poll/wait?
        // Returning success immediately makes UI snappy (it shows "You Logged Win", actual funds arrive soon)
        // But users might check balance immediately.
        // Let's return the hash and amount.

        return NextResponse.json({
            success: true,
            amount: amount,
            payoutTxHash: hash
        });

    } catch (error: any) {
        console.error("Reveal Error:", error);

        // Handle "insufficient funds" explicitly
        if (error.message && error.message.includes("Insufficient funds")) {
            return NextResponse.json({ message: "Server wallet out of funds. Contact support." }, { status: 500 });
        }

        return NextResponse.json(
            { message: "Detailed Error", error: error.message || String(error) },
            { status: 500 }
        );
    }
}
