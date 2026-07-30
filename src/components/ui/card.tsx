"use client";

import React from "react";

interface CardProps {
  /** Optional header content */
  header?: React.ReactNode;
  /** Optional footer content */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Padding inside the card body (defaults to p-5) */
  padding?: string;
}

/**
 * Kaboré OS Card container.
 *
 * @example
 * <Card header={<h2>Título</h2>}>Conteúdo do card</Card>
 */
export function Card({
  header,
  footer,
  children,
  className = "",
  padding = "p-5",
}: CardProps) {
  return (
    <div
      className={[
        "bg-surface border border-border rounded shadow-sm flex flex-col",
        className,
      ].join(" ")}
    >
      {header && (
        <div className="px-5 pt-4 pb-3 border-b border-border">{header}</div>
      )}
      <div className={[padding, "flex-1"].join(" ")}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-border">{footer}</div>
      )}
    </div>
  );
}
