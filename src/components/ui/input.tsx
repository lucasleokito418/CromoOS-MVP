"use client";

import React, { forwardRef } from "react";
import { AlertCircle } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label shown above the input */
  label?: string;
  /** Helper text shown below the input */
  hint?: string;
  /** Error message — triggers danger styling */
  error?: string;
}

/**
 * Kaboré OS text input with label, hint, and error state.
 *
 * @example
 * <Input label="Nome" placeholder="Ex: Maria" error="Campo obrigatório" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-primary leading-none"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full h-9 px-3 rounded bg-surface border text-sm text-text-primary",
            "placeholder:text-text-secondary",
            "transition-colors duration-150 outline-none",
            "focus:ring-2 focus:ring-accent focus:border-transparent",
            error
              ? "border-danger focus:ring-danger"
              : "border-border hover:border-white/20",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <AlertCircle
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-danger pointer-events-none"
          />
        )}
      </div>
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">{error}</p>
      )}
      {!error && hint && (
        <p className="text-xs text-text-secondary">{hint}</p>
      )}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label shown above the textarea */
  label?: string;
  /** Helper text shown below */
  hint?: string;
  /** Error message — triggers danger styling */
  error?: string;
}

/**
 * Kaboré OS textarea with label, hint, and error state.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = "", id, ...props },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-primary leading-none"
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={[
          "w-full px-3 py-2 rounded bg-surface border text-sm text-text-primary",
          "placeholder:text-text-secondary resize-y min-h-[80px]",
          "transition-colors duration-150 outline-none",
          "focus:ring-2 focus:ring-accent focus:border-transparent",
          error
            ? "border-danger focus:ring-danger"
            : "border-border hover:border-white/20",
          className,
        ].join(" ")}
        {...props}
      />
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">{error}</p>
      )}
      {!error && hint && (
        <p className="text-xs text-text-secondary">{hint}</p>
      )}
    </div>
  );
});
