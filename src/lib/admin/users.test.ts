import { describe, expect, it } from "vitest";
import {
  clientCountLabel,
  lastActiveLabel,
  normalizeSearch,
  roleLabels,
  statusLabel,
  suspensionNotice,
  userFiltersFromParams,
  userFiltersToSearch,
} from "./users";

describe("labels", () => {
  it("names the two listed roles and the two statuses", () => {
    expect(roleLabels).toEqual({ TRAINER: "Treinador", CLIENT: "Aluno" });
    expect(statusLabel(false)).toBe("Ativo");
    expect(statusLabel(true)).toBe("Suspenso");
  });

  it("counts clients in the singular and plural", () => {
    expect(clientCountLabel(0)).toBe("0 alunos");
    expect(clientCountLabel(1)).toBe("1 aluno");
    expect(clientCountLabel(12)).toBe("12 alunos");
  });

  it("says Hoje for today's business date, the date otherwise, Nunca for none", () => {
    expect(lastActiveLabel("2026-11-18", "2026-11-18")).toBe("Hoje");
    expect(lastActiveLabel("2026-11-17", "2026-11-18")).toBe("17/11/2026");
    expect(lastActiveLabel(null, "2026-11-18")).toBe("Nunca");
  });
});

describe("normalizeSearch", () => {
  it("trims and caps at 100 UTF-16 units", () => {
    expect(normalizeSearch("  ana  ")).toBe("ana");
    expect(normalizeSearch("   ")).toBe("");
    expect(normalizeSearch("a".repeat(150))).toHaveLength(100);
  });
});

describe("the directory's URL filters", () => {
  it("reads papel, status and q", () => {
    expect(userFiltersFromParams({ papel: "treinador", status: "suspenso", q: " ana " })).toEqual({
      role: "TRAINER",
      status: "SUSPENDED",
      q: "ana",
    });
    expect(userFiltersFromParams({ papel: "aluno", status: "ativo" })).toEqual({
      role: "CLIENT",
      status: "ACTIVE",
    });
  });

  it("ignores unknown values instead of sending them (ADMIN is never a filter)", () => {
    expect(userFiltersFromParams({ papel: "admin", status: "x", q: "  " })).toEqual({});
    expect(userFiltersFromParams({ papel: ["aluno", "treinador"] })).toEqual({ role: "CLIENT" });
  });

  it("writes them back, and nothing when there are none", () => {
    expect(userFiltersToSearch({})).toBe("");
    expect(userFiltersToSearch({ role: "CLIENT", status: "ACTIVE", q: "ana costa" })).toBe(
      "?papel=aluno&status=ativo&q=ana+costa",
    );
  });

  it("round-trips", () => {
    const filters = { role: "TRAINER", status: "SUSPENDED", q: "rafa" } as const;
    const params = Object.fromEntries(new URLSearchParams(userFiltersToSearch(filters)));
    expect(userFiltersFromParams(params)).toEqual(filters);
  });
});

describe("suspensionNotice", () => {
  const entry = {
    id: 1,
    admin: { id: 9, name: "Carla Mendes", role: "ADMIN" as const },
    action: "SUSPEND_USER" as const,
    targetUser: { id: 1, name: "Ana Ribeiro", role: "TRAINER" as const },
    relatedUser: null,
    targetExerciseId: null,
    targetMuscleGroupId: null,
    subjectLabel: null,
    reason: "denúncia de cobrança indevida em análise",
    createdAt: "2026-11-12T14:00:00Z",
  };

  it("reads the date, the admin and the reason from the history entry, as d4tAve", () => {
    expect(suspensionNotice({ role: "TRAINER", suspendedAt: "2026-11-12T14:00:00Z" }, entry)).toBe(
      "Suspenso em 12/11/2026 por Carla Mendes. Motivo: denúncia de cobrança indevida em análise. O treinador não consegue entrar enquanto estiver suspenso.",
    );
  });

  it("leaves Motivo out without a reason, and speaks of the client for a client", () => {
    expect(suspensionNotice({ role: "CLIENT", suspendedAt: null }, { ...entry, reason: null })).toBe(
      "Suspenso em 12/11/2026 por Carla Mendes. O aluno não consegue entrar enquanto estiver suspenso.",
    );
  });

  it("falls back to suspendedAt alone (in the business zone)", () => {
    expect(suspensionNotice({ role: "CLIENT", suspendedAt: "2026-11-13T01:00:00Z" }, undefined)).toBe(
      "Suspenso em 12/11/2026. O aluno não consegue entrar enquanto estiver suspenso.",
    );
    expect(suspensionNotice({ role: "TRAINER", suspendedAt: null }, undefined)).toBe(
      "Suspenso. O treinador não consegue entrar enquanto estiver suspenso.",
    );
  });
});
