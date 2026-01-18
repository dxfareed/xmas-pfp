'use client';

import { useEffect, useState } from 'react';
import styles from './DailyGiftCard.module.css';

const MOCK_WINNERS = [
    { user: 'dwr.eth', amount: '0.5 ETH', action: 'won' },
    { user: 'vitalik.eth', amount: '1.0 ETH', action: 'won' },
    { user: 'pwe.eth', amount: '0.005 ETH', action: 'won' },
    { user: 'jessie.eth', amount: '0.1 ETH', action: 'won' },
    { user: 'horsefacts', amount: '0.2 ETH', action: 'won' },
    { user: 'linda', amount: '0.01 ETH', action: 'won' },
    { user: 'base.eth', amount: '5000 USDC', action: 'won' },
];

export default function LiveWinnersMarquee() {
    // Simple CSS animation marquee
    return (
        <div style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            background: '#0a0a0a',
            color: '#39FF14',
            borderTop: '1px solid #39FF14',
            borderBottom: '1px solid #39FF14',
            padding: '0.5rem 0',
            fontSize: '0.9rem',
            fontFamily: '"Courier New", monospace', // Typewriter / Terminal vibe
            textTransform: 'uppercase',
            position: 'relative',
            width: '100%'
        }}>
            <div style={{
                display: 'inline-block',
                animation: 'marquee 20s linear infinite',
            }}>
                {MOCK_WINNERS.map((w, i) => (
                    <span key={i} style={{ marginRight: '2rem' }}>
                        🎟️ <strong style={{ color: '#fff' }}>@{w.user}</strong> {w.action} <span style={{ color: '#FFD700' }}>{w.amount}</span>
                    </span>
                ))}
                {/* Duplicate for seamless loop */}
                {MOCK_WINNERS.map((w, i) => (
                    <span key={`dup-${i}`} style={{ marginRight: '2rem' }}>
                        🎟️ <strong style={{ color: '#fff' }}>@{w.user}</strong> {w.action} <span style={{ color: '#FFD700' }}>{w.amount}</span>
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
