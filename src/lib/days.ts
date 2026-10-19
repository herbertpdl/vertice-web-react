import type { DayOfWeek } from "@/lib/api/types";

export const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_NAMES: Record<DayOfWeek, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const DAY_ABBR: Record<DayOfWeek, string> = {
  MONDAY: "SEG",
  TUESDAY: "TER",
  WEDNESDAY: "QUA",
  THURSDAY: "QUI",
  FRIDAY: "SEX",
  SATURDAY: "SAB",
  SUNDAY: "DOM",
};

export const DAY_NAME_LOWER: Record<DayOfWeek, string> = {
  MONDAY: "segunda",
  TUESDAY: "terça",
  WEDNESDAY: "quarta",
  THURSDAY: "quinta",
  FRIDAY: "sexta",
  SATURDAY: "sábado",
  SUNDAY: "domingo",
};

/**
 * Single letters, for the roster's week strip (`WeeklyActivityDots`) and the date picker's column
 * headers. Keyed by the full `DayOfWeek` so both callers read the same map: the strip indexes it
 * with `WeekdayLabel`, the Monday-to-Friday subset `GET /clients` sends in `weekActivity`, which
 * is a subset of this key, and the picker needs the weekend too.
 */
export const DAY_INITIAL: Record<DayOfWeek, string> = {
  SUNDAY: "D",
  MONDAY: "S",
  TUESDAY: "T",
  WEDNESDAY: "Q",
  THURSDAY: "Q",
  FRIDAY: "S",
  SATURDAY: "S",
};

/**
 * The date picker's column order — Sunday first, the way a pt-BR calendar is drawn, and the
 * order `monthGrid` (`src/lib/calendar.ts`) lays its cells out in. Separate from `DAY_ORDER`,
 * which is the Monday-first ordering the plan and roster screens list days in.
 */
export const CALENDAR_DAY_ORDER: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/** Full weekday names, as the workout editor's "Dia da semana" dropdown shows them. */
export const DAY_NAMES_LONG: Record<DayOfWeek, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};
