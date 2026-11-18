import { describe, expect, it } from "vitest";
import type { AdminActionEntry } from "@/lib/api/types";
import { ADMIN_ACTIONS, actionDetail, actionLabels, actionTones } from "./actions";
import {
  emptyHistoryMessage,
  historyFiltersFromParams,
  historyFiltersToSearch,
  historyPathFor,
} from "./history";

const entry = (overrides: Partial<AdminActionEntry>): AdminActionEntry => ({
  id: 1,
  admin: { id: 9, name: "Carla Mendes", role: "ADMIN" },
  action: "VIEW_USER_PROFILE",
  targetUser: { id: 3, name: "Rafael Torres", role: "TRAINER" },
  relatedUser: null,
  targetExerciseId: null,
  targetMuscleGroupId: null,
  subjectLabel: null,
  reason: null,
  createdAt: "2026-11-17T12:31:00Z",
  ...overrides,
});

describe("actionLabels", () => {
  it("labels all 13 actions, each once, with the spec's copy", () => {
    expect(ADMIN_ACTIONS).toHaveLength(13);
    expect(new Set(Object.values(actionLabels)).size).toBe(13);
    expect(Object.keys(actionTones).sort()).toEqual([...ADMIN_ACTIONS].sort());
    expect(actionLabels.SUSPEND_USER).toBe("Suspendeu usuário");
    expect(actionLabels.SEND_PASSWORD_RESET_EMAIL).toBe("E-mail de redefinição de senha");
  });
});

describe("actionDetail", () => {
  it("shows the reason of a suspension or reactivation", () => {
    expect(actionDetail(entry({ action: "SUSPEND_USER", reason: "Denúncia" }))).toBe("Denúncia");
    expect(actionDetail(entry({ action: "REACTIVATE_USER", reason: null }))).toBe("—");
  });

  it("names the other party of an ended relationship", () => {
    expect(
      actionDetail(entry({ action: "END_RELATIONSHIP", relatedUser: { id: 3, name: "Rafael Torres", role: "TRAINER" } })),
    ).toBe("Vínculo com Rafael Torres encerrado.");
  });

  it("quotes the exercise of a promotion and of the other catalog actions", () => {
    expect(actionDetail(entry({ action: "PROMOTE_EXERCISE", subjectLabel: "Elevação pélvica com pausa" }))).toBe(
      '"Elevação pélvica com pausa" copiado para o catálogo inicial.',
    );
    expect(actionDetail(entry({ action: "RENAME_MUSCLE_GROUP", subjectLabel: "Glúteos" }))).toBe('"Glúteos"');
    expect(actionDetail(entry({ action: "DELETE_STARTER_EXERCISE", subjectLabel: "Remada" }))).toBe('"Remada"');
  });

  it("is a dash otherwise", () => {
    expect(actionDetail(entry({ action: "VIEW_USER_PROFILE" }))).toBe("—");
    expect(actionDetail(entry({ action: "SEND_FIRST_ACCESS_EMAIL" }))).toBe("—");
    expect(actionDetail(entry({ action: "CHANGE_OWN_PASSWORD", targetUser: null }))).toBe("—");
  });
});

describe("the history's URL filters", () => {
  it("reads admin, acao and usuario", () => {
    expect(historyFiltersFromParams({ admin: "9", acao: "SUSPEND_USER", usuario: "3" })).toEqual({
      adminId: 9,
      action: "SUSPEND_USER",
      targetUserId: 3,
    });
  });

  it("ignores anything that isn't a positive id or a known action", () => {
    expect(historyFiltersFromParams({ admin: "0", acao: "toString", usuario: "-3" })).toEqual({});
    expect(historyFiltersFromParams({ admin: "1e3", acao: "suspend_user", usuario: "99999999999999999" })).toEqual({});
  });

  it("writes them back, and builds a profile's link", () => {
    expect(historyFiltersToSearch({})).toBe("");
    expect(historyFiltersToSearch({ adminId: 9, action: "END_RELATIONSHIP", targetUserId: 3 })).toBe(
      "?admin=9&acao=END_RELATIONSHIP&usuario=3",
    );
    expect(historyPathFor(42)).toBe("/painel/historico?usuario=42");
  });
});

describe("emptyHistoryMessage", () => {
  it("matches ZCKW9 for an admin and an action", () => {
    expect(emptyHistoryMessage({ admin: "João Pires", action: "SUSPEND_USER" })).toBe(
      'Nenhuma ação de João Pires do tipo "Suspendeu usuário". Ajuste ou limpe os filtros.',
    );
  });

  it("names the affected user, and has its own line with no filter", () => {
    expect(emptyHistoryMessage({ user: "Ana Ribeiro" })).toBe("Nenhuma ação sobre Ana Ribeiro. Ajuste ou limpe os filtros.");
    expect(emptyHistoryMessage({})).toBe("Ainda não há ações registradas.");
  });
});
