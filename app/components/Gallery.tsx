"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './Gallery.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import PhotoViewer from './PhotoViewer';
import Loader from './Loader';

interface Nft {
  imageUrl: string;
  tokenUri: string;
  txHash: string;
  mintedAt: string;
}

interface GalleryProps {
  setActiveView: (view: 'home' | 'gallery') => void;
  activeView: 'home' | 'gallery';
}

const Gallery = ({ setActiveView, activeView }: GalleryProps) => {
  const [nfts, setNfts] = useState<Nft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const formatImageUrl = (url: string) => {
    if (url.startsWith("ipfs://")) {
      return url.replace("ipfs://", "https://ipfs.io/ipfs/");
    }
    return url;
  };

  useEffect(() => {
    const fetchNfts = async () => {
      setLoading(true);
      try {
        const { token } = await sdk.quickAuth.getToken();
        const res = await fetch('/api/gallery', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch NFTs');
        }
        const data = await res.json();
        setNfts(Array.isArray(data.nfts) ? data.nfts : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (activeView === 'gallery') {
      fetchNfts();
    }
  }, [activeView]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <div className={styles.errorText}>Error: {error}</div>;
  }

  if (selectedImage) {
    return <PhotoViewer imageUrl={selectedImage} onBack={() => setSelectedImage(null)} />;
  }

  return (
    <div className={styles.grid}>
      {nfts.length > 0 ? (
        nfts
          .filter(nft => nft.imageUrl) // Filter out NFTs with no image URL
          .sort((a, b) => new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime())
          .map((nft, index) => {
            const formattedUrl = formatImageUrl(nft.imageUrl);
            return (
              <div key={index} className={styles.gridItem} onClick={() => setSelectedImage(formattedUrl)}>
                <Image
                  src={formattedUrl}
                  alt="Minted NFT"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 600px) 50vw, (max-width: 900px) 33vw, 25vw"
                />
              </div>
            );
          })
      ) : (
        <div className={styles.emptyState}>
          <p>You don't have any religious warplet.</p>
          <button className={styles.linkButton} onClick={() => setActiveView('home')}>
            Mint one here
          </button>
        </div>
      )}
    </div>
  );
};

export default Gallery;
