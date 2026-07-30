"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Called when the modal should close */
  onClose: () => void;
  /** Title shown in the header */
  title: string;
  /** Content inside the modal body */
  children: React.ReactNode;
  /** Footer content (usually action buttons) */
  footer?: React.ReactNode;
  /** Max width class (default max-w-md) */
  maxWidthClass?: string;
}

/**
 * Kaboré OS Modal — centered overlay. Use only for short confirmations.
 * For viewing/editing records, use the Drawer instead.
 *
 * @example
 * <Modal open={open} onClose={close} title="Excluir registro?" footer={<Button variant="destructive">Excluir</Button>}>
 *   Esta ação não pode ser desfeita.
 * </Modal>
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={[
          "relative w-full bg-surface border border-border rounded shadow-lg",
          "flex flex-col animate-[fadeIn_0.15s_ease-out]",
          maxWidthClass,
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-5 py-4 text-sm text-text-secondary leading-relaxed">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
