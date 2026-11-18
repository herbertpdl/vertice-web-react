import { ApiError } from "@/lib/api/client";
import { apiErrorMessage } from "@/lib/api/errorMessages";

/**
 * The copy of the profile's account actions (admin-panel spec §6, §7; pen.dev `bHWbL`). Names come
 * from the profile; the toasts avoid gendered forms ("A conta de X foi suspensa").
 */

/** 409 `PRECONDITION_FAILED` on suspend or reactivate: someone else changed it first. */
export const STATUS_ALREADY_CHANGED_MESSAGE = "O status desta conta já tinha mudado.";

/** 404 or 403 on ending a relationship: it ended elsewhere first. */
export const RELATIONSHIP_ALREADY_ENDED_MESSAGE = "Este vínculo já foi encerrado.";

/** 409 `PRECONDITION_FAILED` on the e-mail routes: sending is switched off (until SES is live). */
export const EMAIL_UNAVAILABLE_MESSAGE = "O envio de e-mails está indisponível no momento.";

/** 503 `UPSTREAM_UNAVAILABLE` on the e-mail routes, and any unknown failure there. */
export const EMAIL_FAILED_MESSAGE = "Não foi possível enviar o e-mail. Tente novamente.";

export type AccountEmail = "first-access" | "password-reset";

export function emailSentMessage(kind: AccountEmail, email: string): string {
  return kind === "first-access"
    ? `E-mail de primeiro acesso enviado para ${email}.`
    : `E-mail de redefinição de senha enviado para ${email}.`;
}

export function statusChangedMessage(action: "suspend" | "reactivate", name: string): string {
  return action === "suspend" ? `A conta de ${name} foi suspensa.` : `A conta de ${name} foi reativada.`;
}

export function relationshipEndedMessage(clientName: string, trainerName: string): string {
  return `Vínculo entre ${clientName} e ${trainerName} encerrado.`;
}

const isCode = (error: unknown, code: string) => error instanceof ApiError && error.code === code;

/** A failed e-mail action: switched off (409), unavailable (503), rate limited (429), or else. */
export function emailErrorMessage(error: unknown): string {
  if (isCode(error, "PRECONDITION_FAILED")) return EMAIL_UNAVAILABLE_MESSAGE;
  if (isCode(error, "UPSTREAM_UNAVAILABLE")) return EMAIL_FAILED_MESSAGE;
  return apiErrorMessage(error, EMAIL_FAILED_MESSAGE);
}

/** Whether a suspend or reactivate failed because the account had already changed (or gone). */
export function isStaleStatus(error: unknown): boolean {
  return isCode(error, "PRECONDITION_FAILED") || isCode(error, "NOT_FOUND");
}

/** Whether an end-relationship failed because the relationship is no longer active. */
export function isRelationshipGone(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 403);
}

/** The BFF's own 400 on the reason (`details.fieldErrors.reason`), as a field error. */
export function reasonFieldError(error: unknown): string | null {
  if (!isCode(error, "VALIDATION_ERROR")) return null;
  const details = (error as ApiError).details as { fieldErrors?: Record<string, unknown> } | undefined;
  return details?.fieldErrors?.reason ? "Informe um motivo de 1 a 500 caracteres." : null;
}
