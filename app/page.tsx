"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import Loader from "./components/Loader";

import { withRetry } from "../lib/retry";
import { religiousWarpletAbi } from "../lib/abi";
import { parseEther } from "viem";
import { useUser } from "./context/UserContext";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const PAY_ADDRESS = process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS as `0x${string}`;

export default function Home() {
  const { open } = useAppKit();
  const { isConnected, address, isConnecting } = useAccount();
  const { data: hash, writeContract, isPending: isMinting, error: mintError, reset } = useWriteContract();

  const { fid, pfpUrl, isLoading: isUserLoading } = useUser();



  const [nftImageUrl, setNftImageUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userRejectedError, setUserRejectedError] = useState(false);
  const [selectedReligion, setSelectedReligion] = useState('Christian');

  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [finalIpfsUrl, setFinalIpfsUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAlreadyGenerated, setHasAlreadyGenerated] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const santaAudioRef = useRef<HTMLAudioElement | null>(null);

  // Check if user has already generated an image
  useEffect(() => {
    const checkExistingGeneration = async () => {
      try {
        const { token } = await sdk.quickAuth.getToken();
        const response = await fetch('/api/generated-image', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasGenerated && data.imageUrl) {
            setGeneratedImageUrl(data.imageUrl);
            setHasAlreadyGenerated(true);
          }
        }
      } catch (error) {
        console.error('Error checking existing generation:', error);
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

  const religions = [/* 'Warplette', */'Christian', 'Muslim', 'Buddhist', 'Jewish', 'Hindu', 'Satanic'];

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
          body: JSON.stringify({ imageUrl: sourceImage, religion: selectedReligion }),
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

    const placeholderTokenUri = "ipfs://bafkreie3c7t6g3k43r5n7t3g6j6z6z6z6z6z6z6z6z6z6z6z6z6z6z";

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: religiousWarpletAbi,
      functionName: 'safeMint',
      args: [address, placeholderTokenUri],
      value: parseEther("0.0003"),
    });
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
                <select
                  className={styles.modernSelect}
                  value={selectedReligion}
                  onChange={(e) => setSelectedReligion(e.target.value)}
                  disabled={!!generatedImageUrl}
                >
                  {religions.map(religion => (
                    <option key={religion} value={religion}>{religion}</option>
                  ))}
                </select>

                {generatedImageUrl ? (
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
