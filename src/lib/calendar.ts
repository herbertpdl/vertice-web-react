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

/** Back to `yyyy-MM-dd` from the UTC parts, never from a formatted string. */
function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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

export function clampDate(isoDate: string, min?: string, max?: string): string {
  if (min && isoDate < min) return min;
  if (max && isoDate > max) return max;
  return isoDate;
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
  if (candidate.getUTCMonth() + 1 !== month || candidate.getUTCDate() !== day) return null;
  return toIsoDate(candidate);
}

/** Digits in, `dd/mm/aaaa` out — what the field shows while it is being typed into. */
export function maskBrDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];
  return parts.filter((part) => part.length > 0).join("/");
}
