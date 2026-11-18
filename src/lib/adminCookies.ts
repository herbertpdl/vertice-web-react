// The admin workspace's cookie names (admin-panel spec W6). Pure, so the edge proxy can read them
// as well as the server-only `adminSession.ts`. In production both carry the `__Host-` prefix,
// which makes the browser require `Secure`, `Path=/` and no `Domain`: the cookie can never be
// set for, or sent to, another host. Outside production the dev server is plain http, where
// `Secure` can't hold, so the prefix is dropped, as `vertice_session` drops `Secure` there.

/** The admin session cookie (the admin JWT); its lifetime is the token's own. */
export function adminSessionCookieName(isProduction: boolean): string {
  return isProduction ? "__Host-vertice_admin" : "vertice_admin";
}

/** The short-lived sign-in challenge cookie (at most 5 minutes). */
export function adminChallengeCookieName(isProduction: boolean): string {
  return isProduction ? "__Host-vertice_admin_challenge" : "vertice_admin_challenge";
}
