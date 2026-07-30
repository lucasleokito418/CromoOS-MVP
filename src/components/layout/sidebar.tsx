"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Bell, HelpCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: { label: string; variant?: 'accent' | 'neutral' | 'count' };
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface SidebarProps {
  /** Navigation sections */
  sections: SidebarSection[];
  /** Currently active item key */
  activeKey: string;
  /** Callback when an item is selected */
  onSelect?: (key: string) => void;
  /** Logo/product name area */
  logoSlot?: React.ReactNode;
  /** Bottom slot (user info, settings, etc.) */
  bottomSlot?: React.ReactNode;
}

const STORAGE_KEY = "kaboreos_sidebar_collapsed";

/**
 * Kaboré OS retractable Sidebar.
 *
 * - Expanded: 240px — icon + label + section titles
 * - Collapsed: 64px — icon only + Tooltip on hover
 * - Persists expand/collapse state in localStorage
 * - Active item: neutral left bar + surface-hover background (brand lima is
 *   reserved for logo + primary button only, never for nav state)
 *
 * @example
 * <Sidebar sections={sections} activeKey="agenda" onSelect={setActive} logoSlot={<Logo />} />
 */
export function Sidebar({
  sections,
  activeKey,
  onSelect,
  logoSlot,
  bottomSlot,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Read persisted state after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setCollapsed(stored === "true");
    setMounted(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!mounted) {
    // Render a placeholder to avoid layout shift before hydration
    return (
      <aside
        className="shrink-0 w-[240px] bg-sidebar border-r border-border flex flex-col"
        aria-hidden="true"
      />
    );
  }

  return (
    <aside
      className={[
        "shrink-0 bg-sidebar border-r border-border flex flex-col",
        "transition-all duration-200 overflow-hidden",
        collapsed ? "w-16 sidebar-collapsed" : "w-60",
      ].join(" ")}
    >
      {/* Logo / product name */}
      <div
        className={[
          "flex items-center h-20 border-b border-border shrink-0",
          collapsed ? "justify-center" : "px-4 gap-3",
        ].join(" ")}
      >
        {React.isValidElement(logoSlot) ? (
          React.cloneElement(logoSlot as React.ReactElement<any>, { collapsed })
        ) : (
          logoSlot
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-0.5">
            {section.title && !collapsed && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = item.href
                ? (pathname === item.href || pathname.startsWith(item.href + '/'))
                : item.key === activeKey;

              const handleClick = () => {
                onSelect?.(item.key);
                item.onClick?.();
              };

              const content = (
                <>
                  {/* Active state bar — neutral, not brand lima */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-text-primary" />
                  )}
                  <span className="shrink-0 flex items-center justify-center w-5 h-5 relative">
                    {item.icon}
                    {collapsed && item.badge && (
                      <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent" />
                    )}
                  </span>
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0 ml-3">
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={[
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded leading-none shrink-0",
                            item.badge.variant === "accent"
                              ? "bg-accent text-accent-on"
                              : item.badge.variant === "neutral"
                              ? "bg-surface-hover text-text-secondary"
                              : "bg-surface-hover text-text-primary", // variant = count
                          ].join(" ")}
                        >
                          {item.badge.label}
                        </span>
                      )}
                    </div>
                  )}
                </>
              );

              const className = [
                "relative flex items-center w-full transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-inset",
                collapsed
                  ? "h-10 justify-center px-0"
                  : "h-10 px-4",
                isActive
                  ? "bg-surface-hover text-text-primary font-medium"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
              ].join(" ");

              const itemContent = item.href ? (
                <Link
                  href={item.href}
                  key={item.key}
                  className={className}
                  onClick={handleClick}
                  aria-current={isActive ? "page" : undefined}
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={item.key}
                  onClick={handleClick}
                  className={className}
                  aria-current={isActive ? "page" : undefined}
                >
                  {content}
                </button>
              );

              return collapsed ? (
                <Tooltip key={item.key} content={item.label} placement="right">
                  {itemContent}
                </Tooltip>
              ) : (
                <React.Fragment key={item.key}>{itemContent}</React.Fragment>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom slot (user, settings…) */}
          {bottomSlot && (
        <div className={[
          "border-t border-border py-3 flex items-center justify-between",
          collapsed ? "justify-center px-0" : "px-3 gap-2",
        ].join(" ")}>
          <div className={[
            "flex items-center min-w-0",
            collapsed ? "" : "flex-1",
          ].join(" ")}>
            {bottomSlot}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => console.log('Notificações')}
                className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Notificações"
              >
                <Bell size={16} />
              </button>
              <button
                onClick={() => console.log('Ajuda')}
                className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Ajuda"
              >
                <HelpCircle size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={toggle}
        className={[
          "flex items-center justify-center h-10 border-t border-border",
          "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
          "transition-colors duration-150 shrink-0",
        ].join(" ")}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ChevronRight size={16} />
        ) : (
          <div className="flex items-center gap-2 px-4 w-full">
            <ChevronLeft size={16} />
            <span className="text-xs">Recolher</span>
          </div>
        )}
      </button>
    </aside>
  );
}