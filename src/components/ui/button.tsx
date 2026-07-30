"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows a spinner and disables the button while true */
  loading?: boolean;
  /** Icon to render before the label */
  iconLeft?: React.ReactNode;
  /** Icon to render after the label */
  iconRight?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent hover:bg-accent-hover text-accent-on border-transparent",
  secondary:
    "bg-surface hover:bg-surface-hover text-text-primary border border-border",
  ghost:
    "bg-transparent hover:bg-surface-hover text-text-primary border-transparent",
  destructive:
    "bg-danger hover:bg-[#E23C3C] text-white border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

/**
 * Kaboré OS base button.
 *
 * @example
 * <Button variant="primary" size="md" loading={false}>Salvar</Button>
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        "relative inline-flex items-center justify-center font-inter font-medium",
        "rounded transition-colors duration-150 select-none focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1",
        "focus-visible:ring-offset-canvas",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2
            className="animate-spin"
            size={size === "sm" ? 14 : size === "lg" ? 18 : 16}
          />
        </span>
      )}
      <span className={loading ? "invisible flex items-center gap-2" : "flex items-center gap-2"}>
        {iconLeft && <span className="shrink-0">{iconLeft}</span>}
        {children}
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </span>
    </button>
  );
}