"use client";

import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCount } from "@/lib/format";
import { Dropdown } from "../Dropdown";


interface PaginationProps<Size extends number> {
  pageSize: Size;
  pageSizes: readonly Size[];
  onPageSizeChange: (pageSize: Size) => void;
  /** The rows on screen (1-based, inclusive), or `null` when none are. */
  range: { from: number; to: number } | null;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** While a page is loading: both arrows wait, so a click can't skip a page. */
  busy?: boolean;
  className?: string;
}

const arrowClass =
  "flex h-[32px] w-[32px] items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:pointer-events-none disabled:opacity-35 md:border-transparent";

/**
 * A table footer's paging (pen.dev Admin Pagination `a8AGY` and the footer of `ETgH1`), adapted
 * to cursor paging (admin-panel spec W14): "Linhas por página", the rows on screen ("11–20") and
 * previous / next. No page numbers and no total, which cursors can't know. On a phone only the
 * range and the arrows show (`fXng6`).
 */
export function Pagination<Size extends number>({
  pageSize,
  pageSizes,
  onPageSizeChange,
  range,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  busy = false,
  className = "",
}: PaginationProps<Size>) {
  const labelId = useId();

  return (
    <div className={`font-base flex w-full items-center justify-between gap-[16px] ${className}`}>
      <div className="hidden items-center gap-[10px] md:flex">
        <span id={labelId} className="text-[12px] text-[color:var(--color-text-secondary)]">
          Linhas por página
        </span>
        <Dropdown
          size="sm"
          className="w-[84px]"
          labelledBy={labelId}
          options={pageSizes.map((size) => ({ value: String(size), label: String(size) }))}
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value) as Size)}
        />
      </div>
      <div className="flex w-full items-center justify-between gap-[16px] md:w-auto md:justify-end">
        <span aria-live="polite" className="text-[12px] text-[color:var(--color-text-secondary)]">
          {range ? `${formatCount(range.from)}–${formatCount(range.to)}` : ""}
        </span>
        <div className="flex items-center gap-[8px] md:gap-[4px]">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={!hasPrev || busy}
            onClick={onPrev}
            className={arrowClass}
          >
            <ChevronLeft aria-hidden="true" width={16} height={16} />
          </button>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={!hasNext || busy}
            onClick={onNext}
            className={arrowClass}
          >
            <ChevronRight aria-hidden="true" width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
