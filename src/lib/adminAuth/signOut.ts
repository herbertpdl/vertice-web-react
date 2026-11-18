import { ADMIN_LOGOUT_ENDPOINT, adminSignInPath, type AdminSignOutReason } from "./paths";

let signingOut = false;
let pendingRenew: Promise<unknown> | null = null;

/**
 * Registers a renewal in flight, so a sign-out waits for it. A renew answered after the logout
 * would set a fresh admin cookie while the page leaves (logout revokes nothing upstream: the
 * cookie is the only copy of the token), so the logout must be the last word.
 */
export function trackRenew<T>(renew: Promise<T>): Promise<T> {
  pendingRenew = renew;
  const clear = () => {
    if (pendingRenew === renew) pendingRenew = null;
  };
  renew.then(clear, clear);
  return renew;
}

/**
 * Starts a renewal unless a sign-out has begun (then `skipped`, with no request), and tracks it so
 * a later sign-out waits for it.
 */
export function startRenew<T>(start: () => Promise<T>, skipped: T): Promise<T> {
  if (signingOut) return Promise.resolve(skipped);
  return trackRenew(start());
}

/** Whether a sign-out has begun: no new renewal may start after it. */
export function isSigningOut(): boolean {
  return signingOut;
}

/**
 * The one way an admin session ends in the browser (admin-panel spec §5, W9): the 401 path, a
 * 401 from renew, the sign-out timer, "Sair" and a password change all come here. It first lets
 * any renewal in flight settle (see `trackRenew`), then clears both admin cookies server-side
 * (they are httpOnly), then hard-navigates to the sign-in, which also drops the query cache.
 * Concurrent calls collapse into the first.
 */
export async function signOutAdmin(reason?: AdminSignOutReason): Promise<void> {
  if (signingOut) return;
  signingOut = true;
  await pendingRenew?.catch(() => undefined);
  await fetch(ADMIN_LOGOUT_ENDPOINT, { method: "POST" }).catch(() => undefined);
  window.location.href = adminSignInPath(reason);
}

/** Tests only: a fresh module state per case. */
export function resetSignOutForTests(): void {
  signingOut = false;
  pendingRenew = null;
}
