"use client";
import { Home, GalleryVertical } from 'lucide-react';
import styles from './Navigation.module.css';

interface NavigationProps {
  activeView: 'home' | 'gallery';
  setActiveView: (view: 'home' | 'gallery') => void;
}

const Navigation = ({ activeView, setActiveView }: NavigationProps) => {
  return (
    <nav className={styles.nav}>
      <button 
        className={`${styles.navButton} ${activeView === 'home' ? styles.active : ''}`}
        onClick={() => setActiveView('home')}
      >
        <Home size={24} />
        <span>Home</span>
      </button>
      <button 
        className={`${styles.navButton} ${activeView === 'gallery' ? styles.active : ''}`}
        onClick={() => setActiveView('gallery')}
      >
        <GalleryVertical size={24} />
        <span>Gallery</span>
      </button>
    </nav>
  );
};

export default Navigation;
