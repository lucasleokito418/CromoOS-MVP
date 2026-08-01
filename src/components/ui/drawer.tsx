"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  /** Whether the drawer is visible */
  open: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Main title in the header */
  title: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Content inside the scrollable body */
  children: React.ReactNode;
  /** Optional fixed footer (e.g., Save/Cancel actions) */
  footer?: React.ReactNode;
  /** Max width of the drawer panel (default 480px on desktop, 100% on mobile) */
  maxWidth?: number;
}

/**
 * Kaboré OS Drawer — slides in from the right.
 * On mobile (< md): Fullscreen (100% width & height), header and footer pinned, body scrollable.
 * On desktop (>= md): Panel with configured maxWidth (default 480px) and backdrop.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 480,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Trap body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay (Desktop apenas — no mobile é fullscreen sem overlay atrás) */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 hidden md:block",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: `min(100vw, ${maxWidth}px)` }}
        className={[
          "fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 w-full h-full md:h-auto bg-surface border-l-0 md:border-l border-border",
          "flex flex-col shadow-lg",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header (Fixo no topo) */}
        <div className="flex items-start justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0 pr-2">
            <h2 className="text-base font-semibold text-text-primary leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-text-secondary truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (Scrollável entre topo e rodapé) */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>

        {/* Footer (Fixo no rodapé se houver) */}
        {footer && (
          <div className="px-4 py-3 md:px-6 md:py-4 border-t border-border shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
