import { describe, expect, it } from "vitest";
import { ANAMNESE_MAX } from "./bounds";
import { anamneseExcess, anamneseLength, isBlankAnamnese, isOverAnamneseLimit } from "./anamnese";

describe("isBlankAnamnese (R19)", () => {
  it("treats spaces, no-break spaces, tabs and line breaks as blank", () => {
    expect(isBlankAnamnese("")).toBe(true);
    expect(isBlankAnamnese("   ")).toBe(true);
    expect(isBlankAnamnese(" \n\t\r\n ")).toBe(true);
  });
  it("is not blank with any visible character", () => {
    expect(isBlankAnamnese("  a  ")).toBe(false);
    expect(isBlankAnamnese("\n😀\n")).toBe(false);
  });
});

describe("the 5,000 limit in UTF-16 units (R10, R11, E2)", () => {
  it("allows exactly 5,000 and refuses 5,001", () => {
    expect(isOverAnamneseLimit("a".repeat(ANAMNESE_MAX))).toBe(false);
    expect(isOverAnamneseLimit("a".repeat(ANAMNESE_MAX + 1))).toBe(true);
  });
  it("counts a character outside the BMP twice", () => {
    expect(anamneseLength("😀")).toBe(2);
    expect(isOverAnamneseLimit("a".repeat(ANAMNESE_MAX - 2) + "😀")).toBe(false);
    expect(isOverAnamneseLimit("a".repeat(ANAMNESE_MAX - 1) + "😀")).toBe(true);
  });
  it("says how many characters to delete", () => {
    expect(anamneseExcess("a".repeat(6012))).toBe(1012);
    expect(anamneseExcess("abc")).toBe(0);
  });
});
