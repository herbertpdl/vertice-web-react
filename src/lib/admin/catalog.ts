import type { QueryClient } from "@tanstack/react-query";
import { adminKeys } from "@/lib/api/admin";
import type { AdminCatalogFilters } from "@/lib/api/adminCatalog";
import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import type {
  AdminCatalogExercise,
  AdminCatalogScope,
  AdminExerciseRequest,
  MuscleGroup,
} from "@/lib/api/types";
import { formatCount } from "@/lib/format";
import type { ExerciseFormInput } from "@/lib/validation/exercises";
import { normalizeSearch } from "./users";

/**
 * The admin catalog's rules (admin-panel spec §6, §7, §9; PRD R52–R65): the tabs and filters in the
 * URL, the exercise form's body, the error copy and what each write invalidates.
 */

// --- Tabs and filters ----------------------------------------------------------------------------

/** "Catálogo inicial" (the starter set, editable) or "Exercícios dos treinadores" (read-only). */
export type CatalogTab = "starter" | "trainers";

export const catalogTabScope: Record<CatalogTab, AdminCatalogScope> = {
  starter: "STARTER",
  trainers: "PRIVATE",
};

export const catalogTabLabels: Record<CatalogTab, string> = {
  starter: "Catálogo inicial",
  trainers: "Exercícios dos treinadores",
};

export const catalogTabSubtitles: Record<CatalogTab, string> = {
  starter: "Catálogo inicial disponível para todos os treinadores",
  trainers: "Exercícios privados criados pelos treinadores",
};

/** What the page reads from its URL: the tab, the group filter and the search. */
export interface CatalogView {
  tab: CatalogTab;
  muscleGroupId?: number;
  q?: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A positive integer id, or `undefined` (a hand-edited `?grupo=` never reaches the BFF as a 400). */
export function parseId(value: string | undefined): number | undefined {
  if (!value || !/^[1-9][0-9]{0,9}$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : undefined;
}

/** `?aba=treinadores`, `?grupo=<id>`, `?q=`. Anything else is ignored. */
export function catalogViewFromParams(params: SearchParams): CatalogView {
  const tab: CatalogTab = first(params.aba) === "treinadores" ? "trainers" : "starter";
  const muscleGroupId = parseId(first(params.grupo));
  const q = normalizeSearch(first(params.q) ?? "");
  return { tab, ...(muscleGroupId && { muscleGroupId }), ...(q && { q }) };
}

export function catalogViewToSearch(view: CatalogView): string {
  const params = new URLSearchParams();
  if (view.tab === "trainers") params.set("aba", "treinadores");
  if (view.muscleGroupId) params.set("grupo", String(view.muscleGroupId));
  if (view.q) params.set("q", view.q);
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** The BFF filters of a view. */
export function catalogFilters(view: CatalogView): AdminCatalogFilters {
  return {
    scope: catalogTabScope[view.tab],
    ...(view.muscleGroupId && { muscleGroupId: view.muscleGroupId }),
    ...(view.q && { q: view.q }),
  };
}

/** The group filter's options: "Todos os grupos" (empty value) and then each group, as listed. */
export function muscleGroupFilterOptions(groups: MuscleGroup[] | undefined) {
  return [
    { value: "", label: "Todos os grupos" },
    ...(groups ?? []).map((group) => ({ value: String(group.id), label: group.name })),
  ];
}

// --- The exercise form ---------------------------------------------------------------------------

export type ExerciseDialogMode = "create" | "edit" | "promote";

/** The form's starting values: empty for a new exercise, the row's for an edit or a promote copy. */
export function exerciseFormDefaults(exercise?: AdminCatalogExercise): ExerciseFormInput {
  return {
    name: exercise?.name ?? "",
    muscleGroupIds: exercise?.muscleGroups.map((group) => group.id) ?? [],
    description: exercise?.description ?? "",
    videoUrl: exercise?.videoUrl ?? "",
  };
}

/**
 * The body of every exercise write. The update is a full replace (BFF B18), so every field is
 * sent, an empty description or video URL as `""`.
 */
export function exerciseRequest(form: ExerciseFormInput): AdminExerciseRequest {
  return {
    name: form.name,
    muscleGroupIds: form.muscleGroupIds,
    description: form.description ?? "",
    videoUrl: form.videoUrl ?? "",
  };
}

const isCode = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

export function isNameTaken(error: unknown): boolean {
  return isCode(error, "NAME_TAKEN");
}

/** 409 `NAME_TAKEN` on a muscle-group create or rename. */
export const MUSCLE_GROUP_NAME_TAKEN_MESSAGE = "Já existe um grupo com esse nome";

const saveFailed: Record<ExerciseDialogMode, string> = {
  create: "Não foi possível criar o exercício. Tente novamente.",
  edit: "Não foi possível salvar o exercício. Tente novamente.",
  promote: "Não foi possível adicionar o exercício ao catálogo. Tente novamente.",
};

/**
 * A failed exercise save: the duplicate name is a field error on "Nome" (`a5D2r`); anything else
 * is one message for the dialog's banner, keyed on the code.
 */
export function exerciseSaveError(
  error: unknown,
  mode: ExerciseDialogMode,
): { field: "name"; message: string } | { field: null; message: string } {
  if (isNameTaken(error)) return { field: "name", message: errorMessages.NAME_TAKEN! };
  if (mode === "promote" && isCode(error, "PRECONDITION_FAILED")) {
    return { field: null, message: "Este exercício já está no catálogo inicial." };
  }
  if (mode === "edit" && isCode(error, "FORBIDDEN")) {
    return { field: null, message: "Exercícios dos treinadores não podem ser editados aqui." };
  }
  if (mode !== "create" && isCode(error, "NOT_FOUND")) {
    return { field: null, message: "Este exercício não existe mais." };
  }
  return { field: null, message: apiErrorMessage(error, saveFailed[mode]) };
}

export function exerciseSavedMessage(mode: ExerciseDialogMode, name: string): string {
  switch (mode) {
    case "create":
      return `"${name}" foi adicionado ao catálogo inicial.`;
    case "edit":
      return `"${name}" foi atualizado.`;
    case "promote":
      return `Uma cópia de "${name}" foi adicionada ao catálogo inicial.`;
  }
}

/** A failed muscle-group create or rename: the group's own duplicate copy, else by code. */
export function muscleGroupErrorMessage(error: unknown, fallback: string): string {
  if (isNameTaken(error)) return MUSCLE_GROUP_NAME_TAKEN_MESSAGE;
  if (isCode(error, "NOT_FOUND")) return "Este grupo não existe mais.";
  return apiErrorMessage(error, fallback);
}

// --- Delete --------------------------------------------------------------------------------------

/**
 * What a delete ended in. `in-use` (409 `EXERCISE_IN_USE`, E28) closes the confirmation and shows
 * the page banner (`LWZZa`); `gone` (404) means it was already deleted. Any other failure stays in
 * the confirmation (`null`).
 */
export function deleteOutcome(error: unknown): "in-use" | "gone" | null {
  if (isCode(error, "EXERCISE_IN_USE")) return "in-use";
  if (isCode(error, "NOT_FOUND")) return "gone";
  return null;
}

/** The banner's second line (`LWZZa`, without the count the error does not carry, §7.1). */
export function inUseDetail(name: string): string {
  return `"${name}" é usado em treinos. Você ainda pode editá-lo.`;
}

export const DELETE_FAILED_MESSAGE = "Não foi possível excluir o exercício. Tente novamente.";

// --- Lists ---------------------------------------------------------------------------------------

/** "Peito, Tríceps": the groups in upstream order (primary first). */
export function muscleGroupNames(exercise: AdminCatalogExercise): string {
  return exercise.muscleGroups.map((group) => group.name).join(", ");
}

/** The most-used table's tag for a trainer's private exercise: "Privado · Ana Ribeiro". */
export function privateTagLabel(exercise: AdminCatalogExercise): string | null {
  return exercise.owner ? `Privado · ${exercise.owner.name}` : null;
}

/** "1 treino", "412 treinos" (the phone list's meta line). */
export function workoutCountLabel(count: number): string {
  return count === 1 ? "1 treino" : `${formatCount(count)} treinos`;
}

/** A row's 1-based rank across pages: every page before this one was full (cursor paging). */
export function mostUsedRank(pageIndex: number, pageSize: number, indexOnPage: number): number {
  return pageIndex * pageSize + indexOnPage + 1;
}

// --- Invalidation (spec §9) ----------------------------------------------------------------------

/** After an exercise create, update, delete or promote: both catalog lists and the history. */
export function invalidateAfterExerciseWrite(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: adminKeys.exercises() });
  void queryClient.invalidateQueries({ queryKey: adminKeys.actions() });
}

/** After a muscle-group create or rename: the groups, the lists (they show group names), the history. */
export function invalidateAfterMuscleGroupWrite(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: adminKeys.muscleGroups() });
  void queryClient.invalidateQueries({ queryKey: adminKeys.exercises() });
  void queryClient.invalidateQueries({ queryKey: adminKeys.actions() });
}
