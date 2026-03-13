"use client";

import { useRef, useEffect, useState } from "react";
import Lottie, { type LottieRefCurrentProps } from "lottie-react";

export interface DancingCoachProps {
  /** URL or path to Lottie JSON animation. If not provided, a minimal placeholder is shown. */
  animationSrc?: string;
  className?: string;
  loop?: boolean;
}

/**
 * Loads and plays a minimalist vector animation of a dancer (Lottie).
 * Placeholder: simple animated figure when no animationSrc is provided.
 */
export function DancingCoach({
  animationSrc,
  className = "",
  loop = true,
}: DancingCoachProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!animationSrc) return;
    setLoadError(false);
    fetch(animationSrc)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then(setAnimationData)
      .catch(() => setLoadError(true));
  }, [animationSrc]);

  if (animationSrc && animationData) {
    return (
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={loop}
        className={className}
      />
    );
  }

  if (animationSrc && loadError) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-sm ${className}`}>
        Animation unavailable
      </div>
    );
  }

  /* Placeholder: minimal CSS-animated dancer silhouette (two circles + arc) */
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 80 100"
        className="w-full h-full max-h-[200px] text-brand-rose opacity-80"
      >
        <defs>
          <linearGradient id="coach-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDA4AF" />
            <stop offset="100%" stopColor="#EAB308" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        {/* Head */}
        <circle cx="40" cy="18" r="10" fill="url(#coach-grad)" />
        {/* Body */}
        <ellipse cx="40" cy="52" rx="14" ry="18" fill="url(#coach-grad)" opacity={0.9} />
        {/* Arm curve - subtle motion feel */}
        <path
          d="M26 38 Q38 30 54 38"
          stroke="url(#coach-grad)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-dance-sway"
          style={{ transformOrigin: "40px 38px" }}
        />
      </svg>
    </div>
  );
}
