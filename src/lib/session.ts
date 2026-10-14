import "server-only";
import { cookies } from "next/headers";
import { serverEnv } from "./env.server";

const COOKIE_NAME = "vertice_session";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setSession(token: string, remember: boolean) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv().isProduction,
    // Strict: no cross-site request carries the session, not even a top-level navigation from a
    // link in another site. Nothing needs it to: /definir-senha (the one link sent outside the
    // app) is public, and the login that follows it is a same-site request. The cost is that a
    // link to a signed-in page opened from another site (an email, a chat) shows /login once.
    sameSite: "strict",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
