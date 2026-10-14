import { ApiError } from "./client";
import { rateLimitedMessage } from "./rateLimit";

/**
 * pt-BR copy per BFF error `code` (vertice-bff `docs/api-contract.md`, "Errors"). The `message`
 * the BFF sends is English and meant for logs: screens key on `code` and show this copy, never
 * `error.message`. A screen that gives a code its own meaning (a 409 `PRECONDITION_FAILED` on a
 * delete, a 401 on login) handles it before falling back to `apiErrorMessage`.
 */
export const errorMessages: Readonly<Record<string, string>> = {
  VALIDATION_ERROR: "Alguns dados não foram aceitos. Revise e tente novamente.",
  UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
  UNAUTHENTICATED: "Sua sessão expirou. Entre novamente.",
  FORBIDDEN: "Você não tem acesso a este recurso.",
  NOT_FOUND: "Não encontrado. Ele pode ter sido removido.",
  // The BFF sends the same 409 for a taken email and a taken CPF, so it never says which one.
  CONFLICT: "E-mail ou CPF já cadastrado",
  PRECONDITION_FAILED: "Não é possível fazer isso no estado atual.",
  UPSTREAM_ERROR: "Ocorreu um erro inesperado. Tente novamente.",
  UPSTREAM_UNAVAILABLE: "O serviço está indisponível no momento. Tente novamente em instantes.",
};

/**
 * The pt-BR message for a failed call: the rate-limit copy for a 429, the copy for the error's
 * `code`, or `fallback` for an unknown code or a non-API error (a network `TypeError`, ...).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const rateLimited = rateLimitedMessage(error);
  if (rateLimited) return rateLimited;
  if (error instanceof ApiError && Object.hasOwn(errorMessages, error.code)) {
    return errorMessages[error.code];
  }
  return fallback;
}
