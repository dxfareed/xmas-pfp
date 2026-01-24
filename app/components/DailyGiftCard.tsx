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
    onClaim: () => Promise<void>;
    isClaiming: boolean;
    tokenSymbol: string;
    username?: string | null;
    pfpUrl?: string | null;
    revealedAmount?: string | null; // Async reveal amount
}

export default function DailyGiftCard({
    onClaim,
    isClaiming,
    tokenSymbol,
    username,
    pfpUrl,
    revealedAmount
}: DailyGiftCardProps) {
    const [state, setState] = useState<GiftState>('READY');
    const [rewardAmount, setRewardAmount] = useState<string>('0');
    const [showConfetti, setShowConfetti] = useState(false);

    // Sync external props to internal state
    useEffect(() => {
        if (state === 'REVEALED') return; // Don't auto-reset if revealed, let user click "Play Again"

        if (revealedAmount && revealedAmount !== '0') {
            // Async reveal finished!
            setRewardAmount(revealedAmount);
            setState('REVEALED');
            setShowConfetti(true);
        } else if (isClaiming) {
            setState('REQUESTING');
        } else if (state !== 'OPENING' && state !== 'WAITING_VRF' && state !== 'REQUESTING') {
            setState('READY'); // Always ready (Casino Mode)
        }
    }, [isClaiming, state, revealedAmount]);

    const handleOpen = async () => {
        if (state !== 'READY') return;

        try {
            await onClaim();
            // We wait for parent to update 'revealedAmount' via props
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
