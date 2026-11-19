import { describe, expect, it, vi } from "vitest";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import type { AdminCatalogExercise } from "@/lib/api/types";
import {
  MUSCLE_GROUP_NAME_TAKEN_MESSAGE,
  catalogFilters,
  catalogViewFromParams,
  catalogViewToSearch,
  deleteOutcome,
  exerciseFormDefaults,
  exerciseRequest,
  exerciseSaveError,
  inUseDetail,
  invalidateAfterExerciseWrite,
  invalidateAfterMuscleGroupWrite,
  muscleGroupErrorMessage,
  muscleGroupFilterOptions,
  muscleGroupNames,
  parseId,
  mostUsedRank,
  privateTagLabel,
  workoutCountLabel,
} from "./catalog";

const apiError = (code: string, status: number) => new ApiError({ code, message: "English" }, status);

const privateExercise: AdminCatalogExercise = {
  id: 7,
  name: "Elevação pélvica com pausa",
  description: "Pausa de 2 s no topo.",
  videoUrl: "https://youtube.com/watch?v=xDmFkJxPzeM",
  muscleGroups: [
    { id: 8, name: "Glúteos" },
    { id: 9, name: "Posteriores de coxa" },
  ],
  isStarter: false,
  owner: { id: 1, name: "Ana Ribeiro" },
};

describe("catalog view in the URL", () => {
  it("reads the tab, the group and the trimmed search", () => {
    expect(catalogViewFromParams({})).toEqual({ tab: "starter" });
    expect(catalogViewFromParams({ aba: "treinadores", grupo: "3", q: "  supino " })).toEqual({
      tab: "trainers",
      muscleGroupId: 3,
      q: "supino",
    });
  });

  it("ignores what the BFF would refuse", () => {
    expect(catalogViewFromParams({ aba: "outra", grupo: "abc", q: "   " })).toEqual({ tab: "starter" });
    expect(catalogViewFromParams({ grupo: ["0", "2"] })).toEqual({ tab: "starter" });
    expect(catalogViewFromParams({ q: "a".repeat(150) }).q).toHaveLength(100);
  });

  it("round-trips through the search string", () => {
    const view = { tab: "trainers" as const, muscleGroupId: 4, q: "remada baixa" };
    expect(catalogViewToSearch(view)).toBe("?aba=treinadores&grupo=4&q=remada+baixa");
    expect(catalogViewFromParams(Object.fromEntries(new URLSearchParams(catalogViewToSearch(view))))).toEqual(view);
    expect(catalogViewToSearch({ tab: "starter" })).toBe("");
  });

  it("maps the tab to the BFF scope", () => {
    expect(catalogFilters({ tab: "starter" })).toEqual({ scope: "STARTER" });
    expect(catalogFilters({ tab: "trainers", muscleGroupId: 2, q: "x" })).toEqual({
      scope: "PRIVATE",
      muscleGroupId: 2,
      q: "x",
    });
  });
});

describe("parseId", () => {
  it.each([
    ["1", 1],
    ["2147483647", 2147483647],
    ["2147483648", undefined],
    ["01", undefined],
    ["-1", undefined],
    ["1.5", undefined],
    ["", undefined],
    [undefined, undefined],
  ])("%j → %j", (value, expected) => expect(parseId(value)).toBe(expected));
});

describe("muscleGroupFilterOptions", () => {
  it("starts with 'Todos os grupos' and keeps the list's order", () => {
    expect(muscleGroupFilterOptions([{ id: 2, name: "Costas" }, { id: 1, name: "Peito" }])).toEqual([
      { value: "", label: "Todos os grupos" },
      { value: "2", label: "Costas" },
      { value: "1", label: "Peito" },
    ]);
    expect(muscleGroupFilterOptions(undefined)).toHaveLength(1);
  });
});

describe("the exercise form", () => {
  it("prefills a promote copy from the trainer's row", () => {
    expect(exerciseFormDefaults(privateExercise)).toEqual({
      name: "Elevação pélvica com pausa",
      muscleGroupIds: [8, 9],
      description: "Pausa de 2 s no topo.",
      videoUrl: "https://youtube.com/watch?v=xDmFkJxPzeM",
    });
    expect(exerciseFormDefaults()).toEqual({ name: "", muscleGroupIds: [], description: "", videoUrl: "" });
  });

  it("sends every field, empty ones as '' (the update is a full replace)", () => {
    expect(exerciseRequest({ name: "Remada", muscleGroupIds: [2], description: "", videoUrl: undefined })).toEqual({
      name: "Remada",
      muscleGroupIds: [2],
      description: "",
      videoUrl: "",
    });
  });
});

describe("exerciseSaveError", () => {
  it("puts a duplicate name on the Nome field, in every mode", () => {
    for (const mode of ["create", "edit", "promote"] as const) {
      expect(exerciseSaveError(apiError("NAME_TAKEN", 409), mode)).toEqual({
        field: "name",
        message: "Já existe um exercício com esse nome",
      });
    }
  });

  it("explains the mode-specific refusals", () => {
    expect(exerciseSaveError(apiError("PRECONDITION_FAILED", 409), "promote").message).toBe(
      "Este exercício já está no catálogo inicial.",
    );
    expect(exerciseSaveError(apiError("FORBIDDEN", 403), "edit").message).toBe(
      "Exercícios dos treinadores não podem ser editados aqui.",
    );
    expect(exerciseSaveError(apiError("NOT_FOUND", 404), "edit").message).toBe("Este exercício não existe mais.");
  });

  it("falls back to the code's copy, then the mode's", () => {
    expect(exerciseSaveError(apiError("UPSTREAM_UNAVAILABLE", 503), "create").message).toBe(
      "O serviço está indisponível no momento. Tente novamente em instantes.",
    );
    expect(exerciseSaveError(new TypeError("offline"), "promote")).toEqual({
      field: null,
      message: "Não foi possível adicionar o exercício ao catálogo. Tente novamente.",
    });
  });
});

describe("muscleGroupErrorMessage", () => {
  it("has the group's own duplicate copy", () => {
    expect(muscleGroupErrorMessage(apiError("NAME_TAKEN", 409), "x")).toBe(MUSCLE_GROUP_NAME_TAKEN_MESSAGE);
    expect(muscleGroupErrorMessage(apiError("NOT_FOUND", 404), "x")).toBe("Este grupo não existe mais.");
    expect(muscleGroupErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});

describe("delete", () => {
  it("tells an exercise in use and a gone one from other failures", () => {
    expect(deleteOutcome(apiError("EXERCISE_IN_USE", 409))).toBe("in-use");
    expect(deleteOutcome(apiError("NOT_FOUND", 404))).toBe("gone");
    expect(deleteOutcome(apiError("PRECONDITION_FAILED", 409))).toBeNull();
    expect(deleteOutcome(new TypeError("offline"))).toBeNull();
  });

  it("names the exercise in the banner, without a count", () => {
    expect(inUseDetail("Supino reto com barra")).toBe(
      '"Supino reto com barra" é usado em treinos. Você ainda pode editá-lo.',
    );
  });
});

describe("list labels", () => {
  it("joins the groups in upstream order and tags a private exercise with its trainer", () => {
    expect(muscleGroupNames(privateExercise)).toBe("Glúteos, Posteriores de coxa");
    expect(privateTagLabel(privateExercise)).toBe("Privado · Ana Ribeiro");
    expect(privateTagLabel({ ...privateExercise, isStarter: true, owner: null })).toBeNull();
  });
});

describe("most-used list", () => {
  it("counts workouts in pt-BR", () => {
    expect(workoutCountLabel(1)).toBe("1 treino");
    expect(workoutCountLabel(412)).toBe("412 treinos");
    expect(workoutCountLabel(1234)).toBe("1.234 treinos");
  });

  it("ranks across pages", () => {
    expect(mostUsedRank(0, 10, 0)).toBe(1);
    expect(mostUsedRank(2, 25, 4)).toBe(55);
  });
});

describe("invalidation (spec §9)", () => {
  const client = () => ({ invalidateQueries: vi.fn() });

  it("an exercise write refreshes both catalog lists and the history, never the bare prefix", () => {
    const queryClient = client();
    invalidateAfterExerciseWrite(queryClient as unknown as QueryClient);
    expect(queryClient.invalidateQueries.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["admin", "exercises"],
      ["admin", "actions"],
    ]);
  });

  it("a muscle-group write also refreshes the groups", () => {
    const queryClient = client();
    invalidateAfterMuscleGroupWrite(queryClient as unknown as QueryClient);
    expect(queryClient.invalidateQueries.mock.calls.map(([arg]) => arg.queryKey)).toEqual([
      ["admin", "muscle-groups"],
      ["admin", "exercises"],
      ["admin", "actions"],
    ]);
  });
});
