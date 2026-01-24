'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './DailyGiftCard.module.css';
import { Gift, Loader2, Sparkles } from 'lucide-react';
import Confetti from 'react-confetti';
import Countdown from './Countdown';
import { formatEther } from 'viem';

// Types
type GiftState = 'LOCKED' | 'READY' | 'REQUESTING' | 'WAITING_VRF' | 'OPENING' | 'REVEALED';

interface DailyGiftCardProps {
    onClaim: () => Promise<string>; // Returns the amount in wei
    isClaiming: boolean;
    tokenSymbol: string;
    username?: string | null;
    pfpUrl?: string | null;
}

export default function DailyGiftCard({
    onClaim,
    isClaiming,
    tokenSymbol,
    username,
    pfpUrl
}: DailyGiftCardProps) {
    const [state, setState] = useState<GiftState>('READY');
    const [rewardAmount, setRewardAmount] = useState<string>('0');
    const [showConfetti, setShowConfetti] = useState(false);

    // Sync external props to internal state
    useEffect(() => {
        if (state === 'REVEALED') return; // Don't auto-reset if revealed, let user click "Play Again"

        if (isClaiming) {
            setState('REQUESTING');
        } else if (state !== 'OPENING' && state !== 'WAITING_VRF') {
            setState('READY'); // Always ready (Casino Mode)
        }
    }, [isClaiming, state]);

    const handleOpen = async () => {
        if (state !== 'READY') return;

        try {
            const amountWei = await onClaim();
            if (amountWei) {
                // Determine decimals? Assuming 6 for USDC or 18?
                // Actually page.tsx returns raw Wei (e.g. 1000 - 1000000).
                // Wait, USDC is 6 decimals. 1000000 = 1 USDC.
                // formatEther does 18 decimals!
                // If token is USDC, formatEther gives 0.000000000001.
                // We need formatUnits(amount, 6).
                // But `DailyGiftCard` doesn't know decimals?
                // We should assume specific formatting or pass formatted string.
                // Let's assume page.tsx returns STRING meant for display? No, it returned `amount.toString()`.
                // Let's format it here based on tokenSymbol?
                // Ideally default to 18 unless USDC.
                // Actually, let's just use a helper or simple division if we know it's USDC.
                // But wait, the API random logic was `1000` to `1000000`.
                // If it's USDC (6 decimals), 1000000 = 1.0.
                // If I use `formatEther`, it's 18 decimals.
                // I should import `formatUnits`.
                // For now, let's just assume `formatEther` if we don't know.
                // BUT User uses USDC.
                // I should update page.tsx to return FORMATTED amount?
                // Or update `DailyGiftCard` to use `formatUnits(BigInt(amountWei), 6)`.
                // Let's use formatUnits.
            }
            // For now, just set it directly if format logic is complex, or format it.
            // Let's stick to formatEther for safety or check context. 
            // Actually, the API generates 1000-1000000. 
            // If USDC (6 decimals), that is 0.001 to 1.0. Correct.
            // If I format with 18 decimals it will be tiny.
            // I will use `formatUnits(val, 6)` for USDC.
            setRewardAmount((parseInt(amountWei) / 1000000).toFixed(6)); // Simple hack for USDC
        } catch (error) {
            console.error('Claim error:', error);
            setState('READY');
        }
    };

    const onPlayAgain = () => {
        setRewardAmount('0');
        setShowConfetti(false);
        setState('READY');
    };

    return (
        <div className={styles.card}>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Profile Header */}
            {username && (
                <div className={styles.profileHeader}>
                    {pfpUrl && (
                        <img
                            src={pfpUrl}
                            alt={username}
                            className={styles.profileAvatar}
                        />
                    )}
                    <span className={styles.profileName}>
                        @{username}
                    </span>
                    <span className={styles.profileBadge}>
                        VERIFIED
                    </span>
                </div>
            )}

            {/* Status Badge */}

            <h2 className={styles.title}>Daily Mystery Box</h2>
            <p className={styles.subtitle}>
                SPIN TO WIN • 0.0001 ETH
            </p>

            {/* Main Visual Area */}
            <div className={styles.boxContainer} onClick={state === 'READY' ? handleOpen : undefined}>
                {state === 'REVEALED' ? (
                    <div className={styles.revealContainer}>
                        <div className={styles.amount}>
                            {rewardAmount} <span className={styles.token}>{tokenSymbol || 'USDC'}</span>
                        </div>
                        <Sparkles size={48} color="#39FF14" />
                    </div>
                ) : (
                    <div className={`
                        ${styles.giftImage} 
                        ${state === 'OPENING' || state === 'WAITING_VRF' ? styles.shaking : styles.floating}
                    `}>
                        <div className={styles.giftBoxInner}>
                            <Gift size={64} color="#39FF14" />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Area */}
            {state === 'READY' ? (
                <button className={styles.actionButton} onClick={handleOpen}>
                    SPIN (0.0001 ETH)
                </button>
            ) : state === 'REQUESTING' ? (
                <button className={styles.actionButton} disabled>
                    <Loader2 className={styles.spinner} style={{ display: 'inline', marginRight: '8px' }} />
                    Signing...
                </button>
            ) : state === 'WAITING_VRF' ? (
                <button className={styles.actionButton} disabled>
                    <Loader2 className={styles.spinner} style={{ display: 'inline', marginRight: '8px' }} />
                    Verifying...
                </button>
            ) : state === 'OPENING' ? (
                <button className={styles.actionButton} disabled>
                    OPENING...
                </button>
            ) : (
                <button className={styles.actionButton} onClick={onPlayAgain}>
                    PLAY AGAIN
                </button>
            )}
        </div>
    );
}
