'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { dailyGiftAbi } from '../../lib/dailyGiftAbi';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

interface Winner {
    user: string;
    amount: string;
    action: 'pulled';
    txHash: string;
}

export default function LiveWinnersMarquee() {
    const [winners, setWinners] = useState<Winner[]>([]);

    useEffect(() => {
        const fetchWinners = async () => {
            try {
                const client = createPublicClient({
                    chain: base,
                    transport: http()
                });

                // Get current block number to define a safe range
                const currentBlock = await client.getBlockNumber();
                const fromBlock = currentBlock - 3000n; // Last ~1.5 hours on Base (2s blocks)

                const recentLogs = await client.getContractEvents({
                    address: CONTRACT_ADDRESS,
                    abi: dailyGiftAbi,
                    eventName: 'Payout',
                    fromBlock: fromBlock,
                    toBlock: 'latest'
                });

                // Process logs (Newest first)
                const processed = recentLogs.reverse().slice(0, 20).map(log => {
                    const args = log.args as any;
                    // ABI defines 'player', but solidity might emit 'user' depending on interpretation.
                    // Safe access:
                    const userAddress = args.player || args.user || "0x0000000000000000000000000000000000000000";
                    const amountUSDC = args.amount ? formatUnits(args.amount, 6) : "0";

                    return {
                        user: userAddress,
                        amount: `${parseFloat(amountUSDC).toFixed(2)} USDC`,
                        action: 'pulled',
                        txHash: log.transactionHash
                    } as Winner;
                });

                setWinners(processed);

            } catch (e) {
                console.error("Failed to fetch winners:", e);
                // Fallback to empty or keep existing
            }
        };

        fetchWinners();

        // Poll every 30s
        const interval = setInterval(fetchWinners, 30000);
        return () => clearInterval(interval);
    }, []);

    if (winners.length === 0) return null; // Hide if no data

    return (
        <div style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            background: '#2B0E1E', // Very dark pink/purple
            color: '#FF69B4', // Hot Pink
            borderTop: '1px solid #FF004D',
            borderBottom: '1px solid #FF004D',
            padding: '0.5rem 0',
            fontSize: '0.9rem',
            fontFamily: '"Courier New", monospace',
            textTransform: 'uppercase',
            position: 'relative',
            width: '100%'
        }}>
            <div style={{
                display: 'inline-block',
                animation: 'marquee 40s linear infinite',
            }}>
                {winners.map((w, i) => (
                    <span key={w.txHash + i} style={{ marginRight: '2rem' }}>
                        💘 <strong style={{ color: '#FFF' }}>{w.user.substring(0, 6)}...</strong> {w.action} <span style={{ color: '#FFD700' }}>{w.amount}</span> 💘
                    </span>
                ))}
                {/* Duplicate for seamless loop */}
                {winners.map((w, i) => (
                    <span key={`dup-${w.txHash + i}`} style={{ marginRight: '2rem' }}>
                        💘 <strong style={{ color: '#FFF' }}>{w.user.substring(0, 6)}...</strong> {w.action} <span style={{ color: '#FFD700' }}>{w.amount}</span> 💘
                    </span>
                ))}
            </div>
            <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
        </div>
    );
}
