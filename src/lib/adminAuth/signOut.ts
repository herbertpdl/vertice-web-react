import { ADMIN_LOGOUT_ENDPOINT, adminSignInPath, type AdminSignOutReason } from "./paths";

let signingOut = false;

/**
 * The one way an admin session ends in the browser (admin-panel spec §5, W9): the 401 path, a
 * 401 from renew, the sign-out timer and "Sair" all come here. It clears both admin cookies
 * server-side (they are httpOnly), then hard-navigates to the sign-in, which also drops the query
 * cache. Concurrent calls collapse into the first.
 */
export function signOutAdmin(reason?: AdminSignOutReason): void {
  if (signingOut) return;
  signingOut = true;
  fetch(ADMIN_LOGOUT_ENDPOINT, { method: "POST" })
    .catch(() => undefined)
    .finally(() => {
      window.location.href = adminSignInPath(reason);
    });
}
