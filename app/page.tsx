"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import Loader from "./components/Loader";
import { Gift } from 'lucide-react';

import { withRetry } from "../lib/retry";
import { xmasAbi } from "../lib/abi";
import { parseEther } from "viem";
import { useUser } from "./context/UserContext";
import { dailyGiftAbi } from "../lib/dailyGiftAbi";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PAY_ADDRESS = process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS as `0x${string}`;
const DAILY_GIFT_CONTRACT = process.env.NEXT_PUBLIC_DAILY_GIFT_CONTRACT as `0x${string}`;

export default function Home() {
  const { open } = useAppKit();
  const { isConnected, address, isConnecting } = useAccount();
  const { data: hash, writeContract, isPending: isMinting, error: mintError, reset } = useWriteContract();

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
  const [isClaimingGift, setIsClaimingGift] = useState(false);
  const [giftClaimed, setGiftClaimed] = useState(false);
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState(0);

  // Daily Gift Claim Transaction
  const { data: giftHash, writeContract: writeGiftContract, isPending: isGiftPending } = useWriteContract();
  const { isLoading: isGiftConfirming, isSuccess: isGiftConfirmed } = useWaitForTransactionReceipt({ hash: giftHash });

  // Check daily gift status
  useEffect(() => {
    const checkGiftStatus = async () => {
      if (!fid) return;
      try {
        await withRetry(async () => {
          const { token } = await sdk.quickAuth.getToken();
          const response = await fetch('/api/daily-gift/status', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) throw new Error('Failed to fetch gift status');
          const data = await response.json();
          setCanClaimGift(data.canClaim);
          setTimeUntilNextClaim(data.timeUntilNextClaim);
        }, 3, 1000);
      } catch (error) {
        console.error('Error checking gift status after retries:', error);
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
      sdk.actions.composeCast({
        text: "I just claimed my daily xmas gift! 🎁🎄 Go claim yours on Xmas PFP",
        embeds: [rootUrl],
      });
    }
  }, [isGiftConfirmed]);

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



  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })





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
  }, [mintError]);


  useEffect(() => {
    if (isConfirmed && hash && generatedImageUrl) {
      const saveMintToDb = async () => {
        setIsSavingToGallery(true);
        try {
          const { token } = await sdk.quickAuth.getToken();
          const response = await fetch('/api/nft/mint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              imageData: generatedImageUrl,
              txHash: hash
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
  }, [isConfirmed, hash, generatedImageUrl]);

  const handleMint = async () => {
    if (!generatedImageUrl || !address) return;

    setIsPreparingMint(true);
    // Upload image to IPFS first
    try {
      const imageUrl = await uploadImage(generatedImageUrl);

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: xmasAbi,
        functionName: 'safeMint',
        args: [address, imageUrl],
        value: parseEther("0"), // Free mint for now
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
    reset();
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
        {/* Daily Gift Button - only show if user has minted */}
        {isConnected && DAILY_GIFT_CONTRACT && hasMinted && (
          <button
            className={`${styles.giftButton} ${canClaimGift ? styles.giftAvailable : ''}`}
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
                if (!signResponse.ok) throw new Error('Failed to get signature');
                const { signature, deadline } = await signResponse.json();
                writeGiftContract({
                  address: DAILY_GIFT_CONTRACT,
                  abi: dailyGiftAbi,
                  functionName: 'claim',
                  args: [BigInt(fid!), address, BigInt(deadline), signature],
                });
              } catch (error) {
                console.error('Error claiming gift:', error);
                handleSetError('Failed to claim gift');
              } finally {
                setIsClaimingGift(false);
              }
            }}
            disabled={!canClaimGift || !hasMinted || isClaimingGift || isGiftPending || isGiftConfirming}
            title={!hasMinted ? 'Mint first to claim gifts!' : canClaimGift ? 'Claim Daily Gift!' : `Next claim in ${Math.floor(timeUntilNextClaim / 3600)}h`}
          >
            {isGiftPending || isGiftConfirming ? <Loader /> : <Gift size={20} />}
          </button>
        )}
        {isConnected ? (
          <div className={styles.modernAddress}>{shortenAddress(address as string)}</div>
        ) : (
          <button
            className={styles.modernButton}
            //@ts-ignore
            onClick={open}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        )}
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
          <>
            {error && <p className={styles.errorText}>{error}</p>}

            {!error && (
              <div className={styles.generator}>
                <div className={styles.imageContainer}>
                  <Image
                    key={generatedImageUrl || pfpUrl || nftImageUrl}
                    src={generatedImageUrl || pfpUrl || nftImageUrl || ''}
                    alt="Creature"
                    width={256}
                    height={256}
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
                      "Generate"
                    )}
                  </button>
                )}
                {isGenerating && <p className={styles.waitText}>please wait...</p>}

                {isConfirming && <p>Waiting for confirmation...</p>}
                {isConfirmed && (
                  <div>
                    <p>Minted Successfully!</p>
                    <a
                      href={`https://basescan.org/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.link}
                    >
                      View on Basescan
                    </a>
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </main>
    </div>
  );
}
