"use client";

/**
 * Minimalist SVG logo: two intertwined ribbons (partner dance connection).
 * Gradient from brand-rose to soft gold.
 */
export function Logo({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="100%" stopColor="#EAB308" stopOpacity={0.85} />
        </linearGradient>
      </defs>
      {/* Ribbon 1: S-curve */}
      <path
        d="M6 10 C6 20 34 20 34 10 C34 24 6 24 6 30"
        stroke="url(#logo-gradient)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Ribbon 2: intertwining S-curve */}
      <path
        d="M34 6 C34 22 6 22 6 6 C6 20 34 20 34 34"
        stroke="url(#logo-gradient)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        opacity={0.9}
      />
    </svg>
  );
}
