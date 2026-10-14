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
    sameSite: "lax",
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
