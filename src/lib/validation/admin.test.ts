import { describe, expect, it } from "vitest";
import {
  adminLoginSchema,
  adminReasonSchema,
  adminVerifyRequestSchema,
  muscleGroupNameSchema,
  secondFactorCodeSchema,
} from "./admin";

describe("secondFactorCodeSchema", () => {
  it("accepts six digits", () => {
    expect(secondFactorCodeSchema.safeParse("012345").success).toBe(true);
  });

  it.each(["12345", "1234567", "12a456", " 123456", "123 456", "", "１２３４５６"])("refuses %j", (code) => {
    expect(secondFactorCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe("adminLoginSchema", () => {
  it("has no remember-me and strips unknown keys", () => {
    expect(adminLoginSchema.parse({ email: "a@b.co", password: "x", remember: true, role: "ADMIN" })).toEqual({
      email: "a@b.co",
      password: "x",
    });
  });
});

describe("adminVerifyRequestSchema", () => {
  it("takes only the code: a challenge in the body is dropped", () => {
    expect(adminVerifyRequestSchema.parse({ code: "123456", challenge: "c" })).toEqual({ code: "123456" });
  });
});

describe("adminReasonSchema", () => {
  it("trims, and refuses a blank reason", () => {
    expect(adminReasonSchema.parse("  denúncia  ")).toBe("denúncia");
    for (const blank of ["", "   ", "\n\t"]) expect(adminReasonSchema.safeParse(blank).success).toBe(false);
  });

  it("takes 500 UTF-16 units and refuses 501, counted after the trim", () => {
    expect(adminReasonSchema.safeParse("a".repeat(500)).success).toBe(true);
    expect(adminReasonSchema.safeParse(`  ${"a".repeat(500)}  `).success).toBe(true);
    expect(adminReasonSchema.safeParse("a".repeat(501)).success).toBe(false);
    // An emoji is two UTF-16 units, as vertice-api counts it.
    expect(adminReasonSchema.safeParse("😀".repeat(250)).success).toBe(true);
    expect(adminReasonSchema.safeParse(`${"😀".repeat(250)}a`).success).toBe(false);
  });
});

describe("muscleGroupNameSchema", () => {
  it("trims, and refuses a blank name", () => {
    expect(muscleGroupNameSchema.parse("  Adutores ")).toBe("Adutores");
    for (const blank of ["", "   "]) expect(muscleGroupNameSchema.safeParse(blank).success).toBe(false);
  });

  it("takes 50 UTF-16 units after the trim and refuses 51; an emoji counts as two", () => {
    expect(muscleGroupNameSchema.safeParse(` ${"a".repeat(50)} `).success).toBe(true);
    expect(muscleGroupNameSchema.safeParse("a".repeat(51)).success).toBe(false);
    expect(muscleGroupNameSchema.safeParse("\u{1F4AA}".repeat(25)).success).toBe(true);
    expect(muscleGroupNameSchema.safeParse("\u{1F4AA}".repeat(26)).success).toBe(false);
  });
});
