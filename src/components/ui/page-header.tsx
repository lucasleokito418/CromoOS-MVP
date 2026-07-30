"use client";

import React from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  helpTooltip?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  helpTooltip,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-8 ${className}`}>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-oswald text-3xl font-semibold text-text-primary tracking-wide uppercase">
            {title}
          </h1>
          {helpTooltip && (
            <Tooltip content={helpTooltip} placement="right">
              <button
                type="button"
                className="text-text-secondary hover:text-text-primary transition-colors p-0.5 focus-visible:outline-none focus:ring-1 focus:ring-accent rounded-full"
                aria-label="Ajuda contextual"
              >
                <HelpCircle size={16} />
              </button>
            </Tooltip>
          )}
        </div>
        {subtitle && (
          <p className="text-text-secondary text-sm leading-normal">
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}
