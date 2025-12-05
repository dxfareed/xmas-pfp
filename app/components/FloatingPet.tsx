import React from 'react';
import styles from './FloatingPet.module.css';

const FloatingPet = () => {
  return (
    <div className={styles.petContainer}>
      <img
        src="/human98/pet-warplet.png"
        alt="Floating Pet"
        width={150}
        height={150}
        className={styles.petImage}
      />
    </div>
  );
};

export default FloatingPet;
