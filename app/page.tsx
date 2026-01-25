"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient, useReadContract } from 'wagmi';
import { useSendCalls, useCallsStatus } from 'wagmi/experimental';
import { sdk } from '@farcaster/miniapp-sdk';
import Loader from "./components/Loader";
import { Gift } from 'lucide-react';

import { withRetry } from "../lib/retry";
import { xmasAbi } from "../lib/abi";
import { formatEther, parseEther, formatUnits, parseAbi } from "viem";
import { useUser } from "./context/UserContext";
import { dailyGiftAbi } from "../lib/dailyGiftAbi";
import Countdown from "./components/Countdown";
import DailyGiftCard from "./components/DailyGiftCard";
import LiveWinnersMarquee from "./components/LiveWinnersMarquee";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PAY_ADDRESS = process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS as `0x${string}`;
const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

export default function Home() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address, isConnecting } = useAccount();

  const [revealedAmount, setRevealedAmount] = useState<string | null>(null);

  // EIP-5792 Hooks
  const { sendCalls, data: mintCallId, error: mintError, isPending: isMinting, reset: resetMint } = useSendCalls();
  const { data: mintStatus, isLoading: isConfirming, isSuccess: isConfirmed } = useCallsStatus({
    id: mintCallId?.id as string,
    query: {
      enabled: !!mintCallId,
      refetchInterval: (data) => data.state.data?.status === "success" ? false : 1000
    }
  });

  const { fid, pfpUrl, username, isLoading: isUserLoading, isInFarcaster } = useUser();

  const [nftImageUrl, setNftImageUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userRejectedError, setUserRejectedError] = useState(false);

  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [finalIpfsUrl, setFinalIpfsUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAlreadyGenerated, setHasAlreadyGenerated] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [isPreparingMint, setIsPreparingMint] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const santaAudioRef = useRef<HTMLAudioElement | null>(null);

  // Daily Gift State
  const [canClaimGift, setCanClaimGift] = useState(false);
  const [isCheckingGiftStatus, setIsCheckingGiftStatus] = useState(false);
  const [isClaimingGift, setIsClaimingGift] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);
  const [dailyAmount, setDailyAmount] = useState<string>('0');
  const [claimInterval, setClaimInterval] = useState<number>(24);
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true);
  const [tokenPriceData, setTokenPriceData] = useState<{ priceUsd: number; priceChange_h1: number } | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenAddress, setTokenAddress] = useState<string>('');

  const { data: walletClient } = useWalletClient();

  // Love Pot Balance (USDC) - Direct Read
  const USDC_ADDR = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`;

  const { data: usdcBalanceData, error: readError, isLoading: isReadingBalance } = useReadContract({
    address: USDC_ADDR,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [DAILY_GIFT_CONTRACT],
    query: {
      refetchInterval: 5000
    }
  });

  // Format Pot Balance (USDC is 6 decimals)
  const potBalanceDisplay = readError
    ? "ERR"
    : usdcBalanceData
      ? parseFloat(formatUnits(usdcBalanceData, 6)).toFixed(2)
      : '0.00';

  // Daily Gift Claim Transaction (EIP-5792)
  const { sendCalls: sendGiftCalls, data: giftCallId, error: giftError, isPending: isGiftPending, reset: resetGift } = useSendCalls();
  const { data: giftStatus, isLoading: isGiftConfirming, isSuccess: isGiftConfirmed } = useCallsStatus({
    id: giftCallId?.id as string,
    query: {
      enabled: !!giftCallId,
      refetchInterval: (data) => data.state.data?.status === "success" ? false : 1000
    }
  });


  // Check daily gift status
  useEffect(() => {
    const checkGiftStatus = async () => {
      if (!fid) return;
      setIsCheckingGiftStatus(true);
      try {
        await withRetry(async () => {
          const { token } = await sdk.quickAuth.getToken();
          const response = await fetch('/api/daily-gift/status', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `Failed to fetch gift status: ${response.statusText}`);
          }
          const data = await response.json();
          console.log('Gift status:', data);
          setCanClaimGift(data.canClaim);
          setTimeUntilNextClaim(data.timeUntilNextClaim);
          if (data.dailyAmount) {
            setDailyAmount(data.dailyAmount);
          }
          if (data.claimInterval) {
            setClaimInterval(data.claimInterval / 3600); // Convert seconds to hours
          }
          if (data.hasSufficientBalance !== undefined) {
            setHasSufficientBalance(data.hasSufficientBalance);
          }
          if (data.tokenAddress) {
            setTokenAddress(data.tokenAddress);
            if (data.tokenSymbol) setTokenSymbol(data.tokenSymbol);
            if (data.tokenDecimals) setTokenDecimals(data.tokenDecimals);

            try {
              const priceRes = await fetch(`/api/token-price?address=${data.tokenAddress}`);
              if (priceRes.ok) {
                const priceData = await priceRes.json();
                setTokenPriceData(priceData);
              }
            } catch (e) {
              console.error("Failed to fetch price", e);
            }
          }
        }, 3, 1000);
      } catch (error) {
        console.error('Error checking gift status after retries:', error);
      } finally {
        setIsCheckingGiftStatus(false);
      }
    };
    checkGiftStatus();
  }, [fid, giftClaimed]);

  // Handle Reveal after Claim Confirmation
  useEffect(() => {
    if (isGiftConfirmed && !giftClaimed && !revealedAmount) {
      const revealPrize = async () => {
        try {
          const txHash = giftStatus?.receipts?.[0]?.transactionHash;
          if (!txHash) return; // Wait for receipt

          const { token } = await sdk.quickAuth.getToken();
          const response = await fetch('/api/daily-gift/reveal', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              txHash,
              recipientAddress: address
            })
          });

          if (!response.ok) throw new Error("Reveal failed");

          const data = await response.json();
          if (data.amount) {
            // Format: 1000000 -> 1.0000
            const raw = parseInt(data.amount);
            const formatted = (raw / 1000000).toFixed(4);

            setRevealedAmount(formatted);
            setDailyAmount(data.amount.toString()); // For marquee
            setGiftClaimed(true);
          }
        } catch (e) {
          console.error("Reveal error:", e);
          handleSetError("Claim confirmed, but reveal failed. Check wallet for USDC.");
          setGiftClaimed(true); // Don't loop
        }
      };
      revealPrize();
    }
  }, [isGiftConfirmed, giftStatus, address, giftClaimed, revealedAmount]);

  // Update state when gift is claimed (Marquee logic)
  useEffect(() => {
    if (isGiftConfirmed && dailyAmount && dailyAmount !== '0') {
      // Open compose cast popup
      const rootUrl = process.env.NEXT_PUBLIC_URL || 'https://your-app-url.com';
      const formattedAmount = (parseInt(dailyAmount) / 1000000).toFixed(6); // USDC Logic
      sdk.actions.composeCast({
        text: `I just won ${formattedAmount} USDC! 💘 Spun the Love Pot on Xmas PFP`,
        embeds: [rootUrl],
      });
    }
  }, [isGiftConfirmed, dailyAmount]);

  const handleSetError = (errorMessage: string) => {
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }
    setError(errorMessage);
    const timeout = setTimeout(() => {
      setError(null);
    }, 5000);
    setErrorTimeout(timeout);
  };

  const shortenAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className={styles.container}>
      <audio ref={audioRef} src="/sound/xmassound.mp3" autoPlay loop />
      <button
        className={styles.muteButton}
        onClick={() => {
          if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
            setIsMuted(!isMuted);
          }
        }}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      {userRejectedError && (
        <div className={styles.rejectedOverlay}>
          <Image src="/win98logo/wrong.png" alt="Error" width={48} height={48} />
          <p>User Rejected</p>
        </div>
      )}
      <header className={styles.headerWrapper}>
        <div className={styles.topRightControls}>
          {isConnected ? (
            <div className={styles.modernAddress}>{shortenAddress(address as string)}</div>
          ) : (
            <button
              className={styles.modernButton}
              //@ts-ignore
              onClick={openConnectModal}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
      </header>

      <main className={styles.content}>
        {isUserLoading ? (
          <Loader />
        ) : !isInFarcaster ? (
          <div className={styles.notFarcasterMessage}>
            <h2>💘 Oops!</h2>
            <p>This app is only available on Farcaster.</p>
            <p>Please open this in <strong>Farcaster</strong> or another Farcaster client to use Love Pot.</p>
            <a href="https://farcaster.xyz" target="_blank" rel="noopener noreferrer" className={styles.modernButton}>
              Open Farcaster
            </a>
          </div>
        ) : (
          <div className={styles.mainContainer}>
            {error && <p className={styles.errorText}>{error}</p>}

            {/* Daily Gift Section - renamed conceptually to Love Pot */}
            {isConnected && DAILY_GIFT_CONTRACT && (
              <div className={styles.giftSection}>
                <DailyGiftCard
                  username={username}
                  pfpUrl={pfpUrl}
                  isClaiming={isClaimingGift || isGiftPending || isGiftConfirming}
                  tokenSymbol={tokenSymbol}
                  onClaim={async () => {
                    if (!address) return;
                    setIsClaimingGift(true);
                    setRevealedAmount(null); // Reset
                    try {
                      // Prepare capabilities if needed
                      const capabilities = process.env.NEXT_PUBLIC_PAYMASTER_URL ? {
                        paymasterService: { url: process.env.NEXT_PUBLIC_PAYMASTER_URL }
                      } : undefined;

                      sendGiftCalls({
                        calls: [{
                          to: DAILY_GIFT_CONTRACT,
                          abi: dailyGiftAbi,
                          functionName: 'play',
                          args: [BigInt(fid!)],
                          value: BigInt(100000000000000), // 0.0001 ETH
                        }],
                        capabilities
                      });
                    } catch (e: any) {
                      console.error(e);
                      handleSetError(e.message);
                      throw e;
                    } finally {
                      setIsClaimingGift(false);
                    }
                  }}
                  revealedAmount={revealedAmount}
                  potBalance={potBalanceDisplay}
                />
                <div style={{ marginTop: '1rem', overflow: 'hidden', borderRadius: '8px' }}>
                  <LiveWinnersMarquee />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
