"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyStateIllustration } from "./empty-state-illustration";

export interface Column<T> {
  /** Unique key matching a field in T or a custom accessor */
  key: string;
  /** Column header label */
  label: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell value */
  render?: (row: T) => React.ReactNode;
  /** Alignment of the cell content */
  align?: "left" | "center" | "right";
}

interface TableProps<T extends object> {
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  data: T[];
  /** Key field for React list rendering */
  rowKey: keyof T;
  /** Empty state icon (defaults to inbox icon) */
  emptyIcon?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Enable pagination */
  paginated?: boolean;
  /** Rows per page */
  pageSize?: number;
  /** Extra class for the wrapper */
  className?: string;
  /** When true, renders skeleton rows instead of data */
  loading?: boolean;
}

type SortDir = "asc" | "desc";

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

/** Computes which page-number buttons to show, clamped correctly for small totals. */
function getPageWindow(page: number, totalPages: number, maxButtons = 5): number[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  let end = start + maxButtons - 1;
  if (end > totalPages) {
    end = totalPages;
    start = end - maxButtons + 1;
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Kaboré OS data Table with sorting, empty state, and optional pagination.
 *
 * @example
 * <Table columns={cols} data={rows} rowKey="id" paginated pageSize={10} />
 */
export function Table<T extends object>({
  columns,
  data,
  rowKey,
  emptyIcon,
  emptyMessage = "Nenhum resultado encontrado",
  paginated = false,
  pageSize = 10,
  className = "",
  loading = false,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const sorted = sortKey
    ? [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av === bv) return 0;
      const cmp = av! < bv! ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    })
    : data;

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = paginated ? sorted.slice((page - 1) * pageSize, page * pageSize) : sorted;
  const pageWindow = useMemo(() => getPageWindow(page, totalPages, 5), [page, totalPages]);

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null;
    if (sortKey !== col.key)
      return <ChevronsUpDown size={12} className="opacity-0 group-hover:opacity-50" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-text-primary" />
    ) : (
      <ArrowDown size={12} className="text-text-primary" />
    );
  };

  return (
    <div className={`flex flex-col gap-0 overflow-hidden rounded border border-border ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    "px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wide",
                    "whitespace-nowrap group",
                    col.sortable ? "cursor-pointer hover:text-text-primary select-none" : "",
                    alignClass[col.align ?? "left"],
                  ].join(" ")}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-border/60 last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div
                        className={[
                          "h-4 rounded animate-pulse bg-surface-hover",
                          col.align === "right" ? "ml-auto" : "",
                          col.align === "center" ? "mx-auto" : "",
                        ].join(" ")}
                        style={{ width: `${55 + ((i * 17 + col.key.length * 7) % 30)}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-16 text-center text-text-secondary"
                >
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-text-secondary/40">
                      {emptyIcon ?? <EmptyStateIllustration size={60} />}
                    </span>
                    <span className="text-sm">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr
                  key={String(row[rowKey])}
                  className="border-b border-border/60 hover:bg-surface-hover transition-colors duration-100 last:border-0"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        "px-4 py-3 text-text-primary",
                        alignClass[col.align ?? "left"],
                      ].join(" ")}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && paginated && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface">
          <span className="text-xs text-text-secondary">
            Página {page} de {totalPages} · {sorted.length} registros
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={[
                  "w-7 h-7 text-xs rounded transition-colors",
                  p === page
                    ? "bg-text-primary text-canvas font-medium"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}