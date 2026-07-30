"use client";

import React from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  /** Semantic color variant */
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "bg-success/15", text: "text-success" },
  warning: { bg: "bg-warning/15", text: "text-warning" },
  danger: { bg: "bg-danger/15", text: "text-danger" },
  info: { bg: "bg-info/15", text: "text-info" },
  neutral: { bg: "bg-white/10", text: "text-text-secondary" },
};

/**
 * Kaboré OS Badge pill. Use for status labels in tables/cards.
 *
 * @example
 * <Badge variant="success">Confirmado</Badge>
 */
export function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        bg,
        text,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
