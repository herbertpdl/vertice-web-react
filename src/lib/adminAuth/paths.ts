// Where the admin workspace sends a signed-out admin (admin-panel spec W9). Pure, with no
// imports, so `src/lib/api/client.ts` can use it without an import cycle.

export const ADMIN_PREFIX = "/painel";
export const ADMIN_SIGN_IN_PATH = "/painel/entrar";

/** Why the admin is back at the sign-in: `expirou` shows "Sua sessão expirou. Entre novamente.". */
export type AdminSignOutReason = "expirou";

export function adminSignInPath(reason?: AdminSignOutReason): string {
  return reason ? `${ADMIN_SIGN_IN_PATH}?motivo=${reason}` : ADMIN_SIGN_IN_PATH;
}

/** Whether a page path is the admin workspace's (only the admin host serves `/painel`, W2). */
export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`);
}

/** The admin logout handler: clears the session and the challenge cookies. */
export const ADMIN_LOGOUT_ENDPOINT = "/api/admin/auth/logout";
