/**
 * Club 19 Sales OS - Top Loading Bar
 *
 * Global loading indicator (like YouTube/GitHub)
 * Shows at the top of the viewport during async operations
 */

"use client";

import { useEffect, useState } from "react";

interface TopLoadingBarProps {
  isLoading: boolean;
}

export function TopLoadingBar({ isLoading }: TopLoadingBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setProgress(10);

      const timer1 = setTimeout(() => setProgress(30), 200);
      const timer2 = setTimeout(() => setProgress(60), 500);
      const timer3 = setTimeout(() => setProgress(80), 1000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      setProgress(100);
      const timer = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div
        className="h-full bg-gradient-to-r from-[#F3DFA2] to-[#F3DFA2]/60 transition-all duration-300 ease-out shadow-lg"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
