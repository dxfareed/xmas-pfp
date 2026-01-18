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
}

export default function DailyGiftCard({
    onClaim,
    isClaiming,
    tokenSymbol,
    username,
    pfpUrl
}: DailyGiftCardProps) {
    const [state, setState] = useState<GiftState>('LOCKED');
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
        if (state !== 'READY' && state !== 'REVEALED') return; // Allow retry from REVEALED if needed, but better to have explicit button

        // ... (rest is same)
        // Note: For Casino mode, "Play Again" just resets to READY then calls handleOpen? 
        // Or simpler: Play Again button just calls handleReset which sets READY.
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
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    background: 'rgba(57, 255, 20, 0.1)',
                    padding: '0.5rem',
                    borderRadius: '20px',
                    border: '1px solid #39FF14'
                }}>
                    {pfpUrl && (
                        <img
                            src={pfpUrl}
                            alt={username}
                            style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                border: '1px solid #fff'
                            }}
                        />
                    )}
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        @{username}
                    </span>
                    <span style={{
                        fontSize: '0.7rem',
                        background: '#39FF14',
                        color: '#000',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: '900'
                    }}>
                        VERIFIED
                    </span>
                </div>
            )}

            {/* Status Badge */}
            <div className={`
                ${styles.badge} 
                ${styles.ready}
            `}>
                CASINO MODE
            </div>

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
                        <div style={{
                            background: '#000',
                            padding: '2rem',
                            borderRadius: '1rem',
                            border: '2px solid #39FF14',
                            boxShadow: '0 0 10px #39FF14'
                        }}>
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
                    <Loader2 className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Signing...
                </button>
            ) : state === 'WAITING_VRF' ? (
                <button className={styles.actionButton} disabled>
                    <Loader2 className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
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
