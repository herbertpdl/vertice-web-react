import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { ACCOUNT_SUSPENDED_CODE, ACCOUNT_SUSPENDED_MESSAGE } from "./suspended";
import { APP_ONLY_MESSAGE, TRAINERS_ONLY_CODE } from "./trainerOnly";

/** The www login form's copy for a failed `/api/auth/login`, keyed on status and `error.code`. */
export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return "E-mail ou senha inválidos";
  if (error instanceof ApiError && error.code === TRAINERS_ONLY_CODE) return APP_ONLY_MESSAGE;
  if (error instanceof ApiError && error.code === ACCOUNT_SUSPENDED_CODE) return ACCOUNT_SUSPENDED_MESSAGE;
  return apiErrorMessage(error, "Não foi possível entrar");
}
