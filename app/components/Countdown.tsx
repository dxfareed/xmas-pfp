"use client";

import { useState, useEffect } from 'react';
import styles from './Countdown.module.css'; // Import the CSS module

interface CountdownProps {
  seconds: number;
}

const Countdown = ({ seconds: initialSeconds }: CountdownProps) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    // If initialSeconds is 0 or less, we don't need to start a countdown
    if (initialSeconds <= 0) {
      setRemainingSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prevSeconds => {
        if (prevSeconds <= 1) { // If it's 1 or less, it will be 0 on next tick
          clearInterval(interval);
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [initialSeconds]); // Re-run effect only when initialSeconds changes

  // Calculate hours, minutes, seconds from remainingSeconds
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  // Format the time for display
  const timeLeft = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <span className={styles.countdown}>{timeLeft}</span> // Apply the class
  );
};

export default Countdown;
