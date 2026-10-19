/**
 * Calendar-grid arithmetic for business dates (`yyyy-MM-dd`) — the month a date picker shows, the
 * six rows of seven it draws, and the `dd/mm/aaaa` text a trainer types into it.
 *
 * Same rule as `src/lib/format.ts`: a business date is a civil calendar day with no time and no
 * zone, so every computation here goes through `Date.UTC` and reads its result back through the
 * `getUTC*` accessors. Nothing consults the host's zone — the three numbers go in and come out —
 * which is what `npm run test:hostile-tz` proves by running `calendar.test.ts` at UTC+14 and
 * UTC-10. Formatting a business date for display stays in `format.ts`, the one place for it;
 * this module only does the arithmetic and the parse.
 */

/** A month of the calendar, with no day in it. */
export interface CalendarMonth {
  year: number;
  /** 1-12, not the `Date` constructor's 0-11. */
  month: number;
}

/** Rows the grid always draws, so paging through months never changes the popover's height. */
export const CALENDAR_ROWS = 6;
const DAYS_PER_WEEK = 7;

const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function civilDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Back to `yyyy-MM-dd` from the UTC parts, never from a formatted string. The year is padded to
 * four digits too: a business date compares and sorts as a plain string, so a three-digit year
 * would sort above every real one and would not match the `yyyy-MM-dd` shape the schemas check.
 */
function toIsoDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  return `${year}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function monthOf(isoDate: string): CalendarMonth {
  const [year, month] = isoDate.split("-").map(Number);
  return { year, month };
}

/** The first business date of a month, which is what the formatters in `format.ts` take. */
export function firstDayOfMonth({ year, month }: CalendarMonth): string {
  return `${year}-${pad(month)}-01`;
}

export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function addDays(isoDate: string, delta: number): string {
  const day = civilDay(isoDate);
  day.setUTCDate(day.getUTCDate() + delta);
  return toIsoDate(day);
}

/**
 * The grid for a month: `CALENDAR_ROWS` rows of seven consecutive business dates, column 0 being
 * Sunday to match `CALENDAR_DAY_ORDER`. It runs from the Sunday on or before the 1st to the
 * Saturday that completes the sixth row, so the rows the month itself doesn't reach are filled
 * with the neighbouring months' days (`isInMonth` tells them apart) rather than left blank. Six
 * rows always: a month that happens to fit in five — October 2026 does — would otherwise draw an
 * empty strip, and a grid sized to each month would resize the popover as you page through it.
 */
export function monthGrid(month: CalendarMonth): string[][] {
  const first = new Date(Date.UTC(month.year, month.month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());

  const cells = Array.from({ length: CALENDAR_ROWS * DAYS_PER_WEEK }, (_, offset) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + offset);
    return toIsoDate(day);
  });

  return Array.from({ length: CALENDAR_ROWS }, (_, row) =>
    cells.slice(row * DAYS_PER_WEEK, (row + 1) * DAYS_PER_WEEK),
  );
}

/** Whether a grid cell belongs to the month the grid is drawn for, or to a neighbour. */
export function isInMonth(isoDate: string, { year, month }: CalendarMonth): boolean {
  return isoDate.startsWith(`${year}-${pad(month)}-`);
}

/**
 * Business dates compare and sort as plain strings — that is the whole point of the format — so
 * the bounds check is a string comparison, with no `Date` anywhere near it.
 */
export function isWithin(isoDate: string, min?: string, max?: string): boolean {
  if (min && isoDate < min) return false;
  if (max && isoDate > max) return false;
  return true;
}

/**
 * Applied in order rather than as two early returns, so crossed bounds (`min` after `max`, which
 * a caller can produce transiently while both ends of a range are being edited) still resolve to
 * `max` instead of returning a date above it.
 */
export function clampDate(isoDate: string, min?: string, max?: string): string {
  let clamped = isoDate;
  if (min && clamped < min) clamped = min;
  if (max && clamped > max) clamped = max;
  return clamped;
}

/**
 * `dd/mm/aaaa` as the trainer types it, to a business date — or `null` when it isn't one yet, or
 * names a day that doesn't exist (31/02/2026). Round-tripping through `Date.UTC` is what rejects
 * the latter: February 31st comes back out as March 3rd.
 */
export function parseBrDate(text: string): string | null {
  const match = BR_DATE.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  if (month < 1 || month > 12 || day < 1) return null;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  // The year is checked along with the rest because `Date.UTC` maps 0-99 onto 1900-1999: without
  // this, `01/01/0026` — a plausible slip for 2026 — would be accepted and stored as 1926.
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return toIsoDate(candidate);
}

/** How many digits each of `dd`, `mm` and `aaaa` holds. */
const SEGMENT_LENGTHS = [2, 2, 4];
const TOTAL_DIGITS = SEGMENT_LENGTHS.reduce((sum, length) => sum + length, 0);

/**
 * What the field shows while it is being typed into.
 *
 * Each `/`-delimited segment is filled in turn, so an edit inside one leaves the ones after it
 * alone. Re-deriving the whole string from the digit stream instead would make a backspace in
 * `31/10/2026` reflow every later digit into `31/02/026` — mangling the month and year to fix
 * the day, which is the most likely edit there is on a date that is already filled in.
 *
 * Overflow carries into the next segment only while the text could still *become* a date: that
 * is what lays the separators into a bare digit stream (typing from empty, or a paste) and what
 * puts a deleted `/` back. Once a text that already has separators holds more than eight digits,
 * a full segment has been typed into, so the extra digit is dropped rather than carried — a `3`
 * typed at the start of `31/10/2026` must not cascade into `33/11/0202`.
 */
export function maskBrDate(text: string): string {
  const cleaned = text.replace(/[^\d/]/g, "");
  const parts = cleaned.split("/");
  const carries = parts.length === 1 || cleaned.replace(/\//g, "").length <= TOTAL_DIGITS;

  const segments: string[] = [];
  let carry = "";
  for (const [index, length] of SEGMENT_LENGTHS.entries()) {
    const available = (carries ? carry : "") + (parts[index] ?? "");
    segments.push(available.slice(0, length));
    carry = available.slice(length);
  }

  // Drop the empty tail, so a half-typed date carries no trailing separators...
  while (segments.length > 1 && segments[segments.length - 1] === "") segments.pop();
  const last = segments.length - 1;
  // ...but close a segment that is full, so the next digit lands in the one after it.
  const closed = last < SEGMENT_LENGTHS.length - 1 && segments[last].length === SEGMENT_LENGTHS[last];
  return segments.join("/") + (closed ? "/" : "");
}

/**
 * Where the caret belongs in a freshly masked string, given how many digits preceded it before
 * the edit. Without this the caret jumps to the end on every keystroke that is not an append.
 */
export function caretAfterDigits(masked: string, digits: number): number {
  if (digits <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] >= "0" && masked[index] <= "9") {
      seen += 1;
      if (seen === digits) return index + 1;
    }
  }
  return masked.length;
}

/** Digits in `text` before `caret` — the position that survives a re-mask. */
export function countDigitsBefore(text: string, caret: number): number {
  return (text.slice(0, caret).match(/\d/g) ?? []).length;
}
