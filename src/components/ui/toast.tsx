"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; border: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    border: "border-l-success",
    iconColor: "text-success",
  },
  error: {
    icon: <XCircle size={16} />,
    border: "border-l-danger",
    iconColor: "text-danger",
  },
  info: {
    icon: <Info size={16} />,
    border: "border-l-info",
    iconColor: "text-info",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    border: "border-l-warning",
    iconColor: "text-warning",
  },
};

/**
 * Wrap your app (or a layout) with ToastProvider, then call `useToast()` to show toasts.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((ts) => [...ts, { ...opts, id }]);
    const dur = opts.durationMs ?? 4000;
    if (dur > 0) {
      setTimeout(() => dismiss(id), dur);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const { icon, border, iconColor } = variantConfig[t.variant];

  useEffect(() => {
    // Trigger enter animation
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="alert"
      className={[
        "pointer-events-auto bg-surface border border-border border-l-4 rounded shadow-lg",
        "flex items-start gap-3 px-3.5 py-3 transition-all duration-200",
        border,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      ].join(" ")}
    >
      <span className={`shrink-0 mt-0.5 ${iconColor}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary leading-snug">{t.title}</p>
        {t.description && (
          <p className="text-xs text-text-secondary mt-0.5 leading-snug">{t.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 p-0.5 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
        aria-label="Fechar notificação"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * Hook to trigger toasts from any component inside ToastProvider.
 *
 * @example
 * const { toast } = useToast();
 * toast({ variant: 'success', title: 'Salvo!', durationMs: 3000 });
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
