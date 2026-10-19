import { describe, expect, it } from "vitest";
import { minPlanEndDate, minPlanStartDate, trainingPlanSchema } from "./trainingPlans";

const TODAY = "2026-10-19";

const plan = {
  name: "Hipertrofia — Fase 1",
  description: "",
  startDate: "2026-10-19",
  endDate: "2026-11-30",
  level: "BEGINNER" as const,
};

/** The first message the schema reports for a field, or `undefined` when the field passed. */
function errorFor(value: unknown, field: string, minStartDate = TODAY) {
  const result = trainingPlanSchema(minStartDate).safeParse(value);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe("minPlanStartDate", () => {
  it("is today for a new plan", () => {
    expect(minPlanStartDate(undefined, TODAY)).toBe(TODAY);
  });

  it("is today for a plan that has not started yet", () => {
    expect(minPlanStartDate("2026-11-01", TODAY)).toBe(TODAY);
    expect(minPlanStartDate(TODAY, TODAY)).toBe(TODAY);
  });

  it("falls back to the plan's own start once that is in the past", () => {
    // Otherwise an active plan could not be saved at all — renaming it would demand moving its
    // start date forward first.
    expect(minPlanStartDate("2026-10-12", TODAY)).toBe("2026-10-12");
  });
});

describe("minPlanEndDate", () => {
  it("is the day after the chosen start", () => {
    expect(minPlanEndDate("2026-10-19", TODAY)).toBe("2026-10-20");
    expect(minPlanEndDate("2026-10-31", TODAY)).toBe("2026-11-01");
    expect(minPlanEndDate("2026-12-31", TODAY)).toBe("2027-01-01");
  });

  it("falls back to the day after the floor while no start has been picked", () => {
    expect(minPlanEndDate("", TODAY)).toBe("2026-10-20");
    expect(minPlanEndDate("", "2026-10-12")).toBe("2026-10-13");
  });
});

describe("trainingPlanSchema — a plan cannot start in the past", () => {
  it("accepts a plan starting today", () => {
    expect(trainingPlanSchema(TODAY).safeParse(plan).success).toBe(true);
  });

  it("accepts a plan starting later", () => {
    expect(
      trainingPlanSchema(TODAY).safeParse({ ...plan, startDate: "2026-12-01", endDate: "2027-01-15" })
        .success,
    ).toBe(true);
  });

  it("refuses a plan starting yesterday, and says from when", () => {
    expect(errorFor({ ...plan, startDate: "2026-10-18" }, "startDate")).toBe(
      "A data de início não pode ser anterior a 19/10/2026",
    );
  });

  it("lets an already-started plan keep its own start date when the floor is lowered", () => {
    const existing = { ...plan, startDate: "2026-10-12" };
    expect(errorFor(existing, "startDate", "2026-10-12")).toBeUndefined();
    // …but still refuses moving it further back than it already was.
    expect(errorFor({ ...existing, startDate: "2026-10-11" }, "startDate", "2026-10-12")).toBe(
      "A data de início não pode ser anterior a 12/10/2026",
    );
  });
});

describe("trainingPlanSchema — a plan cannot end on the day it starts", () => {
  it("refuses the same day for both", () => {
    expect(errorFor({ ...plan, startDate: TODAY, endDate: TODAY }, "endDate")).toBe(
      "O plano precisa terminar depois do dia em que começa",
    );
  });

  it("refuses an end before the start", () => {
    expect(errorFor({ ...plan, startDate: "2026-11-01", endDate: "2026-10-31" }, "endDate")).toBe(
      "O plano precisa terminar depois do dia em que começa",
    );
  });

  it("accepts the very next day", () => {
    expect(
      trainingPlanSchema(TODAY).safeParse({ ...plan, startDate: TODAY, endDate: "2026-10-20" })
        .success,
    ).toBe(true);
  });

  it("compares calendar days, not month or year numbers", () => {
    // 01/11 is after 31/10 even though 1 < 31 — the string comparison is what makes that work.
    expect(
      trainingPlanSchema(TODAY).safeParse({
        ...plan,
        startDate: "2026-10-31",
        endDate: "2026-11-01",
      }).success,
    ).toBe(true);
  });
});

describe("trainingPlanSchema — missing and malformed dates", () => {
  it("asks for each date before complaining about their order", () => {
    expect(errorFor({ ...plan, startDate: "" }, "startDate")).toBe("Informe a data de início");
    expect(errorFor({ ...plan, endDate: "" }, "endDate")).toBe("Informe a data de término");
  });

  it("refuses anything that is not a yyyy-MM-dd business date", () => {
    expect(errorFor({ ...plan, startDate: "19/10/2026" }, "startDate")).toBe("Data inválida");
    expect(errorFor({ ...plan, endDate: "2026-11-30T00:00:00Z" }, "endDate")).toBe("Data inválida");
  });
});
