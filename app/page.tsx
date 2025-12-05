"use client";
import { useState, useEffect } from "react";
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

  const { fid, pfpUrl } = useUser();

  const [nftImageUrl, setNftImageUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isCheckingNft, setIsCheckingNft] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userRejectedError, setUserRejectedError] = useState(false);
  const [selectedReligion, setSelectedReligion] = useState('Christian');

  const [isSavingToGallery, setIsSavingToGallery] = useState(false);
  const [finalIpfsUrl, setFinalIpfsUrl] = useState<string | null>(null);

  const [hasNft, setHasNft] = useState(true);

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

  useEffect(() => {
    if (isConnected) {
      checkNftOwnership();
    }
  }, [isConnected]);

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    })



  const checkNftOwnership = async () => {
    setIsCheckingNft(true);
    setError(null);
    setHasNft(true);
    try {
      const { token } = await sdk.quickAuth.getToken();
      const res = await withRetry(async () => {
        const response = await fetch('/api/nft/check', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        return response;
      });

      const data = await res.json();
      if (res.ok && data.holdingNft) {
        setNftImageUrl(data.nftImage);
        setHasNft(true);
      } else {
        setHasNft(false);
      }
    } catch (err) {
      handleSetError("Failed to check NFT ownership.");
      console.error(err);
      setHasNft(false);
    } finally {
      setIsCheckingNft(false);
    }
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

  const handleShare = () => {
    const rootUrl = process.env.NEXT_PUBLIC_URL || 'https://your-app-url.com'; // Fallback URL
    const imageUrlToShare = finalIpfsUrl || generatedImageUrl;

    if (!imageUrlToShare) {
      handleSetError("Image URL not available for sharing.");
      return;
    }

    const shareUrl = `${rootUrl}/share-frame/generated?imageUrl=${encodeURIComponent(imageUrlToShare)}`;

    sdk.actions.composeCast({
      text: "My warplet found faith",
      embeds: [shareUrl],
    });
  };

  const handleGenerateNew = () => {
    sdk.haptics.impactOccurred('medium');
    setGeneratedImageUrl(null);
    reset();
  };

  return (
    <div className={styles.container}>
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
        {isCheckingNft && <Loader />}
        {error && <p className={styles.errorText}>{error}</p>}

        {!isCheckingNft && !error && (
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

            {isConfirmed ? (
              <div className={styles.buttonGroup}>
                <button
                  className={`${styles.modernButton} ${styles['share-button-background']}`}
                  onClick={handleShare}
                  disabled={isSavingToGallery}
                >
                  {isSavingToGallery ? 'Saving...' : 'Share'}
                </button>
                {!isSavingToGallery && (
                  <button className={styles.modernButton} onClick={handleGenerateNew}>
                    Generate New
                  </button>
                )}
              </div>
            ) : (
              <button
                className={styles.modernButton}
                onClick={
                  generatedImageUrl
                    ? handleMint
                    : handleGenerateSmile
                }
                disabled={isGenerating || isPreparing || isMinting}
              >
                {isGenerating ? (
                  <Loader />
                ) : isPreparing ? (
                  "Preparing..."
                ) : isMinting ? (
                  "Minting..."
                ) : generatedImageUrl ? (
                  "Mint"
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
      </main>
    </div>
  );
}
