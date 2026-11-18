import { authRequest } from "./auth";
import type { AdminEnrollment, AdminSession, SecondFactor } from "./types";

// The admin sign-in (admin-panel spec W7, W15). These go to this app's own `/api/admin/auth/*`
// handlers, which keep the challenge and the token in host-only cookies: no body here ever
// carries either. Through `authRequest`, like the www login, so a 401 is a form error the screen
// shows, not `apiClient`'s sign-out.

/**
 * The password step. The challenge stays server-side; the answer says which step is next and when
 * the challenge ends, as `challengeDeadline` on this browser's clock (`Date.now()` at receipt plus
 * the seconds the server counted), so a skewed computer clock doesn't misjudge it.
 */
export async function adminLogin(input: { email: string; password: string }) {
  const answer = await authRequest<{ secondFactor: SecondFactor; challengeExpiresIn: number }>(
    "/api/admin/auth/login",
    input,
  );
  return {
    secondFactor: answer.secondFactor,
    challengeDeadline: Date.now() + answer.challengeExpiresIn * 1000,
  };
}

/** A new authenticator secret, as an `otpauth://` URI. Keep it in component state only. */
export function adminEnroll() {
  return authRequest<AdminEnrollment>("/api/admin/auth/enroll", undefined);
}

/** The code step: on success the session cookie is set. */
export function adminVerify(code: string) {
  return authRequest<Omit<AdminSession, "token">>("/api/admin/auth/verify", { code });
}

/** Clears both admin cookies. Never throws: signing out must always reach the sign-in page. */
export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => undefined);
}
