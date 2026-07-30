"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  /** Label shown above the select */
  label?: string;
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** List of options */
  options: SelectOption[];
  /** Placeholder shown when no value is selected */
  placeholder?: string;
  /** Enables a search box inside the dropdown */
  searchable?: boolean;
  /** Helper text below the select */
  hint?: string;
  /** Error message */
  error?: string;
  /** Disables the select */
  disabled?: boolean;
  /** Extra class for the wrapper */
  className?: string;
}

/**
 * Kaboré OS custom Select (not a native <select>).
 * Supports optional search, error state, and keyboard navigation.
 *
 * @example
 * <Select label="Status" options={[{value:'a', label:'Ativo'}]} value={v} onChange={setV} />
 */
export function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione...",
  searchable = false,
  hint,
  error,
  disabled = false,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const handleOpen = () => {
    if (disabled) return;
    setOpen((v) => !v);
  };

  const handleSelect = useCallback(
    (opt: SelectOption) => {
      if (opt.disabled) return;
      onChange?.(opt.value);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  return (
    <div ref={containerRef} className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-sm font-medium text-text-primary leading-none">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={[
            "w-full h-9 px-3 rounded bg-surface border text-sm text-left",
            "flex items-center justify-between gap-2",
            "transition-colors duration-150 outline-none",
            "focus:ring-2 focus:ring-accent focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error
              ? "border-danger"
              : open
              ? "border-accent ring-2 ring-accent"
              : "border-border hover:border-white/20",
            selected ? "text-text-primary" : "text-text-secondary",
          ].join(" ")}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-text-secondary transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-surface border border-border rounded shadow-lg overflow-hidden">
            {searchable && (
              <div className="p-2 border-b border-border">
                <div className="relative">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                  />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full h-7 pl-7 pr-2 text-xs bg-canvas border border-border rounded outline-none text-text-primary placeholder:text-text-secondary focus:border-accent"
                  />
                </div>
              </div>
            )}
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-text-secondary">
                  Nenhuma opção encontrada
                </li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className={[
                      "flex items-center justify-between px-3 py-2 text-sm cursor-pointer",
                      "transition-colors duration-100",
                      opt.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-surface-hover",
                      opt.value === value
                        ? "text-text-primary"
                        : "text-text-secondary",
                    ].join(" ")}
                  >
                    <span>{opt.label}</span>
                    {opt.value === value && (
                      <Check size={13} className="text-accent shrink-0" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-text-secondary">{hint}</p>}
    </div>
  );
}
