import { describe, expect, it } from "vitest";
import type { Me } from "@/lib/api/types";
import { profileChanges, profileDefaults, profileSchema } from "./profile";

const trainer: Me = {
  id: 1,
  name: "Ana Ribeiro",
  email: "ana@example.com",
  cpf: "***.***.***-25",
  cref: "012345-G/SP",
  role: "TRAINER",
  consent: { termsVersion: null, termsAcceptedAt: null, healthDataVersion: null, healthDataConsentAt: null },
};

describe("profileDefaults", () => {
  it("never puts the masked CPF in the form", () => {
    expect(profileDefaults(trainer)).toEqual({
      name: "Ana Ribeiro",
      email: "ana@example.com",
      newCpf: "",
      cref: "012345-G/SP",
    });
  });
});

describe("profileChanges", () => {
  it("is empty when nothing changed", () => {
    expect(profileChanges(trainer, profileDefaults(trainer))).toEqual({});
  });

  it("sends only the changed fields", () => {
    expect(
      profileChanges(trainer, { ...profileDefaults(trainer), email: " Ana.R@Example.com " }),
    ).toEqual({ email: "ana.r@example.com" });
  });

  it("never sends the masked CPF; a typed one goes as digits", () => {
    const unchanged = profileChanges(trainer, { ...profileDefaults(trainer), name: "Ana R." });
    expect(unchanged).not.toHaveProperty("cpf");
    expect(JSON.stringify(unchanged)).not.toContain("*");

    expect(profileChanges(trainer, { ...profileDefaults(trainer), newCpf: "529.982.247-25" })).toEqual({
      cpf: "52998224725",
    });
  });

  it("clears an emptied CREF with null", () => {
    expect(profileChanges(trainer, { ...profileDefaults(trainer), cref: "  " })).toEqual({ cref: null });
  });

  it("never sends a CREF for a non-trainer", () => {
    const client: Me = { ...trainer, role: "CLIENT", cref: "" };
    expect(profileChanges(client, { ...profileDefaults(client), cref: "123" })).toEqual({});
  });
});

describe("profileSchema", () => {
  it("accepts an empty new CPF (keep the stored one) and rejects an invalid one", () => {
    expect(profileSchema.safeParse(profileDefaults(trainer)).success).toBe(true);
    expect(profileSchema.safeParse({ ...profileDefaults(trainer), newCpf: "111.111.111-11" }).success).toBe(
      false,
    );
  });
});
