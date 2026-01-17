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
    canClaim: boolean;
    timeUntilNextClaim: number;
    onClaim: () => Promise<void>;
    isClaiming: boolean;
    tokenSymbol: string;
    onComplete: () => void; // Called when countdown finishes
}

export default function DailyGiftCard({
    canClaim,
    timeUntilNextClaim,
    onClaim,
    isClaiming,
    tokenSymbol,
    onComplete
}: DailyGiftCardProps) {
    const [state, setState] = useState<GiftState>('LOCKED');
    const [rewardAmount, setRewardAmount] = useState<string>('0');
    const [showConfetti, setShowConfetti] = useState(false);

    // Sync external props to internal state
    useEffect(() => {
        if (isClaiming) {
            setState('REQUESTING');
        } else if (canClaim && state !== 'REVEALED' && state !== 'OPENING' && state !== 'WAITING_VRF') {
            setState('READY');
        } else if (!canClaim && state !== 'REVEALED' && state !== 'OPENING' && state !== 'WAITING_VRF') {
            setState('LOCKED');
        }
    }, [isClaiming, canClaim, state]);

    const handleOpen = async () => {
        if (state !== 'READY') return;

        // 1. Trigger Claim Transaction
        try {
            await onClaim();
            // Note: onClaim is the EIP-5792 call. 
            // In a real VRF scenario, we'd wait for the Event here.

            // SIMULATING VRF DELAY FOR UX DEMO
            setState('WAITING_VRF');

            setTimeout(() => {
                setState('OPENING');
                // Play Sound?

                setTimeout(() => {
                    // Reveal Random Amount (Mock)
                    const randomVal = (Math.random() * (1 - 0.001) + 0.001).toFixed(4);
                    setRewardAmount(randomVal);
                    setState('REVEALED');
                    setShowConfetti(true);

                    // Hide confetti after 5s
                    setTimeout(() => setShowConfetti(false), 5000);
                }, 1500); // Opening animation duration
            }, 3000); // VRF Wait duration

        } catch (e) {
            console.error("Claim failed", e);
            setState('READY'); // Reset on failure
        }
    };

    return (
        <div className={styles.card}>
            {showConfetti && <Confetti numberOfPieces={200} recycle={false} />}

            {/* Status Badge */}
            <div className={`
                ${styles.badge} 
                ${state === 'READY' ? styles.ready : styles.locked}
            `}>
                {state === 'READY' ? 'READY TO CLAIM' :
                    state === 'LOCKED' ? 'COOLDOWN' : 'IN PROGRESS'}
            </div>

            <h2 className={styles.title}>Daily Mystery Box</h2>
            <p className={styles.subtitle}>
                {state === 'LOCKED' ? 'Come back later for your gift!' : 'What will you get today?'}
            </p>

            {/* Main Visual Area */}
            <div className={styles.boxContainer}>
                {state === 'REVEALED' ? (
                    <div className={styles.revealContainer}>
                        <div className={styles.amount}>
                            {rewardAmount} <span className={styles.token}>{tokenSymbol || 'USDC'}</span>
                        </div>
                        <Sparkles size={48} color="#FFD700" />
                    </div>
                ) : (
                    <div className={`
                        ${styles.giftImage} 
                        ${state === 'OPENING' || state === 'WAITING_VRF' ? styles.shaking : styles.floating}
                    `}>
                        {/* Replace with actual 3D Image if available, using Icon for now */}
                        <div style={{
                            background: '#D42426',
                            padding: '2rem',
                            borderRadius: '1rem',
                            border: '4px solid #000',
                            boxShadow: '4px 4px 0 #000'
                        }}>
                            <Gift size={64} color="#FFF" />
                        </div>
                    </div>
                )}
            </div>

            {/* Action Area */}
            {state === 'LOCKED' ? (
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Next Box In:</p>
                    <Countdown seconds={timeUntilNextClaim} onComplete={onComplete} />
                </div>
            ) : state === 'READY' ? (
                <button className={styles.actionButton} onClick={handleOpen}>
                    OPEN BOX
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
                <button className={styles.actionButton} onClick={() => setState('LOCKED')}>
                    COME BACK TOMORROW
                </button>
            )}
        </div>
    );
}
