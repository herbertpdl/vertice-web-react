import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { APP_ONLY_MESSAGE, TRAINERS_ONLY_CODE } from "./trainerOnly";

/**
 * The www login form's copy for a failed `/api/auth/login`, keyed on status and `error.code`.
 * 403 `ACCOUNT_SUSPENDED` (R41) reads from `errorMessages`.
 */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return "E-mail ou senha inválidos";
  if (error instanceof ApiError && error.code === TRAINERS_ONLY_CODE) return APP_ONLY_MESSAGE;
  return apiErrorMessage(error, "Não foi possível entrar");
}
