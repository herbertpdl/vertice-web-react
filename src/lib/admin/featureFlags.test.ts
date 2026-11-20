import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { FeatureFlag } from "@/lib/api/types";
import {
  everyoneToast,
  filterFeatureFlags,
  flagCountLabel,
  flagSaveErrorMessage,
  userCountLabel,
  userLabel,
  userRemovedToast,
  userSetToast,
} from "./featureFlags";

const ai: FeatureFlag = {
  key: "AI_ASSISTANT_ENABLED",
  description: "Assistente de IA no editor de treino.",
  enabled: true,
  users: [],
};
const email: FeatureFlag = {
  key: "FIRST_ACCESS_EMAIL_ENABLED",
  description: "E-mail de primeiro acesso para alunos novos. Configuração por treinador.",
  enabled: false,
  users: [{ userId: 57, enabled: true }],
};
const flags = [ai, email];

describe("filterFeatureFlags", () => {
  it("matches the key, any case", () => {
    expect(filterFeatureFlags(flags, "assistant")).toEqual([ai]);
  });

  it("matches the description", () => {
    expect(filterFeatureFlags(flags, "primeiro acesso")).toEqual([email]);
  });

  it("ignores accents both ways", () => {
    expect(filterFeatureFlags(flags, "configuracao")).toEqual([email]);
    expect(filterFeatureFlags(flags, "edítor")).toEqual([ai]);
  });

  it("trims, and a blank query keeps every flag", () => {
    expect(filterFeatureFlags(flags, "  TREINO  ")).toEqual([ai]);
    expect(filterFeatureFlags(flags, "")).toBe(flags);
    expect(filterFeatureFlags(flags, "   ")).toBe(flags);
  });

  it("no match is an empty list", () => {
    expect(filterFeatureFlags(flags, "pagamento")).toEqual([]);
  });
});

describe("counts", () => {
  it.each([
    [0, "Nenhum usuário"],
    [1, "1 usuário"],
    [2, "2 usuários"],
  ])("userCountLabel(%i)", (count, label) => {
    expect(userCountLabel(count)).toBe(label);
  });

  it("flagCountLabel: the total, or shown of total while filtered", () => {
    expect(flagCountLabel(2, 2)).toBe("2 flags");
    expect(flagCountLabel(1, 1)).toBe("1 flag");
    expect(flagCountLabel(1, 2)).toBe("1 de 2 flags");
    expect(flagCountLabel(0, 1)).toBe("0 de 1 flag");
  });
});

describe("copy", () => {
  it("names a user by number, with no separator", () => {
    expect(userLabel(1234)).toBe("Usuário #1234");
  });

  it("toasts", () => {
    expect(everyoneToast("AI_ASSISTANT_ENABLED", true)).toBe("A flag AI_ASSISTANT_ENABLED foi ligada para todos.");
    expect(everyoneToast("AI_ASSISTANT_ENABLED", false)).toBe("A flag AI_ASSISTANT_ENABLED foi desligada para todos.");
    expect(userSetToast(57, true)).toBe("Usuário #57 definido como Ligado.");
    expect(userSetToast(57, false)).toBe("Usuário #57 definido como Desligado.");
    expect(userRemovedToast(57)).toBe("Usuário #57 agora segue a configuração para todos.");
  });
});

describe("flagSaveErrorMessage", () => {
  it("NOT_FOUND: the flag is gone", () => {
    expect(flagSaveErrorMessage(new ApiError({ code: "NOT_FOUND", message: "x" }, 404))).toBe(
      "Esta flag não existe mais. A lista foi atualizada.",
    );
  });

  it("anything else: the generic failure", () => {
    const generic = "Não foi possível salvar. Tente de novo.";
    expect(flagSaveErrorMessage(new ApiError({ code: "VALIDATION_ERROR", message: "x" }, 400))).toBe(generic);
    expect(flagSaveErrorMessage(new TypeError("Failed to fetch"))).toBe(generic);
  });
});
