"use client";

import React from "react";

export interface TabItem {
  /** Unique identifier */
  key: string;
  /** Display label */
  label: string;
  /** Optional icon before the label */
  icon?: React.ReactNode;
  /** Disables the tab */
  disabled?: boolean;
}

interface TabsProps {
  /** Tab definitions */
  tabs: TabItem[];
  /** Currently active tab key */
  activeKey: string;
  /** Callback when a tab is clicked */
  onChange: (key: string) => void;
  className?: string;
}

/**
 * Kaboré OS horizontal Tabs. Active tab has a neutral underline (not brand color —
 * lima is reserved for brand mark + primary action only).
 *
 * @example
 * <Tabs tabs={[{key:'a', label:'Resumo'}]} activeKey={active} onChange={setActive} />
 */
export function Tabs({ tabs, activeKey, onChange, className = "" }: TabsProps) {
  return (
    <div
      className={[
        "flex items-end gap-0 border-b border-border overflow-x-auto",
        className,
      ].join(" ")}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.key)}
            className={[
              "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium",
              "transition-colors duration-150 whitespace-nowrap shrink-0",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              isActive
                ? "text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            ].join(" ")}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {/* Active underline — neutral, not brand color */}
            <span
              className={[
                "absolute bottom-0 left-4 right-4 h-0.5 rounded-t transition-opacity duration-150",
                isActive ? "bg-text-primary opacity-100" : "opacity-0",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}