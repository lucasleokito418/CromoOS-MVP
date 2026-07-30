"use client";

import React from "react";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  /** Display name used to generate initials */
  name?: string;
  /** Image URL — takes precedence over initials */
  src?: string;
  /** Size variant */
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function stringToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/**
 * Kaboré OS Avatar. Shows an image if provided, otherwise colored initials.
 *
 * @example
 * <Avatar name="Maria Silva" size="md" />
 */
export function Avatar({ name = "", src, size = "md", className = "" }: AvatarProps) {
  const hue = stringToHue(name);
  const initials = getInitials(name || "?");

  return (
    <div
      className={[
        "relative rounded-full flex items-center justify-center overflow-hidden shrink-0 font-medium select-none",
        sizeClasses[size],
        className,
      ].join(" ")}
      style={
        !src
          ? {
              backgroundColor: `hsl(${hue}, 30%, 30%)`,
              color: `hsl(${hue}, 70%, 80%)`,
            }
          : undefined
      }
      aria-label={name || "Avatar"}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}
