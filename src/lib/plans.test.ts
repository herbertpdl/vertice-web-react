import { afterEach, describe, expect, it, vi } from "vitest";
import { planStatus, planStatusLabels } from "./plans";

/** 22:00 on Sunday 2026-10-18 in São Paulo (-03:00), which is already Monday in UTC. */
const SUNDAY_EVENING = new Date("2026-10-19T01:00:00Z");

afterEach(() => {
  vi.useRealTimers();
});

describe("planStatus", () => {
  it("is scheduled before the plan starts and completed after it ends", () => {
    expect(planStatus("2026-11-01", "2026-11-30", "2026-10-31")).toBe("scheduled");
    expect(planStatus("2026-11-01", "2026-11-30", "2026-12-01")).toBe("completed");
  });

  it("includes both end dates: a plan is active on its first and last day", () => {
    expect(planStatus("2026-11-01", "2026-11-30", "2026-11-01")).toBe("active");
    expect(planStatus("2026-11-01", "2026-11-30", "2026-11-30")).toBe("active");
  });

  it("is still active late on the evening of the last day", () => {
    // The UTC day is the Monday by now, and a plan ending on the Sunday would have read
    // "Concluído" to a trainer still looking at Sunday evening (XREPO-006).
    vi.useFakeTimers();
    vi.setSystemTime(SUNDAY_EVENING);
    expect(planStatus("2026-10-01", "2026-10-18")).toBe("active");
    expect(planStatus("2026-10-19", "2026-11-19")).toBe("scheduled");
  });
});

describe("planStatusLabels", () => {
  it("names every status in pt-BR", () => {
    expect(planStatusLabels).toEqual({
      scheduled: "Agendado",
      active: "Ativo",
      completed: "Concluído",
    });
  });
});
