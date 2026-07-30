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
  /** Max width of the drawer panel (default 480px) */
  maxWidth?: number;
}

/**
 * Kaboré OS Drawer — slides in from the right.
 * Use for "view details" and "edit record" flows. Reserve Modal for short confirmations.
 *
 * @example
 * <Drawer open={open} onClose={close} title="Editar agendamento" footer={<Button>Salvar</Button>}>
 *   <form>...</form>
 * </Drawer>
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
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: `${maxWidth}px` }}
        className={[
          "fixed top-0 right-0 bottom-0 z-50 w-full bg-surface border-l border-border",
          "flex flex-col shadow-lg",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-semibold text-text-primary leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-text-secondary">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors shrink-0"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
