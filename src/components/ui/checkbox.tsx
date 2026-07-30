"use client";

import React from "react";
import { Check } from "lucide-react";

interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked?: boolean;
  /** Callback on change */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Disables interaction */
  disabled?: boolean;
  /** Extra class for wrapper */
  className?: string;
  /** HTML id attribute */
  id?: string;
}

/**
 * Kaboré OS Checkbox.
 *
 * @example
 * <Checkbox label="Aceitar termos" checked={v} onChange={setV} />
 */
export function Checkbox({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = "",
  id,
}: CheckboxProps) {
  const inputId = id ?? (label ? `chk-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <label
      htmlFor={inputId}
      className={[
        "inline-flex items-center gap-2.5 cursor-pointer select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      <div className="relative shrink-0">
        <input
          type="checkbox"
          id={inputId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={[
            "w-4 h-4 rounded flex items-center justify-center border transition-colors duration-150",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-canvas",
            checked
              ? "bg-text-primary border-text-primary"
              : "bg-surface border-border hover:border-white/30",
          ].join(" ")}
        >
          {checked && <Check size={10} strokeWidth={3} className="text-canvas" />}
        </div>
      </div>
      {label && (
        <span className="text-sm text-text-primary leading-none">{label}</span>
      )}
    </label>
  );
}

interface ToggleProps {
  /** Whether the toggle is on */
  checked?: boolean;
  /** Callback on change */
  onChange?: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Optional description under the label */
  description?: string;
  /** Disables interaction */
  disabled?: boolean;
  /** Extra class for wrapper */
  className?: string;
}

/**
 * Kaboré OS Toggle (switch). Use for binary options like active/inactive.
 *
 * @example
 * <Toggle label="Receber notificações" checked={v} onChange={setV} />
 */
export function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}: ToggleProps) {
  return (
    <label
      className={[
        "inline-flex items-start gap-3 cursor-pointer select-none",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      <div className="relative shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={[
            "w-9 h-5 rounded-full transition-colors duration-200",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-white/40 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-canvas",
            checked ? "bg-text-primary" : "bg-surface-hover border border-border",
          ].join(" ")}
        />
        <div
          className={[
            "absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform duration-200",
            checked ? "bg-canvas translate-x-4" : "bg-white translate-x-0.5",
          ].join(" ")}
        />
      </div>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span className="text-sm font-medium text-text-primary leading-none">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-text-secondary">{description}</span>
          )}
        </div>
      )}
    </label>
  );
}