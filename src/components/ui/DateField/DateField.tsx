"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { CALENDAR_DAY_ORDER, DAY_INITIAL, DAY_NAMES } from "@/lib/days";
import {
  addDays,
  clampDate,
  firstDayOfMonth,
  isInMonth,
  isWithin,
  maskBrDate,
  monthGrid,
  monthOf,
  parseBrDate,
  shiftMonth,
  type CalendarMonth,
} from "@/lib/calendar";
import { formatDateLong, formatDateNumeric, formatMonthYear, todayLocalIso } from "@/lib/format";

interface DateFieldProps {
  label?: string;
  /** A business date, `yyyy-MM-dd`, or `""` when the field is empty. Never a `Date`. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Inclusive bounds, also business dates — days outside them can't be picked. */
  min?: string;
  max?: string;
  name?: string;
  id?: string;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  className?: string;
}

type Placement = "bottom" | "top";

interface PopoverPosition {
  top: number;
  left: number;
  placement: Placement;
}

const POPOVER_WIDTH = 288;
/** Clearance between the field and the popover, and from the viewport edge. */
const POPOVER_GAP = 6;

/**
 * A business-date field: a text box that takes `dd/mm/aaaa` plus a calendar popover built from
 * the design system's own tokens.
 *
 * It deliberately does *not* use `<input type="date">`. That control opens an unstyled, browser-
 * drawn calendar that no token can reach, only from a click on its own indicator glyph (not from
 * a click on the field), and it renders the date in the *browser's* locale, so a trainer running
 * Chrome in en-US saw `mm/dd/yyyy` inside a pt-BR app. Typing still works here — the box is a
 * real text input, masked as you go — and the popover is the pointer affordance, so nothing is
 * reachable by mouse only.
 *
 * The popover is portaled to <body> and positioned `fixed` for the same reason `Dropdown`'s menu
 * is: `Dialog`'s panel is `overflow-y-auto`, and an `absolute` child of it gets clipped.
 */
export function DateField({
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
  name,
  id,
  error,
  helpText,
  disabled,
  className = "",
}: DateFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  // What is in the box while it is being typed into. `null` means "show `value`", so an
  // incomplete or impossible entry (31/02/2026) snaps back to the committed date on blur.
  const [draft, setDraft] = useState<string | null>(null);
  // The day the grid's roving focus sits on. `null` means "derive it from `value`", so opening
  // the popover always lands on the selected day (or today) without an effect resetting state.
  const [focusedDate, setFocusedDate] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // A day the keyboard just moved to, which the effect below hands focus after the next render.
  // Only the keyboard sets it: a pointer user keeps the caret in the text box and can go on
  // typing while the popover is open.
  const pendingFocusRef = useRef<string | null>(null);

  const today = todayLocalIso();
  const text = draft ?? (value ? formatDateNumeric(value) : "");
  /** The day the grid's roving focus sits on, and the month it therefore shows. */
  const activeDate = clampDate(focusedDate ?? (value || today), min, max);
  const shownMonth = monthOf(activeDate);

  // Measured in a layout effect so the popover never paints at (0,0) first; re-measured on
  // resize and on any ancestor's scroll, capture-phase, exactly as `Dropdown` does.
  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const field = fieldRef.current;
      const popover = popoverRef.current;
      if (!field || !popover) return;
      const rect = field.getBoundingClientRect();
      const height = popover.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: Placement =
        height + POPOVER_GAP > spaceBelow && rect.top > spaceBelow ? "top" : "bottom";
      const left = Math.max(
        POPOVER_GAP,
        Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - POPOVER_GAP),
      );
      setPosition({
        left,
        top:
          placement === "bottom" ? rect.bottom + POPOVER_GAP : rect.top - height - POPOVER_GAP,
        placement,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
      setPosition(null);
    };
  }, [open]);

  // Roving focus: the one tabbable cell is the active day, and it takes focus after any keyboard
  // move — including the one that opened the popover, which renders the grid in the same pass.
  useEffect(() => {
    if (!open) return;
    const pending = pendingFocusRef.current;
    if (pending === null) return;
    pendingFocusRef.current = null;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pending}"]`)?.focus();
  }, [open, focusedDate]);

  // The popover isn't a DOM descendant of the container, so an outside click has to check both.
  // Guarding on the refs is also what keeps this from racing the field's own pointerdown.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function close({ focusInput = false } = {}) {
    setOpen(false);
    setFocusedDate(null);
    if (focusInput) inputRef.current?.focus();
  }

  function commit(isoDate: string) {
    onChange(isoDate);
    setDraft(null);
    close({ focusInput: true });
  }

  function handleTextChange(event: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskBrDate(event.target.value);
    setDraft(masked);
    const parsed = parseBrDate(masked);
    onChange(parsed && isWithin(parsed, min, max) ? parsed : "");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      // Claim the Escape so the enclosing `Dialog` — which listens on `document`, the same node
      // the App Router dispatches React events from — doesn't also close itself.
      event.preventDefault();
      event.stopPropagation();
      close({ focusInput: true });
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      focusDay(activeDate);
      setOpen(true);
    }
  }

  function handleBlur(event: React.FocusEvent<HTMLElement>) {
    const next = event.relatedTarget as Node | null;
    if (containerRef.current?.contains(next) || popoverRef.current?.contains(next)) return;
    setDraft(null);
    setOpen(false);
    onBlur?.();
  }

  /** Move the roving focus and hand the keyboard the cell it lands on. */
  function focusDay(isoDate: string) {
    const target = clampDate(isoDate, min, max);
    pendingFocusRef.current = target;
    setFocusedDate(target);
  }

  function moveFocus(delta: number) {
    focusDay(addDays(activeDate, delta));
  }

  /** Paging with the ‹ › buttons only re-renders the grid; it must not steal the caret. */
  function goToMonth(month: CalendarMonth) {
    setFocusedDate(clampDate(firstDayOfMonth(month), min, max));
  }

  function handleGridKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-7);
        break;
      case "ArrowDown":
        event.preventDefault();
        moveFocus(7);
        break;
      case "PageUp":
        event.preventDefault();
        focusDay(firstDayOfMonth(shiftMonth(shownMonth, -1)));
        break;
      case "PageDown":
        event.preventDefault();
        focusDay(firstDayOfMonth(shiftMonth(shownMonth, 1)));
        break;
      case "Tab":
        // Focus is inside the portal at the end of <body>; hand it back to the field first so
        // the default Tab continues from there.
        close({ focusInput: true });
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`font-base flex flex-col gap-[6px] ${disabled ? "opacity-35" : ""} ${className}`}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      {label && (
        <label
          htmlFor={fieldId}
          className="text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <div
        ref={fieldRef}
        onPointerDown={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={`flex w-full items-center gap-2 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-[14px] py-[10px] transition-colors focus-within:border-[var(--color-primary)] ${
          error
            ? "border-[var(--color-danger)]"
            : open
              ? "border-[var(--color-primary)]"
              : "border-[var(--color-border)]"
        }`}
      >
        <input
          ref={inputRef}
          id={fieldId}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder="dd/mm/aaaa"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleInputKeyDown}
          // A text box that owns a popover is a combobox, which is the role that makes
          // `aria-expanded` meaningful on it.
          role="combobox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helpText ? `${fieldId}-hint` : undefined}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? `${fieldId}-calendar` : undefined}
          className="w-full bg-transparent text-[length:var(--text-base)] text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)]"
        />
        <Calendar
          width={16}
          height={16}
          aria-hidden="true"
          className="shrink-0 text-[color:var(--color-text-secondary)]"
        />
      </div>
      {(error || helpText) && (
        <span
          id={`${fieldId}-hint`}
          className={`text-[11px] ${
            error ? "text-[color:var(--color-danger)]" : "text-[color:var(--color-text-tertiary)]"
          }`}
        >
          {error || helpText}
        </span>
      )}
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={popoverRef}
            id={`${fieldId}-calendar`}
            role="dialog"
            aria-label="Calendário"
            style={{
              top: position?.top,
              left: position?.left,
              width: POPOVER_WIDTH,
              visibility: position ? "visible" : "hidden",
            }}
            className="font-base fixed z-[60] flex flex-col gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[var(--space-3)]"
          >
            <div className="flex items-center justify-between gap-[var(--space-2)]">
              <CalendarNavButton
                label="Mês anterior"
                onClick={() => goToMonth(shiftMonth(shownMonth, -1))}
              >
                <ChevronLeft width={16} height={16} />
              </CalendarNavButton>
              <span
                aria-live="polite"
                className="text-[length:var(--text-base)] font-semibold text-[color:var(--color-text-primary)] first-letter:uppercase"
              >
                {formatMonthYear(firstDayOfMonth(shownMonth))}
              </span>
              <CalendarNavButton
                label="Próximo mês"
                onClick={() => goToMonth(shiftMonth(shownMonth, 1))}
              >
                <ChevronRight width={16} height={16} />
              </CalendarNavButton>
            </div>
            <div className="grid grid-cols-7 gap-[2px]">
              {CALENDAR_DAY_ORDER.map((day) => (
                <abbr
                  key={day}
                  title={DAY_NAMES[day]}
                  className="flex h-6 items-center justify-center text-[11px] font-semibold text-[color:var(--color-text-tertiary)] no-underline"
                >
                  {DAY_INITIAL[day]}
                </abbr>
              ))}
            </div>
            <div ref={gridRef} onKeyDown={handleGridKeyDown} className="grid grid-cols-7 gap-[2px]">
              {monthGrid(shownMonth)
                .flat()
                .map((date) => (
                  <CalendarDay
                    key={date}
                    date={date}
                    selected={date === value}
                    today={date === today}
                    active={date === activeDate}
                    outside={!isInMonth(date, shownMonth)}
                    disabled={!isWithin(date, min, max)}
                    onSelect={commit}
                  />
                ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function CalendarNavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onClick={onClick}
      // Keep the caret where it is: a mousedown that moves focus out of the field would fire the
      // container's blur handler and close the popover before this button's click lands.
      onMouseDown={(event) => event.preventDefault()}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-text-primary)]"
    >
      {children}
    </button>
  );
}

function CalendarDay({
  date,
  selected,
  today,
  active,
  outside,
  disabled,
  onSelect,
}: {
  date: string;
  selected: boolean;
  today: boolean;
  active: boolean;
  /** A day of the previous or next month, filling out the six rows. */
  outside: boolean;
  disabled: boolean;
  onSelect: (date: string) => void;
}) {
  const state = selected
    ? "bg-[var(--color-primary)] text-[color:var(--color-primary-text)] font-semibold"
    : disabled
      ? "text-[color:var(--color-text-tertiary)] opacity-40"
      : today
        ? "border border-[var(--color-primary)] text-[color:var(--color-primary)] hover:bg-[var(--color-surface-hover)]"
        : outside
          ? "text-[color:var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)]"
          : "text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]";

  return (
    <button
      type="button"
      data-date={date}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      aria-current={today ? "date" : undefined}
      aria-pressed={selected}
      aria-label={formatDateLong(date)}
      onClick={() => onSelect(date)}
      onMouseDown={(event) => event.preventDefault()}
      className={`flex h-9 items-center justify-center rounded-[var(--radius-sm)] text-[length:var(--text-sm)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)] disabled:cursor-default ${state}`}
    >
      {Number(date.slice(8, 10))}
    </button>
  );
}
