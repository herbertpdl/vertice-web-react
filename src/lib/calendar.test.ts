import { describe, expect, it } from "vitest";
import { CALENDAR_DAY_ORDER } from "./days";
import {
  CALENDAR_ROWS,
  addDays,
  clampDate,
  caretAfterDigits,
  countDigitsBefore,
  firstDayOfMonth,
  isInMonth,
  isWithin,
  maskBrDate,
  monthGrid,
  monthOf,
  parseBrDate,
  shiftMonth,
} from "./calendar";

/**
 * Every case here is a pure civil-date assertion, which is the point: `npm run test:hostile-tz`
 * runs this file again at UTC+14 and UTC-10, and a `new Date(y, m, d)` or a `toISOString()` on a
 * host-zone date anywhere in `calendar.ts` fails in one of those two zones. See the module
 * header there and "Dates and times" in CLAUDE.md.
 */
describe("monthOf / firstDayOfMonth", () => {
  it("reads the month off a business date without touching a clock", () => {
    expect(monthOf("2026-10-31")).toEqual({ year: 2026, month: 10 });
    expect(monthOf("2026-01-01")).toEqual({ year: 2026, month: 1 });
  });

  it("pads the month back to two digits", () => {
    expect(firstDayOfMonth({ year: 2026, month: 3 })).toBe("2026-03-01");
    expect(firstDayOfMonth({ year: 2026, month: 12 })).toBe("2026-12-01");
  });
});

describe("shiftMonth", () => {
  it("rolls over the year in both directions", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("shifts by more than a year", () => {
    expect(shiftMonth({ year: 2026, month: 5 }, 14)).toEqual({ year: 2027, month: 7 });
  });
});

describe("addDays", () => {
  it("crosses a month and a year boundary", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-10-01", 7)).toBe("2026-10-08");
  });

  it("knows February's length in a leap year and outside one", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("does not shift a day at the DST boundaries Brazil used to observe", () => {
    // Brazil last moved its clocks in 2018; a business date must be untouched by that either way.
    expect(addDays("2018-11-03", 1)).toBe("2018-11-04");
    expect(addDays("2018-02-17", 1)).toBe("2018-02-18");
  });
});

describe("monthGrid", () => {
  it("always draws six rows of seven", () => {
    for (const month of [1, 2, 5, 9, 12]) {
      const grid = monthGrid({ year: 2026, month });
      expect(grid).toHaveLength(CALENDAR_ROWS);
      expect(grid.every((row) => row.length === 7)).toBe(true);
    }
  });

  it("puts the first of the month in its Sunday-first column, after the previous month's tail", () => {
    // 1 October 2026 is a Thursday, so the row opens on Sunday 27 September.
    const [firstRow] = monthGrid({ year: 2026, month: 10 });
    expect(firstRow).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
  });

  it("starts flush when the first falls on a Sunday", () => {
    // 1 November 2026 is a Sunday.
    expect(monthGrid({ year: 2026, month: 11 })[0][0]).toBe("2026-11-01");
  });

  it("runs as 42 consecutive days, so no row is ever empty", () => {
    const days = monthGrid({ year: 2026, month: 10 }).flat();
    expect(days).toHaveLength(42);
    days.slice(1).forEach((date, index) => {
      expect(date).toBe(addDays(days[index], 1));
    });
  });

  it("holds every day of the month, once, in order", () => {
    const days = monthGrid({ year: 2024, month: 2 })
      .flat()
      .filter((date) => isInMonth(date, { year: 2024, month: 2 }));
    expect(days).toHaveLength(29);
    expect(days[0]).toBe("2024-02-01");
    expect(days[28]).toBe("2024-02-29");
  });

  it("crosses a year boundary at both ends", () => {
    const grid = monthGrid({ year: 2026, month: 1 }).flat();
    expect(grid[0]).toBe("2025-12-28");
    expect(grid[41]).toBe("2026-02-07");
  });
});

describe("monthGrid ⟷ CALENDAR_DAY_ORDER", () => {
  it("lays its columns out in the order the headers are rendered in", () => {
    // The grid's column 0 is whatever `CALENDAR_DAY_ORDER[0]` names. Reorder that array without
    // this check and the headers silently stop describing the columns under them.
    const weekdayOfColumn = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    expect(CALENDAR_DAY_ORDER).toEqual(weekdayOfColumn);

    const [firstRow] = monthGrid({ year: 2026, month: 11 });
    firstRow.forEach((date, column) => {
      // `getUTCDay()` is 0 for Sunday, so it indexes `weekdayOfColumn` directly.
      const [year, month, day] = date.split("-").map(Number);
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      expect(weekdayOfColumn[weekday]).toBe(CALENDAR_DAY_ORDER[column]);
    });
  });
});

describe("isInMonth", () => {
  it("separates the month's own days from its neighbours'", () => {
    const october = { year: 2026, month: 10 };
    expect(isInMonth("2026-10-01", october)).toBe(true);
    expect(isInMonth("2026-10-31", october)).toBe(true);
    expect(isInMonth("2026-09-30", october)).toBe(false);
    expect(isInMonth("2026-11-01", october)).toBe(false);
    // The month is padded, so a single-digit month never matches a two-digit day's prefix.
    expect(isInMonth("2026-01-10", { year: 2026, month: 1 })).toBe(true);
    expect(isInMonth("2026-10-01", { year: 2026, month: 1 })).toBe(false);
  });
});

describe("isWithin / clampDate", () => {
  it("compares business dates as the plain strings they are", () => {
    expect(isWithin("2026-10-15", "2026-10-01", "2026-10-31")).toBe(true);
    expect(isWithin("2026-10-01", "2026-10-01", "2026-10-31")).toBe(true);
    expect(isWithin("2026-09-30", "2026-10-01", undefined)).toBe(false);
    expect(isWithin("2026-11-01", undefined, "2026-10-31")).toBe(false);
    expect(isWithin("1999-01-01")).toBe(true);
  });

  it("clamps to whichever bound was crossed, and leaves an in-range date alone", () => {
    expect(clampDate("2026-09-30", "2026-10-01")).toBe("2026-10-01");
    expect(clampDate("2026-11-05", undefined, "2026-10-31")).toBe("2026-10-31");
    expect(clampDate("2026-10-15", "2026-10-01", "2026-10-31")).toBe("2026-10-15");
  });

  it("never returns a date above `max`, even when the bounds are crossed", () => {
    // A caller can hand over `min > max` transiently while both ends of a range are edited.
    // Returning `min` there would disable every cell in the grid *and* leave the roving-focus
    // target itself disabled.
    expect(clampDate("2026-10-01", "2026-11-10", "2026-10-20")).toBe("2026-10-20");
  });
});

describe("parseBrDate", () => {
  it("refuses a two-digit-looking year instead of silently moving it to the 1900s", () => {
    // `Date.UTC(26, 0, 1)` is 1926, so without checking the year back out, `01/01/0026` — a
    // plausible slip for 2026 — would be accepted and stored as 1926.
    expect(parseBrDate("01/01/0026")).toBeNull();
    expect(parseBrDate("01/01/0099")).toBeNull();
    expect(parseBrDate("29/02/0096")).toBeNull();
    expect(parseBrDate("01/01/0100")).toBe("0100-01-01");
  });

  it("reads a complete dd/mm/aaaa", () => {
    expect(parseBrDate("31/10/2026")).toBe("2026-10-31");
    expect(parseBrDate("01/01/2026")).toBe("2026-01-01");
    expect(parseBrDate(" 29/02/2024 ")).toBe("2024-02-29");
  });

  it("rejects a day that does not exist rather than rolling it over", () => {
    expect(parseBrDate("31/02/2026")).toBeNull();
    expect(parseBrDate("29/02/2026")).toBeNull();
    expect(parseBrDate("31/04/2026")).toBeNull();
    expect(parseBrDate("00/10/2026")).toBeNull();
    expect(parseBrDate("10/13/2026")).toBeNull();
  });

  it("rejects anything that is not yet a whole date", () => {
    expect(parseBrDate("")).toBeNull();
    expect(parseBrDate("31/10")).toBeNull();
    expect(parseBrDate("31/10/26")).toBeNull();
    expect(parseBrDate("2026-10-31")).toBeNull();
  });
});

describe("maskBrDate", () => {
  it("adds the separators as the digits arrive, closing each full segment", () => {
    expect(maskBrDate("")).toBe("");
    expect(maskBrDate("3")).toBe("3");
    // A finished segment gets its separator straight away, so the next digit typed lands in the
    // next one rather than needing a "/" of its own.
    expect(maskBrDate("31")).toBe("31/");
    expect(maskBrDate("311")).toBe("31/1");
    expect(maskBrDate("3110")).toBe("31/10/");
    expect(maskBrDate("31102026")).toBe("31/10/2026");
  });

  it("keeps what was already separated, and drops anything that is not a digit", () => {
    expect(maskBrDate("31/10/2026")).toBe("31/10/2026");
    expect(maskBrDate("31-10-2026")).toBe("31/10/2026");
    expect(maskBrDate("3a1b")).toBe("31/");
  });

  it("stops at eight digits", () => {
    expect(maskBrDate("311020269999")).toBe("31/10/2026");
  });

  it("is stable: masking its own output changes nothing", () => {
    for (const text of ["", "3", "31/", "31/1", "31/10/", "31/10/2026"]) {
      expect(maskBrDate(text)).toBe(text);
    }
  });

  it("leaves the later segments alone when a digit is deleted from an earlier one", () => {
    // Deleting the "1" of the day in "31/10/2026" leaves "3/10/2026". Re-deriving the string
    // from the digit stream would reflow it into "31/02/026" — mangling the month and the year
    // to fix the day, which is the likeliest edit there is on a date already filled in.
    expect(maskBrDate("3/10/2026")).toBe("3/10/2026");
    expect(maskBrDate("31/1/2026")).toBe("31/1/2026");
    expect(maskBrDate("31/10/202")).toBe("31/10/202");
  });

  it("puts a deleted separator back without losing the segments around it", () => {
    expect(maskBrDate("3110/2026")).toBe("31/10/2026");
    expect(maskBrDate("31/102026")).toBe("31/10/2026");
  });
});

describe("caret tracking", () => {
  it("counts the digits before the caret, ignoring separators", () => {
    expect(countDigitsBefore("31/10/2026", 0)).toBe(0);
    expect(countDigitsBefore("31/10/2026", 2)).toBe(2);
    expect(countDigitsBefore("31/10/2026", 3)).toBe(2);
    expect(countDigitsBefore("31/10/2026", 5)).toBe(4);
    expect(countDigitsBefore("31/10/2026", 10)).toBe(8);
  });

  it("puts the caret back after the same digit once the text is re-masked", () => {
    expect(caretAfterDigits("31/10/2026", 0)).toBe(0);
    expect(caretAfterDigits("31/10/2026", 2)).toBe(2);
    expect(caretAfterDigits("31/10/2026", 4)).toBe(5);
    expect(caretAfterDigits("31/10/2026", 8)).toBe(10);
  });

  it("stops at the end rather than overrunning a shortened string", () => {
    expect(caretAfterDigits("3/10/2026", 9)).toBe(9);
    expect(caretAfterDigits("", 3)).toBe(0);
  });

  it("survives a backspace in the middle of the day", () => {
    // "31/10/2026", caret after "31", Backspace -> the browser hands us "3/10/2026".
    const before = "31/10/2026";
    const digits = countDigitsBefore(before, 2) - 1;
    expect(caretAfterDigits(maskBrDate("3/10/2026"), digits)).toBe(1);
  });
});
