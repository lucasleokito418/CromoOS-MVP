"use client";

import React, { useState, useRef, useEffect } from "react";

interface TooltipProps {
  /** Text shown in the tooltip */
  content: React.ReactNode;
  children: React.ReactElement;
  /** Placement relative to the trigger */
  placement?: "top" | "bottom" | "left" | "right";
  /** Delay before showing (ms) */
  delayMs?: number;
  className?: string;
}

/**
 * Kaboré OS Tooltip. Wraps any child and shows on hover.
 * Used primarily for sidebar icon labels when collapsed.
 *
 * @example
 * <Tooltip content="Agendamentos"><button>...</button></Tooltip>
 */
export function Tooltip({
  content,
  children,
  placement = "right",
  delayMs = 120,
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timer.current = setTimeout(() => setVisible(true), delayMs);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const positionClass: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClass: Record<string, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-0 border-t-surface",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-0 border-b-surface",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-0 border-l-surface",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-0 border-r-surface",
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={[
            "absolute z-50 pointer-events-none",
            positionClass[placement],
          ].join(" ")}
        >
          <div className="bg-surface border border-border rounded px-2.5 py-1.5 text-xs text-text-primary shadow-lg whitespace-nowrap">
            {content}
          </div>
          {/* Arrow */}
          <div
            className={[
              "absolute w-0 h-0 border-4",
              arrowClass[placement],
            ].join(" ")}
          />
        </div>
      )}
    </div>
  );
}
