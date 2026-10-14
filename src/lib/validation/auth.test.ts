import { describe, expect, it } from "vitest";
import {
  newPasswordSchema,
  registerRequestSchema,
  registerSchema,
  setPasswordSchema,
} from "./auth";

function messages(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error!.issues.map((issue) => issue.message);
}

describe("newPasswordSchema (vertice-api's password policy)", () => {
  it("accepts 8 characters", () => {
    expect(newPasswordSchema.safeParse("12345678").success).toBe(true);
  });

  it("rejects fewer than 8 characters", () => {
    expect(messages(newPasswordSchema, "1234567")).toEqual([
      "A senha deve ter no mínimo 8 caracteres",
    ]);
  });

  it("counts the 72-byte limit in UTF-8 bytes, not characters", () => {
    expect(newPasswordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(messages(newPasswordSchema, "a".repeat(73))).toEqual(["A senha é longa demais"]);
    // 36 × "é" is 72 bytes; 37 is 74 bytes though only 37 characters.
    expect(newPasswordSchema.safeParse("é".repeat(36)).success).toBe(true);
    expect(messages(newPasswordSchema, "é".repeat(37))).toEqual(["A senha é longa demais"]);
  });

  it("rejects a blank password", () => {
    expect(messages(newPasswordSchema, " ".repeat(10))).toEqual([
      "A senha não pode ser só espaços",
    ]);
  });

  it("accepts surrounding spaces in a non-blank password", () => {
    expect(newPasswordSchema.safeParse("  senha boa  ").success).toBe(true);
  });
});

describe("setPasswordSchema", () => {
  it("requires the confirmation to match", () => {
    expect(
      messages(setPasswordSchema, { newPassword: "senha-forte", confirmPassword: "senha-fraca" }),
    ).toEqual(["As senhas não coincidem"]);
    expect(
      setPasswordSchema.safeParse({ newPassword: "senha-forte", confirmPassword: "senha-forte" })
        .success,
    ).toBe(true);
  });
});

describe("registerSchema", () => {
  const valid = {
    name: "Ana",
    email: "ana@example.com",
    cpf: "529.982.247-25",
    cref: "",
    password: "senha-forte",
    confirmPassword: "senha-forte",
    terms: true,
  };

  it("applies the password policy", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
    expect(messages(registerSchema, { ...valid, password: "123456", confirmPassword: "123456" })).toEqual([
      "A senha deve ter no mínimo 8 caracteres",
    ]);
  });
});

describe("registerRequestSchema", () => {
  it("strips a role and normalizes the CPF to digits", () => {
    const result = registerRequestSchema.parse({
      name: "Ana",
      email: "ana@example.com",
      cpf: "529.982.247-25",
      password: "senha-forte",
      role: "CLIENT",
    });
    expect(result).not.toHaveProperty("role");
    expect(result.cpf).toBe("52998224725");
  });
});
