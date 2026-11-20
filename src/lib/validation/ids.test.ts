import { describe, expect, it } from "vitest";
import { historyFiltersFromParams } from "@/lib/admin/history";
import { parsePositiveId } from "./ids";

describe("parsePositiveId", () => {
  it.each([
    ["1", 1],
    ["57", 57],
    ["9007199254740991", 9007199254740991],
  ])("accepts %j", (text, id) => {
    expect(parsePositiveId(text)).toBe(id);
  });

  it.each([undefined, "", "0", "-3", "1.5", "12a", "1e3", "007", " 5", "9007199254740992", "12345678901234567"])(
    "refuses %j",
    (text) => {
      expect(parsePositiveId(text)).toBeUndefined();
    },
  );
});

describe("the history filters keep their id rule", () => {
  it("keeps positive ids and drops anything else", () => {
    expect(historyFiltersFromParams({ admin: "10", usuario: "3" })).toEqual({ adminId: 10, targetUserId: 3 });
    expect(historyFiltersFromParams({ admin: "0", usuario: "007" })).toEqual({});
    expect(historyFiltersFromParams({ admin: ["12", "13"], usuario: "9007199254740992" })).toEqual({ adminId: 12 });
  });
});
