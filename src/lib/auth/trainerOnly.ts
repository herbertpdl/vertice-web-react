import type { Role } from "@/lib/api/types";

/**
 * The web is the trainer's workspace; clients (and admins) use the mobile app (PRD
 * web-trainer-only-access R1–R7). The BFF's login serves every role, so the web decides.
 */
export function isTrainer(role: Role | undefined): boolean {
  return role === "TRAINER";
}

/** The web-only code `/api/auth/login` answers a correct password of a non-trainer with. */
export const TRAINERS_ONLY_CODE = "TRAINERS_ONLY";

/** What a refused client or admin reads on the login page (R3, R5). */
export const APP_ONLY_MESSAGE = "O acesso de alunos é feito somente pelo aplicativo Vertice.";

/** Where a non-trainer session is sent after it is signed out (R7): the login, with `APP_ONLY_MESSAGE`. */
export const APP_ONLY_LOGIN_PATH = "/login?motivo=app";
