import { ApiError } from "./client";
import { MAX_EXERCISES_PER_WORKOUT, MAX_FEEDBACK_PER_LOG, MAX_SETS_PER_EXERCISE } from "@/lib/validation/bounds";
import { rateLimitedMessage } from "./rateLimit";
import type { ApiErrorCode } from "./types";

/**
 * pt-BR copy per BFF error `code`. Keyed on the generated `ApiErrorCode`, so a code the BFF does
 * not document cannot get copy here, and `Partial` because some codes are handled elsewhere
 * (`RATE_LIMITED` by `rateLimitedMessage`, `INVALID_SETUP_TOKEN` by the first-access page). The
 * `message` the BFF sends is English and meant for logs: screens key on `code` and show this
 * copy, never `error.message`. A screen that gives a code its own meaning (a 409
 * `PRECONDITION_FAILED` on a delete, a 401 on login) handles it before falling back to
 * `apiErrorMessage`.
 */
export const errorMessages: Readonly<Partial<Record<ApiErrorCode, string>>> = {
  VALIDATION_ERROR: "Alguns dados não foram aceitos. Revise e tente novamente.",
  UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
  UNAUTHENTICATED: "Sua sessão expirou. Entre novamente.",
  FORBIDDEN: "Você não tem acesso a este recurso.",
  NOT_FOUND: "Não encontrado. Ele pode ter sido removido.",
  // The BFF sends the same 409 for a taken email and a taken CPF, so it never says which one.
  CONFLICT: "E-mail ou CPF já cadastrado",
  PRECONDITION_FAILED: "Não é possível fazer isso no estado atual.",
  // `DELETE /auth/me` and `POST /auth/password`: a 400, not a logout (the session is still valid).
  INVALID_CURRENT_PASSWORD: "Senha incorreta.",
  // `DELETE /auth/me` by a trainer who still has clients linked.
  ACTIVE_CLIENTS: "Encerre o acompanhamento de cada aluno antes de excluir sua conta.",
  // `GET /auth/me/export` over vertice-api's export bounds.
  TOO_LARGE: "Seus dados passam do limite da exportação automática. Fale com o suporte para recebê-los.",
  UPSTREAM_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
  UPSTREAM_UNAVAILABLE: "O serviço está indisponível no momento. Tente novamente em instantes.",
  // The BFF's own unhandled-error body (`src/plugins/error-handler.ts`), a 500.
  INTERNAL_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
};

/**
 * The per-item caps vertice-api enforces and the web UI also blocks up front. The 400 carries the
 * API's English text (`exercises: must not exceed 20 entries`, `sets: must not exceed 10 entries`,
 * `workoutLogId: a workout session takes at most 10 feedback entries`); the code is the generic
 * `VALIDATION_ERROR`, so these are told apart by that text and given their own copy.
 */
export function limitMessage(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_ERROR") return null;
  const text = error.message;
  if (/exercises: must not exceed \d+ entries/.test(text)) {
    return `Um treino pode ter no máximo ${MAX_EXERCISES_PER_WORKOUT} exercícios.`;
  }
  if (/sets: must not exceed \d+ entries/.test(text)) {
    return `Um exercício pode ter no máximo ${MAX_SETS_PER_EXERCISE} séries.`;
  }
  if (/at most \d+ feedback entries/.test(text)) {
    return `Cada treino realizado aceita no máximo ${MAX_FEEDBACK_PER_LOG} comentários de feedback.`;
  }
  return null;
}

/**
 * The pt-BR message for a failed call: the rate-limit copy for a 429, the copy for the error's
 * `code`, or `fallback` for an unknown code or a non-API error (a network `TypeError`, ...).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const rateLimited = rateLimitedMessage(error);
  if (rateLimited) return rateLimited;
  const limit = limitMessage(error);
  if (limit) return limit;
  // `error.code` is any string (a BFF ahead of this build can send an unknown code), so the
  // lookup is guarded rather than typed: an unmapped code falls back.
  if (error instanceof ApiError && Object.hasOwn(errorMessages, error.code)) {
    return errorMessages[error.code as ApiErrorCode] ?? fallback;
  }
  return fallback;
}

/**
 * A 409 `PRECONDITION_FAILED` on a delete: a client already recorded training under it (the BFF's
 * `HasRecordedDataException` mapping). The generic copy above would not say why.
 */
export const deleteRefusedMessages = {
  trainingPlan: "Este plano já tem treinos registrados e não pode ser excluído.",
  workout: "Este treino já tem registros de um aluno e não pode ser excluído.",
} as const;

/** `apiErrorMessage` for a delete of `resource`, with the "already has recorded data" copy on 409. */
export function deleteErrorMessage(
  error: unknown,
  resource: keyof typeof deleteRefusedMessages,
  fallback: string,
): string {
  if (error instanceof ApiError && error.code === "PRECONDITION_FAILED") {
    return deleteRefusedMessages[resource];
  }
  return apiErrorMessage(error, fallback);
}
