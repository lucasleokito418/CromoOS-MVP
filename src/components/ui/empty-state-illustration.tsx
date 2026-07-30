import React from "react";

interface EmptyStateIllustrationProps {
  className?: string;
  size?: number;
}

export function EmptyStateIllustration({ className = "", size = 80 }: EmptyStateIllustrationProps) {
  return (
    <svg
      width={size}
      height={(size * 2) / 3}
      viewBox="0 0 120 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-text-secondary/30 ${className}`}
    >
      {/* Car Silhouette */}
      <path
        d="M20 50h80M25 50v-6a4 4 0 014-4h8l5-8h16l5 8h8a4 4 0 014 4v6"
        strokeWidth="2"
      />
      {/* Wheels */}
      <circle cx="38" cy="50" r="7" fill="#121214" strokeWidth="2" />
      <circle cx="82" cy="50" r="7" fill="#121214" strokeWidth="2" />
      {/* Sparkles/Cleaning lines */}
      <path d="M15 30l5 2M100 25l-4 2M55 20l1 4" strokeOpacity="0.5" />
      {/* Magnifying Glass searching the car */}
      <g className="text-text-secondary/60">
        <circle cx="68" cy="38" r="10" strokeWidth="2" fill="#1C1C1F" />
        <path d="M75 45l10 10" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
