import { describe, expect, it } from "vitest";
import { LEGAL_VERSIONS, needsTermsAcceptance } from "./versions";

describe("needsTermsAcceptance", () => {
  it("asks when the user never accepted (no consent state, or a null version)", () => {
    expect(needsTermsAcceptance(undefined)).toBe(true);
    expect(needsTermsAcceptance(null)).toBe(true);
    expect(needsTermsAcceptance({ termsVersion: null })).toBe(true);
  });

  it("asks again when the accepted version is outdated", () => {
    expect(needsTermsAcceptance({ termsVersion: "2026-01-draft" }, "2026-10-draft")).toBe(true);
  });

  it("does not ask when the accepted version is the current one", () => {
    expect(needsTermsAcceptance({ termsVersion: LEGAL_VERSIONS.terms })).toBe(false);
  });

  it("ships versions in the format the BFF accepts", () => {
    for (const version of Object.values(LEGAL_VERSIONS)) {
      expect(version).toMatch(/^[A-Za-z0-9._-]{1,32}$/);
    }
  });
});
