import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TableRowSkeleton } from "../TableRowSkeleton";

export interface DataTableColumn<T> {
  key: string;
  /** Shown upper-case, as the frames' head rows are. */
  header: string;
  /** Fixed width in px. Leave it out on the one column that takes the rest (e.g. "E-mail"). */
  width?: number;
  align?: "start" | "end";
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  /** The table's accessible name. */
  label: string;
  columns: DataTableColumn<T>[];
  /** `undefined` while nothing has loaded yet. */
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  /** Skeleton rows instead of `rows` (`TableRowSkeleton`, frame `U8EYgf`). */
  loading?: boolean;
  loadingRows?: number;
  /** Shown when `rows` is empty (see `DataTableMessage`). */
  empty?: ReactNode;
  /** Shown instead of the rows when the list could not load. */
  error?: ReactNode;
  /**
   * The phone layout of a row (frame `fXng6`): below `md` the table becomes a list of these, each
   * under a divider. Make it the whole row (a link, when the row opens something).
   */
  mobileRow: (row: T) => ReactNode;
  /** Under the rows, behind a divider: usually `Pagination`. */
  footer?: ReactNode;
  /**
   * Above the head row, inside the card and behind a divider: a title and filters (the
   * dashboard's "Exercícios mais usados" head, `En3Ju`). The caller pads it.
   */
  header?: ReactNode;
  className?: string;
}

const cellPadding = "px-[var(--space-5)]";

/**
 * The admin tables' card (the table cards of pen.dev `ETgH1`, `c53jx`, `TExWT`): a head row of
 * small upper-case labels, rows under dividers, loading, empty and error states in place of the
 * rows, and a footer. On a phone it stacks into `mobileRow` items. Rows carry no link of their
 * own, so a cell can hold several (a name and "Ver perfil").
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  loading = false,
  loadingRows = 8,
  empty,
  error,
  mobileRow,
  footer,
  header,
  className = "",
}: DataTableProps<T>) {
  const widthStyle = (column: DataTableColumn<T>) =>
    column.width === undefined ? { flex: "1 1 0%", minWidth: 0 } : { width: column.width, flexShrink: 0 };
  const alignClass = (column: DataTableColumn<T>) =>
    column.align === "end" ? "justify-end text-right" : "";

  const shown = !error && !loading && rows !== undefined ? rows : [];
  const hasRows = shown.length > 0;

  let state: ReactNode = null;
  if (error) {
    state = error;
  } else if (loading || rows === undefined) {
    state = (
      <div aria-busy="true" aria-label="Carregando">
        {Array.from({ length: loadingRows }, (_, i) => (
          <TableRowSkeleton key={i} className="border-t border-[var(--color-border)]" />
        ))}
      </div>
    );
  } else if (rows.length === 0) {
    state = empty;
  }

  return (
    <div
      className={`font-base flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
    >
      {header && <div className="border-b border-[var(--color-border)] md:border-b-0">{header}</div>}
      <div
        role="table"
        aria-label={label}
        className={`hidden w-full flex-col md:flex ${header ? "border-t border-[var(--color-border)]" : ""}`}
      >
        <div role="rowgroup">
          <div role="row" className={`flex w-full items-center gap-[var(--space-4)] py-[12px] ${cellPadding}`}>
            {columns.map((column) => (
              <div
                key={column.key}
                role="columnheader"
                style={widthStyle(column)}
                className={`flex text-[10px] font-semibold tracking-[0.6px] text-[color:var(--color-text-tertiary)] uppercase ${alignClass(column)}`}
              >
                {column.header}
              </div>
            ))}
          </div>
        </div>
        {hasRows && (
          <div role="rowgroup">
            {shown.map((row) => (
              <div
                key={rowKey(row)}
                role="row"
                className={`flex w-full items-center gap-[var(--space-4)] border-t border-[var(--color-border)] py-[12px] ${cellPadding}`}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    role="cell"
                    style={widthStyle(column)}
                    className={`flex min-w-0 items-center ${alignClass(column)}`}
                  >
                    {column.cell(row)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {hasRows && (
        <ul aria-label={label} className="md:hidden">
          {shown.map((row, index) => (
            <li
              key={rowKey(row)}
              className={index > 0 ? "border-t border-[var(--color-border)]" : ""}
            >
              {mobileRow(row)}
            </li>
          ))}
        </ul>
      )}
      {state !== null && (
        <div className="border-[var(--color-border)] md:border-t">{state}</div>
      )}
      {footer && (
        <div className="border-t border-[var(--color-border)] px-[14px] py-[10px] md:px-[var(--space-5)] md:py-[12px]">
          {footer}
        </div>
      )}
    </div>
  );
}

interface DataTableMessageProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** E.g. "Limpar filtros" or "Tentar novamente". */
  action?: ReactNode;
  /** `alert` for an error, so it is announced. */
  role?: "status" | "alert";
}

/** A table's empty or error state (the "busca sem resultado" frames `BVZe4`, `ZCKW9`). */
export function DataTableMessage({
  icon: Icon,
  title,
  description,
  action,
  role = "status",
}: DataTableMessageProps) {
  return (
    <div
      role={role}
      className="font-base flex w-full flex-col items-center gap-[8px] px-[var(--space-5)] py-[56px] text-center"
    >
      <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-hover)]">
        <Icon aria-hidden="true" width={20} height={20} className="text-[color:var(--color-text-secondary)]" />
      </span>
      <p className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)]">
        {title}
      </p>
      {description && (
        <p className="text-[13px] text-[color:var(--color-text-secondary)]">{description}</p>
      )}
      {action && <div className="pt-[8px]">{action}</div>}
    </div>
  );
}
