import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUSINESS_TIME_ZONE,
  daysLeftLabel,
  daysUntil,
  formatDateLong,
  formatDateNumeric,
  formatDateRange,
  formatDateShort,
  formatDateTime,
  formatRelativeTime,
  formatTimeOfDay,
  initials,
  todayLocalIso,
} from "./format";

/**
 * The contract of the business time zone on this side of the wire (P2-02, XREPO-006 /
 * REL-API-008), the counterpart of vertice-bff's `src/lib/dates.test.ts`.
 *
 * Every expectation here is an absolute one: "now" is set to a UTC instant and the answer is the
 * one a person in São Paulo would give, whatever zone the host is in. That is the point — the same
 * assertions hold under the repo's own `TZ` (a dev machine in `America/Sao_Paulo`), under CI's UTC,
 * and under `npm run test:hostile-tz`'s `TZ=Pacific/Kiritimati`. Flipping `process.env.TZ` inside
 * the process would prove nothing: the `Intl.DateTimeFormat`s in `format.ts` resolve their zone
 * when they are constructed at module load, so a missing `timeZone` option would still pass. Only
 * a separate process with a different `TZ` catches that, which is what the hostile pass is.
 */

/** 22:00 on Sunday 2026-10-18 in São Paulo (-03:00) is already Monday in UTC. */
const SUNDAY_EVENING = new Date("2026-10-19T01:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

function at(instant: Date) {
  vi.useFakeTimers();
  vi.setSystemTime(instant);
}

describe("todayLocalIso", () => {
  it("is the business day, not the UTC one, late on a Sunday evening", () => {
    at(SUNDAY_EVENING);
    // The UTC day has already turned over: this is the bug the audit found, since
    // `new Date().toISOString().slice(0, 10)` answers the Monday for three hours every evening.
    expect(new Date().toISOString().slice(0, 10)).toBe("2026-10-19");
    expect(todayLocalIso()).toBe("2026-10-18");
  });

  it("turns over at local midnight, not UTC's", () => {
    expect(todayLocalIso(new Date("2026-10-19T02:59:59Z"))).toBe("2026-10-18");
    expect(todayLocalIso(new Date("2026-10-19T03:00:00Z"))).toBe("2026-10-19");
  });

  it("answers yyyy-MM-dd, zero-padded", () => {
    expect(todayLocalIso(new Date("2026-01-05T15:00:00Z"))).toBe("2026-01-05");
  });

  it("follows the zone's own history rather than a fixed -03:00", () => {
    // Brazil observed DST until 2019: on 2018-01-15 São Paulo was at -02:00, so 01:30Z is
    // already the 14th there, while a hardcoded -03:00 would also say the 14th but for the wrong
    // reason — 00:30Z is the case that separates them.
    expect(todayLocalIso(new Date("2018-01-15T01:30:00Z"))).toBe("2018-01-14");
    expect(todayLocalIso(new Date("2018-01-15T02:30:00Z"))).toBe("2018-01-15");
    // Same clock in 2026, when the zone is at -03:00 all year.
    expect(todayLocalIso(new Date("2026-01-15T02:30:00Z"))).toBe("2026-01-14");
  });
});

describe("formatting a business date", () => {
  // The acceptance criterion of plan item P2-02: a plan ending 2026-10-31 shows 31/10/2026.
  // `new Date("2026-10-31")` is UTC midnight, which renders as 30/10/2026 in Brazil.
  it("renders the day as written, never the day before", () => {
    expect(formatDateNumeric("2026-10-31")).toBe("31/10/2026");
    expect(formatDateLong("2026-10-31")).toBe("31 de out de 2026");
    expect(formatDateShort("2026-10-31")).toBe("31 de out");
  });

  it("renders a range from two business dates", () => {
    expect(formatDateRange("2026-10-01", "2026-10-31")).toBe("01 de out – 31 de out de 2026");
  });

  it("renders the first and last day of a year and of a month", () => {
    expect(formatDateNumeric("2026-01-01")).toBe("01/01/2026");
    expect(formatDateNumeric("2026-12-31")).toBe("31/12/2026");
    expect(formatDateNumeric("2026-03-01")).toBe("01/03/2026");
    expect(formatDateNumeric("2024-02-29")).toBe("29/02/2024");
  });

  it("renders a date inside a DST transition day as written", () => {
    // 2018-11-04 is the day São Paulo last sprang forward: there was no 00:00 local. A business
    // date is a civil date, so it is unaffected — which is why it is not resolved in a zone.
    expect(formatDateNumeric("2018-11-04")).toBe("04/11/2018");
    expect(formatDateNumeric("2019-02-17")).toBe("17/02/2019");
  });
});

describe("formatTimeOfDay", () => {
  it("reads the clock in the business zone, not off the string", () => {
    // `completedAt.slice(11, 16)` would say 01:30 — about three hours early (REL-API-008).
    expect(formatTimeOfDay("2026-10-19T01:30:00Z")).toBe("22:30");
  });

  it("writes local midnight as 00:00", () => {
    expect(formatTimeOfDay("2026-10-19T03:00:00Z")).toBe("00:00");
  });

  it("uses the offset the zone had at that instant", () => {
    // Pre-2019 DST: -02:00, so this is 23:30 and not 22:30.
    expect(formatTimeOfDay("2018-01-16T01:30:00Z")).toBe("23:30");
  });
});

describe("formatDateTime", () => {
  it("resolves the instant in the business zone", () => {
    expect(formatDateTime("2026-10-19T01:00:00Z")).toBe("18 de out. de 2026, 22:00");
  });
});

describe("daysUntil", () => {
  it("counts whole business days, so the last day reads 0 all day", () => {
    at(SUNDAY_EVENING);
    expect(daysUntil("2026-10-18")).toBe(0);
    expect(daysUntil("2026-10-19")).toBe(1);
    expect(daysUntil("2026-10-17")).toBe(-1);
    expect(daysUntil("2026-11-01")).toBe(14);
  });

  it("counts across a DST transition as whole days", () => {
    expect(daysUntil("2018-11-05", "2018-11-03")).toBe(2);
  });
});

describe("daysLeftLabel", () => {
  it("names the remaining days", () => {
    expect(daysLeftLabel(0)).toBe("vence hoje");
    expect(daysLeftLabel(-1)).toBe("vence hoje");
    expect(daysLeftLabel(1)).toBe("1 dia");
    expect(daysLeftLabel(14)).toBe("14 dias");
  });
});

describe("formatRelativeTime", () => {
  it("measures elapsed time, which no zone enters into", () => {
    at(new Date("2026-10-19T01:00:00Z"));
    expect(formatRelativeTime("2026-10-19T00:59:50Z")).toBe("agora");
    expect(formatRelativeTime("2026-10-19T00:30:00Z")).toBe("há 30min");
    expect(formatRelativeTime("2026-10-18T22:00:00Z")).toBe("há 3h");
    expect(formatRelativeTime("2026-10-16T01:00:00Z")).toBe("há 3d");
  });

  it("is empty for the BFF's empty instant", () => {
    expect(formatRelativeTime("")).toBe("");
  });
});

describe("initials", () => {
  it("takes the first and last name", () => {
    expect(initials("Ana Paula Souza")).toBe("AS");
    expect(initials("Ana")).toBe("A");
  });
});

describe("BUSINESS_TIME_ZONE", () => {
  it("is the zone vertice-api and vertice-bff state", () => {
    expect(BUSINESS_TIME_ZONE).toBe("America/Sao_Paulo");
  });
});
