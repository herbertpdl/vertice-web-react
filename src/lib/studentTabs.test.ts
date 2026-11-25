import { describe, expect, it } from "vitest";
import { studentTabFromParam, studentTabHref } from "./studentTabs";

describe("student page tabs (spec D1)", () => {
  it("maps each ?aba= value", () => {
    expect(studentTabFromParam("planos")).toBe("plans");
    expect(studentTabFromParam("feedbacks")).toBe("feedback");
    expect(studentTabFromParam("progresso")).toBe("progress");
    expect(studentTabFromParam("anamnese")).toBe("anamnese");
  });
  it("falls back to plans for absent, unknown or repeated values", () => {
    expect(studentTabFromParam(undefined)).toBe("plans");
    expect(studentTabFromParam(null)).toBe("plans");
    expect(studentTabFromParam("anamnesis")).toBe("plans");
    expect(studentTabFromParam("plans")).toBe("plans");
    expect(studentTabFromParam(["anamnese", "planos"])).toBe("anamnese");
  });
  it("builds the tab's link", () => {
    expect(studentTabHref(7, "anamnese")).toBe("/alunos/7?aba=anamnese");
    expect(studentTabHref(7, "plans")).toBe("/alunos/7");
  });
});
