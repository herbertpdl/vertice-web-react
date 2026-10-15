import { describe, expect, it } from "vitest";
import { editStudentBody, editStudentDefaults, editStudentSchema } from "./students";

const student = { id: 4, name: "Ana", email: "ana@example.com", cpf: "***.***.***-25", role: "CLIENT" as const };

describe("editStudentDefaults", () => {
  it("never puts the masked CPF in the form", () => {
    expect(editStudentDefaults(student)).toEqual({
      name: "Ana",
      email: "ana@example.com",
      newCpf: "",
      removeCpf: false,
    });
  });
});

describe("editStudentBody", () => {
  it("leaves the CPF out when the trainer typed none, so the BFF keeps the stored one", () => {
    expect(editStudentBody({ ...editStudentDefaults(student), name: " Ana Souza " })).toEqual({
      name: "Ana Souza",
      email: "ana@example.com",
    });
  });

  it("sends a typed CPF as digits", () => {
    expect(editStudentBody({ ...editStudentDefaults(student), newCpf: "529.982.247-25" })).toEqual({
      name: "Ana",
      email: "ana@example.com",
      cpf: "52998224725",
    });
  });

  it("sends null to remove the CPF, whatever is typed", () => {
    expect(
      editStudentBody({ ...editStudentDefaults(student), newCpf: "529.982.247-25", removeCpf: true }),
    ).toEqual({ name: "Ana", email: "ana@example.com", cpf: null });
  });
});

describe("editStudentSchema", () => {
  it("accepts an empty CPF and refuses an invalid one", () => {
    expect(editStudentSchema.safeParse(editStudentDefaults(student)).success).toBe(true);
    expect(
      editStudentSchema.safeParse({ ...editStudentDefaults(student), newCpf: "111.111.111-11" }).success,
    ).toBe(false);
    // The mask itself is not a CPF.
    expect(
      editStudentSchema.safeParse({ ...editStudentDefaults(student), newCpf: student.cpf }).success,
    ).toBe(false);
  });
});
