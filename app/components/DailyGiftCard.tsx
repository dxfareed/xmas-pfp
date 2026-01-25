'use client';
import { useState, useEffect } from 'react';
import styles from './DailyGiftCard.module.css';
import { Gift, Loader2, Sparkles, Heart } from 'lucide-react';
import Confetti from 'react-confetti';

// Types
type GiftState = 'LOCKED' | 'READY' | 'REQUESTING' | 'WAITING_VRF' | 'OPENING' | 'REVEALED';

interface DailyGiftCardProps {
    onClaim: () => Promise<void>;
    isClaiming: boolean;
    tokenSymbol: string;
    username?: string | null;
    pfpUrl?: string | null;
    revealedAmount?: string | null;
    potBalance?: string; // New Prop
}

export default function DailyGiftCard({
    onClaim,
    isClaiming,
    tokenSymbol,
    username,
    pfpUrl,
    revealedAmount,
    potBalance
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

            <h2 className={styles.title}>Daily Love Pot 💘</h2>
            <p className={styles.subtitle}>
                DIP FOR LOVE • 0.0001 ETH
            </p>
            {/* Show Pot Balance */}
            {potBalance && (
                <div className={styles.potBalance}>
                    🏆 Pot Size: {potBalance} USDC
                </div>
            )}

            {/* Main Visual Area */}
            <div className={styles.boxContainer} onClick={state === 'READY' ? handleOpen : undefined}>
                {state === 'REVEALED' ? (
                    <div className={styles.revealContainer}>
                        <div className={styles.amount}>
                            {rewardAmount} <span className={styles.token}>{tokenSymbol || 'USDC'}</span>
                        </div>
                        <Sparkles size={48} color="#FF004D" />
                    </div>
                ) : (
                    <div className={`
                        ${styles.giftImage} 
                        ${state === 'OPENING' || state === 'WAITING_VRF' ? styles.shaking : styles.floating}
                    `}>
                        <div className={styles.giftBoxInner}>
                            <Heart size={80} color="#FF004D" fill="#FF004D" />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Area */}
            {state === 'READY' ? (
                <button className={styles.actionButton} onClick={handleOpen}>
                    DIP IN THE POT
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
