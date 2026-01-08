"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useWalletClient } from 'wagmi';
import { useSendCalls, useCallsStatus } from 'wagmi/experimental';
import { sdk } from '@farcaster/miniapp-sdk';
import Loader from "./components/Loader";
import { Gift } from 'lucide-react';

import { withRetry } from "../lib/retry";
import { xmasAbi } from "../lib/abi";
import { formatEther, parseEther } from "viem";
import { useUser } from "./context/UserContext";
import { dailyGiftAbi } from "../lib/dailyGiftAbi";
import Countdown from "./components/Countdown";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PAY_ADDRESS = process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS as `0x${string}`;
const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

export default function Home() {
  const { openConnectModal } = useConnectModal();
  const { isConnected, address, isConnecting } = useAccount();

  // EIP-5792 Hooks
  const { sendCalls, data: mintCallId, error: mintError, isPending: isMinting, reset: resetMint } = useSendCalls();
  const { data: mintStatus, isLoading: isConfirming, isSuccess: isConfirmed } = useCallsStatus({
    id: mintCallId?.id as string,
    query: {
      enabled: !!mintCallId,
      refetchInterval: (data) => data.state.data?.status === "success" ? false : 1000
    }
  });

  const { fid, pfpUrl, isLoading: isUserLoading, isInFarcaster } = useUser();

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

  // Daily Gift Claim Transaction (EIP-5792)
  const { sendCalls: sendGiftCalls, data: giftCallId, error: giftError, isPending: isGiftPending, reset: resetGift } = useSendCalls();
  const { isLoading: isGiftConfirming, isSuccess: isGiftConfirmed } = useCallsStatus({
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

  // Update state when gift is claimed
  useEffect(() => {
    if (isGiftConfirmed) {
      setGiftClaimed(true);
      setCanClaimGift(false);

      // Open compose cast popup
      const rootUrl = process.env.NEXT_PUBLIC_URL || 'https://your-app-url.com';
      const formattedAmount = formatEther(BigInt(dailyAmount));
      sdk.actions.composeCast({
        text: `I just claimed ${formattedAmount} $GIFT! 🎁🎄 Go claim yours on Xmas PFP`,
        embeds: [rootUrl],
      });
    }
  }, [isGiftConfirmed, dailyAmount]);

  // Check if user has already generated an image
  useEffect(() => {
    const checkExistingGeneration = async () => {
      try {
        await withRetry(async () => {
          const { token } = await sdk.quickAuth.getToken();
          const response = await fetch('/api/generated-image', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) throw new Error('Failed to fetch generated image');
          const data = await response.json();
          if (data.hasGenerated && data.imageUrl) {
            setGeneratedImageUrl(data.imageUrl);
            setHasAlreadyGenerated(true);
            if (data.hasMinted) {
              setHasMinted(true);
            }
          }
        }, 3, 1000);
      } catch (error) {
        console.error('Error checking existing generation after retries:', error);
      }
    };

    if (fid) {
      checkExistingGeneration();
    }
  }, [fid]);



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


  const generateImage = async () => {
    const sourceImage = pfpUrl || nftImageUrl;
    if (!sourceImage) return;
    setIsGenerating(true);
    setError(null);
    try {
      const { token } = await sdk.quickAuth.getToken();
      const res = await withRetry(async () => {
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ imageUrl: sourceImage, religion: 'Christian' }),
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        return response;
      });

      const data = await res.json();
      if (res.ok) {
        setGeneratedImageUrl(data.newImageUrl);
        setHasAlreadyGenerated(true);

        // Save generated image to database
        try {
          const { token: saveToken } = await sdk.quickAuth.getToken();
          await fetch('/api/generated-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${saveToken}`,
            },
            body: JSON.stringify({ imageUrl: data.newImageUrl }),
          });
        } catch (saveError) {
          console.error('Error saving generated image:', saveError);
        }

        // Play santa sound on success
        if (santaAudioRef.current) {
          santaAudioRef.current.currentTime = 0;
          santaAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
      } else {
        handleSetError("rate limited. please try again");
      }
    } catch (err) {
      handleSetError("rate limited. please try again");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };


  const handleGenerateSmile = async () => {
    if (!pfpUrl && !nftImageUrl) return;

    setIsGenerating(true); // Show loader immediately

    try {
      await generateImage();
    } catch (err) {
      handleSetError("Failed to generate image.");
      console.error(err);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (mintError) {
      console.error("A minting error occurred:", mintError);
      if (mintError.message.includes('User rejected the request')) {
        setUserRejectedError(true);
        setTimeout(() => setUserRejectedError(false), 5000);
      } else {
        handleSetError(`Minting failed: ${mintError.message}`);
      }
    }
    // Also handle gift errors
    if (giftError) {
      console.error("A gift claim error occurred:", giftError);
      if (giftError.message.includes('User rejected the request')) {
        setUserRejectedError(true);
        setTimeout(() => setUserRejectedError(false), 5000);
      } else {
        handleSetError(`Claim failed: ${giftError.message}`);
      }
    }
  }, [mintError, giftError]);


  // Note: We use mintCallId as the "hash" equivalent for EIP-5792 logging/tracking if needed,
  // but strictly speaking it's a batch ID, not a tx hash until confirmed.
  // The 'mintStatus' object might contain the receipts once confirmed.

  useEffect(() => {
    // Check for success via useCallsStatus
    if (isConfirmed && generatedImageUrl) {
      const saveMintToDb = async () => {
        setIsSavingToGallery(true);
        try {
          const { token } = await sdk.quickAuth.getToken();
          // Ideally we would want the actual TX Hash here.
          // With useCallsStatus, we get `data.receipts` array.
          const txHash = mintStatus?.receipts?.[0]?.transactionHash || mintCallId?.id;

          const response = await fetch('/api/nft/mint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              imageData: generatedImageUrl,
              txHash: txHash
            }),
          });

          const data = await response.json();

          // Safe debugging log
          console.log("Parsed response from /api/nft/mint. Data keys:", Object.keys(data));

          if (response.ok && data.imageUrl) {
            console.log("Found tokenUri, setting state.", data.imageUrl);
            setFinalIpfsUrl(data.imageUrl);

            // Mark as minted in GeneratedImage table
            await fetch('/api/generated-image', {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            setHasMinted(true);
          } else {
            throw new Error(data.error || "Failed to save mint to DB.");
          }
        } catch (error) {
          console.error("Failed to save mint to DB:", error);
          handleSetError("Minted, but failed to save to gallery.");
        } finally {
          setIsSavingToGallery(false);
        }
      };
      saveMintToDb();
    }
  }, [isConfirmed, mintStatus, mintCallId, generatedImageUrl]);

  const handleMint = async () => {
    if (!generatedImageUrl || !address) return;

    setIsPreparingMint(true);
    // Upload image to IPFS first
    try {
      const imageUrl = await uploadImage(generatedImageUrl);

      // Prepare capabilities for Paymaster if URL is set
      const capabilities = process.env.NEXT_PUBLIC_PAYMASTER_URL ? {
        paymasterService: {
          url: process.env.NEXT_PUBLIC_PAYMASTER_URL
        }
      } : undefined;

      sendCalls({
        calls: [{
          to: CONTRACT_ADDRESS,
          abi: xmasAbi,
          functionName: 'safeMint',
          args: [address, imageUrl],
          value: parseEther("0"), // Free mint
        }],
        capabilities
      });

    } catch (error) {
      console.error('Error uploading image for mint:', error);
      handleSetError('Failed to prepare mint. Please try again.');
    } finally {
      setIsPreparingMint(false);
    }
  };

  const uploadImage = async (imageData: string) => {
    const { token } = await sdk.quickAuth.getToken();
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ imageData }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const { url } = await response.json();
    return url;
  };

  const handleDownload = async () => {
    if (!generatedImageUrl) return;
    setIsDownloading(true);

    try {
      let urlToOpen = generatedImageUrl;

      if (generatedImageUrl.startsWith('data:')) {
        urlToOpen = await uploadImage(generatedImageUrl);
      }

      sdk.actions.openUrl(urlToOpen);
    } catch (error) {
      console.error("Error opening image:", error);
      handleSetError("Failed to open image in browser.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    const rootUrl = process.env.NEXT_PUBLIC_URL || 'https://your-app-url.com';
    if (!generatedImageUrl) return;

    setIsSharing(true);

    try {
      let imageUrlToShare = finalIpfsUrl || generatedImageUrl;

      if (imageUrlToShare.startsWith('data:')) {
        imageUrlToShare = await uploadImage(imageUrlToShare);
      }

      sdk.actions.composeCast({
        text: "I just updated my pfp for Christmas 🎄🎄 on Xmas PFP by @dxfareed",
        embeds: [imageUrlToShare, rootUrl],
      });
    } catch (error) {
      console.error("Error sharing:", error);
      handleSetError("Failed to share image.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleGenerateNew = () => {
    sdk.haptics.impactOccurred('medium');
    setGeneratedImageUrl(null);
    resetMint();
  };

  const handleAddToken = async () => {
    if (!walletClient || !tokenAddress || !tokenSymbol) return;
    try {
      await walletClient.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
          },
        },
      });
      sdk.haptics.notificationOccurred('success');
    } catch (e) {
      console.error("Failed to add token to wallet:", e);
      handleSetError("Failed to add token to wallet.");
    }
  };

  return (
    <div className={styles.container}>
      <audio ref={audioRef} src="/sound/xmassound.mp3" autoPlay loop />
      <audio ref={santaAudioRef} src="/sound/santa.mp3" />
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
            <h2>🎄 Oops!</h2>
            <p>This app is only available on Farcaster.</p>
            <p>Please open this in <strong>Farcaster</strong> or another Farcaster client to use Xmas PFP.</p>
            <a href="https://farcaster.xyz" target="_blank" rel="noopener noreferrer" className={styles.modernButton}>
              Open Farcaster
            </a>
          </div>
        ) : (
          <div className={styles.mainContainer}>
            {error && <p className={styles.errorText}>{error}</p>}

            {/* Daily Gift Section - CENTERED HERO */}
            {isConnected && DAILY_GIFT_CONTRACT && (
              <div className={styles.giftSection}>
                <h1 className={styles.giftTitle}>Daily Christmas Gift</h1>

                {tokenPriceData && dailyAmount && (
                  <div className={styles.priceTag} style={{ color: tokenPriceData.priceChange_h1 >= 0 ? '#165B33' : '#D42426' }}>
                    <span>Gift Value: ${(parseFloat(formatEther(BigInt(dailyAmount))) * tokenPriceData.priceUsd).toFixed(4)}</span>
                    {tokenSymbol && (
                      <button onClick={handleAddToken} className={styles.addTokenButton} title="Add to Wallet">
                        + 🦊
                      </button>
                    )}
                  </div>
                )}

                <p className={styles.giftSubtitle}>Claim your free tokens every {claimInterval} hours!</p>
                <div className={styles.pfpPreview}>
                  <Image
                    src={pfpUrl || '/icon.png'}
                    alt="Your PFP"
                    width={80}
                    height={80}
                    className={styles.pfpCircle}
                  />
                </div>

                <button
                  className={`${styles.mainGiftButton} ${canClaimGift ? styles.giftAvailable : ''}`}
                  onClick={async () => {
                    if (!canClaimGift || !address || isClaimingGift || isGiftPending || isGiftConfirming) return;
                    setIsClaimingGift(true);
                    try {
                      const { token } = await sdk.quickAuth.getToken();
                      const signResponse = await fetch('/api/daily-gift/sign', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ recipientAddress: address }),
                      });

                      if (!signResponse.ok) {
                        const errorData = await signResponse.json().catch(() => ({}));
                        throw new Error(errorData.message || 'Failed to get signature');
                      }

                      const { signature, deadline } = await signResponse.json();

                      // EIP-5792: sendCalls with Paymaster capability
                      const capabilities = process.env.NEXT_PUBLIC_PAYMASTER_URL ? {
                        paymasterService: {
                          url: process.env.NEXT_PUBLIC_PAYMASTER_URL
                        }
                      } : undefined;

                      sendGiftCalls({
                        calls: [{
                          to: DAILY_GIFT_CONTRACT,
                          abi: dailyGiftAbi,
                          functionName: 'claim',
                          args: [BigInt(fid!), address, BigInt(deadline), signature],
                        }],
                        capabilities
                      });
                    } catch (error: any) {
                      console.error('Error claiming gift:', error);
                      handleSetError(error.message || 'Failed to claim gift');
                    } finally {
                      setIsClaimingGift(false);
                    }
                  }}
                  disabled={!canClaimGift || isClaimingGift || isGiftPending || isGiftConfirming || isCheckingGiftStatus || !hasSufficientBalance}
                >
                  {isCheckingGiftStatus ? (
                    <>
                      <Loader />
                      <span>Checking...</span>
                    </>
                  ) : !hasSufficientBalance ? (
                    <span>Sold Out (Contact Dev)</span>
                  ) : isGiftPending || isGiftConfirming ? (
                    <>
                      <Loader />
                      <span>Processing...</span>
                    </>
                  ) : canClaimGift ? (
                    <>
                      <Gift size={32} />
                      <span>CLAIM GIFT</span>
                    </>
                  ) : (
                    <div className={styles.countdownWrapper}>
                      <span>Next Claim In:</span>
                      <Countdown
                        seconds={timeUntilNextClaim}
                        onComplete={() => setCanClaimGift(true)}
                      />
                    </div>
                  )}
                </button>
              </div>
            )}


            {/* Secondary: PFP Generator */}
            <div className={styles.generatorSection}>
              <h3>Xmas PFP Generator</h3>
              <div className={styles.imageContainerSmall}>
                <Image
                  key={generatedImageUrl || pfpUrl || nftImageUrl}
                  src={generatedImageUrl || pfpUrl || nftImageUrl || ''}
                  alt="Creature"
                  width={150}
                  height={150}
                  className={`${styles.imageFadeIn} ${isGenerating ? styles.heartbeat : ''}`}
                />
              </div>

              {generatedImageUrl ? (
                (hasMinted || isConfirmed) ? (
                  <div className={styles.buttonGroup}>
                    <button
                      className={`${styles.modernButton} ${styles['share-button-background']}`}
                      onClick={handleShare}
                      disabled={isSharing || isDownloading}
                    >
                      {isSharing ? 'Sharing...' : 'Share'}
                    </button>
                    <button
                      className={styles.modernButton}
                      onClick={handleDownload}
                      disabled={isSharing || isDownloading}
                    >
                      {isDownloading ? 'Opening...' : 'Download'}
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.modernButton}
                    onClick={handleMint}
                    disabled={isPreparingMint || isMinting || isConfirming || !isConnected}
                  >
                    {isPreparingMint ? <Loader /> : isMinting ? 'Minting...' : isConfirming ? 'Confirming...' : !isConnected ? 'Connect Wallet' : 'Mint (Free)'}
                  </button>
                )
              ) : (
                <button
                  className={styles.modernButton}
                  onClick={handleGenerateSmile}
                  disabled={isGenerating || isPreparing}
                >
                  {isGenerating ? (
                    <Loader />
                  ) : isPreparing ? (
                    "Preparing..."
                  ) : (
                    "Generate New PFP"
                  )}
                </button>
              )}

              {isConfirmed && (
                <div className={styles.successMessage}>
                  <p>Minted Successfully!</p>
                  {/* Note: With batch calls, we might have multiple receipts. Linking to the first one for now. */}
                  {mintStatus?.receipts?.[0]?.transactionHash && (
                    <a
                      href={`https://basescan.org/tx/${mintStatus.receipts[0].transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View on Basescan
                    </a>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
