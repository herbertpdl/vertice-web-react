import { describe, expect, it } from "vitest";
import { adminLoginSchema, adminVerifyRequestSchema, secondFactorCodeSchema } from "./admin";

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
