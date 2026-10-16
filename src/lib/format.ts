/**
 * Display formatting, and with it the business time zone (P2-02, audit XREPO-006 / REL-API-008).
 *
 * The rule is vertice-api's — its
 * [`README.md`](https://github.com/herbertpdl/vertice-api/blob/main/README.md) ("Dates and times")
 * and [`CLAUDE.md`](https://github.com/herbertpdl/vertice-api/blob/main/CLAUDE.md) ("Time: instants
 * vs. business dates") are the source of truth, and
 * [`vertice-bff/docs/api-contract.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
 * ("Dates and times") restates it for clients. Every date-ish field the BFF answers is one of
 * exactly two kinds, and they are formatted differently:
 *
 * - An **instant** (`createdAt`, `completedAt`, `recordedAt`, `startedAt`, `lastWorkoutAt`,
 *   `expiresAt`, ...) is an absolute point in time, ISO-8601 with `Z`. Format it *in a zone*, with
 *   `Intl` — never read a clock or a calendar day off the string: `completedAt.slice(11, 16)` is
 *   the UTC clock, about three hours ahead of what the trainer's own clock said.
 * - A **business date** (a plan's `startDate`/`endDate`, a log's `weekStartDate`,
 *   `expiringPlans[].end`) is a local calendar day in `America/Sao_Paulo`: `yyyy-MM-dd`, no time
 *   and no zone. `new Date("2026-10-31")` is UTC *midnight*, which renders as 30/10/2026 in
 *   Brazil, so a business date is never put through a UTC conversion. Split it into its three
 *   numbers instead (`civilDay`) and format that with `timeZone: "UTC"`, which is the pairing that
 *   makes the day come out as written in every host zone.
 *
 * "Today" is therefore a business question too: `todayLocalIso()`, never
 * `new Date().toISOString().slice(0, 10)` — that is the UTC day, so it flips at 21:00 local and
 * for the last three hours of every evening says tomorrow.
 *
 * Every formatter here is explicit about its zone, and none of them trusts the host's: this module
 * runs both in the browser (any traveller's zone) and on the server during SSR (usually UTC).
 * `npm run test:hostile-tz` runs the unit suite again under `TZ=Pacific/Kiritimati` (UTC+14) to
 * keep it that way. There is no fixed `-03:00` anywhere either — Brazil observed DST until 2019,
 * so an instant from before then resolves at `-02:00`, which only the zone's own rules know.
 */

export const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Business dates (`yyyy-MM-dd`) -------------------------------------------------------------
// Each of these formats a `civilDay()` Date, so each one must say `timeZone: "UTC"`.

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const numericDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// --- Instants (ISO-8601 with `Z`) --------------------------------------------------------------
// Each of these resolves an absolute instant in the business zone, so each one must say
// `timeZone: BUSINESS_TIME_ZONE`.

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** `hour12: false` so midnight reads `00:xx`, not some locale's `24:xx`. */
const timeOfDayFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Today's business date, `yyyy-MM-dd` — the calendar day a person in São Paulo is living right
 * now. `formatToParts` rather than a formatted string, so no locale's ordering or separators can
 * get into the result.
 */
const businessDayParts = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayLocalIso(now: Date = new Date()): string {
  const parts = businessDayParts.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/**
 * A business date as the same civil date at UTC midnight, for the `timeZone: "UTC"` formatters
 * above and for calendar arithmetic. Going through `Date.UTC` keeps it a pure civil-date
 * computation: the three numbers go in and come out, and no zone is consulted.
 */
function civilDay(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** A full timestamp in the business zone, e.g. "16 de out. de 2026, 22:00". */
export function formatDateTime(isoTimestamp: string): string {
  return dateTimeFormatter.format(new Date(isoTimestamp));
}

/** The `HH:MM` clock an instant showed in the business zone, e.g. "22:00". */
export function formatTimeOfDay(isoTimestamp: string): string {
  return timeOfDayFormatter.format(new Date(isoTimestamp));
}

/** A business date without its year, e.g. "31 de out". */
export function formatDateShort(isoDate: string): string {
  return shortDateFormatter.format(civilDay(isoDate)).replace(".", "");
}

/** A business date with its year, e.g. "31 de out de 2026". */
export function formatDateLong(isoDate: string): string {
  return longDateFormatter.format(civilDay(isoDate)).replace(".", "");
}

/** A business date all in digits, e.g. "31/10/2026". */
export function formatDateNumeric(isoDate: string): string {
  return numericDateFormatter.format(civilDay(isoDate));
}

export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDateShort(startDate)} – ${formatDateLong(endDate)}`;
}

export function formatRelativeTime(isoTimestamp: string): string {
  if (!isoTimestamp) return "";
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * Whole calendar days from today to a business date (negative once it has passed). Counting
 * between two *dates*, rather than milliseconds from "now" to a midnight, is what keeps
 * "termina em 0 dias" from turning into -1 during the afternoon of the last day — the same
 * change the BFF made to `GET /dashboard`'s `daysLeft`, which is this value computed upstream.
 */
export function daysUntil(isoDate: string, today: string = todayLocalIso()): number {
  return Math.round((civilDay(isoDate).getTime() - civilDay(today).getTime()) / MS_PER_DAY);
}

export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft <= 0) return "vence hoje";
  if (daysLeft === 1) return "1 dia";
  return `${daysLeft} dias`;
}
