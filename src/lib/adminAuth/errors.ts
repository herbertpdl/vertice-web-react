import { ApiError } from "@/lib/api/client";
import { apiErrorMessage, errorMessages } from "@/lib/api/errorMessages";
import { rateLimitedMessage } from "@/lib/api/rateLimit";

/** What each sign-in failure does to the screen (admin-panel spec W10, §6). */
export type SignInFailure =
  /** Show `message` in the form banner, stay on the step. */
  | { kind: "message"; message: string; retryAfter?: number }
  /** 400 INVALID_SECOND_FACTOR_CODE: "Código inválido", same challenge. */
  | { kind: "codeRejected" }
  /** 401 CHALLENGE_INVALID or a 409 at verify: back to the password with the expiry notice. */
  | { kind: "challengeEnded" }
  /** 409 at enroll: already enrolled, go to the code step. */
  | { kind: "alreadyEnrolled" };

/** The admin password step's 401: the same for a wrong password and another role's correct one (R4). */
export const INVALID_CREDENTIALS_MESSAGE = "E-mail ou senha inválidos";

export function signInFailure(error: unknown, step: "login" | "enroll" | "verify"): SignInFailure {
  if (!(error instanceof ApiError)) {
    return { kind: "message", message: apiErrorMessage(error, "Não foi possível entrar") };
  }
  if (error.status === 429) {
    return { kind: "message", message: rateLimitedMessage(error)!, retryAfter: error.retryAfter };
  }
  if (error.code === "ACCOUNT_SUSPENDED") return { kind: "message", message: errorMessages.ACCOUNT_SUSPENDED! };
  if (step === "login" && error.status === 401) return { kind: "message", message: INVALID_CREDENTIALS_MESSAGE };
  if (error.code === "CHALLENGE_INVALID") return { kind: "challengeEnded" };
  if (step === "verify" && error.code === "INVALID_SECOND_FACTOR_CODE") return { kind: "codeRejected" };
  if (step === "verify" && error.status === 409) return { kind: "challengeEnded" };
  if (step === "enroll" && error.status === 409) return { kind: "alreadyEnrolled" };
  return { kind: "message", message: apiErrorMessage(error, "Não foi possível entrar") };
}
