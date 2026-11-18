import "server-only";
import { cookies } from "next/headers";
import { adminChallengeCookieName, adminSessionCookieName } from "./adminCookies";
import { serverEnv } from "./env.server";

// The admin workspace's cookies (admin-panel spec W6, §3), as `session.ts` is for
// `vertice_session`. This is the one module that reads or writes them. Only the admin host's
// handlers call it. Both are host-only (`__Host-` in production: `Secure`, `Path=/`, no `Domain`),
// `HttpOnly` and `SameSite=Strict`, and neither ever outlives what it carries: there is no
// "remember me" for an admin.

/** The challenge lives at most 5 minutes (BFF: `challengeExpiresAt` is 5 minutes out). */
export const CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

/** The sign-in's hard cap after `auth_time` (PRD R12: 12 hours, however active). */
export const SESSION_CAP_SECONDS = 12 * 60 * 60;

function baseOptions() {
  return {
    httpOnly: true,
    secure: serverEnv().isProduction,
    sameSite: "strict" as const,
    path: "/",
  };
}

/**
 * A clearing cookie with the same attributes: a browser drops a `__Host-` cookie only for a
 * `Set-Cookie` that is itself `Secure` with `Path=/`, which a bare `delete(name)` doesn't promise.
 */
function expired() {
  return { ...baseOptions(), maxAge: 0 };
}

/** Whole seconds from `now` until the ISO instant `until`, never negative; 0 for an unparsable one. */
export function secondsUntil(until: string, now: number = Date.now()): number {
  const at = Date.parse(until);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.floor((at - now) / 1000));
}

/** Sets the admin session; its `maxAge` is the time left until the token's own `expiresAt`. */
export async function setAdminSession(token: string, expiresAt: string, now: number = Date.now()) {
  const store = await cookies();
  store.set(adminSessionCookieName(serverEnv().isProduction), token, {
    ...baseOptions(),
    maxAge: secondsUntil(expiresAt, now),
  });
}

/** The admin JWT from `__Host-vertice_admin` (`vertice_admin` outside production), if any. */
export async function getAdminSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(adminSessionCookieName(serverEnv().isProduction))?.value;
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(adminSessionCookieName(serverEnv().isProduction), "", expired());
}

/** Stores the sign-in challenge (never sent to the browser in a body), for at most 5 minutes. */
export async function setAdminChallenge(
  challenge: string,
  challengeExpiresAt: string,
  now: number = Date.now(),
) {
  const store = await cookies();
  store.set(adminChallengeCookieName(serverEnv().isProduction), challenge, {
    ...baseOptions(),
    maxAge: Math.min(secondsUntil(challengeExpiresAt, now), CHALLENGE_MAX_AGE_SECONDS),
  });
}

export async function getAdminChallenge(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(adminChallengeCookieName(serverEnv().isProduction))?.value;
}

export async function clearAdminChallenge() {
  const store = await cookies();
  store.set(adminChallengeCookieName(serverEnv().isProduction), "", expired());
}

export interface AdminTokenTimes {
  /** `iat`, ISO. */
  issuedAt: string;
  /** `exp`, ISO: the token's own expiry, at most 30 minutes after `iat`. */
  expiresAt: string;
  /** `auth_time + 12 h`, ISO: the hard cap renewal never moves. */
  sessionEndsAt: string;
}

function decodePayload(token: string): Record<string, unknown> | undefined {
  const part = token.split(".")[1];
  if (!part) return undefined;
  try {
    const json = Buffer.from(part, "base64url").toString("utf8");
    const payload: unknown = JSON.parse(json);
    return typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

const isSeconds = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * The token's times, read from its payload **without verifying it**: only for scheduling renewal
 * and sign-out, never to decide access (the BFF and vertice-api verify every call). `undefined`
 * for anything that isn't a payload with integer `iat`, `exp` and `auth_time`.
 */
export function adminTokenTimes(token: string): AdminTokenTimes | undefined {
  const payload = decodePayload(token);
  if (!payload) return undefined;
  const { iat, exp, auth_time: authTime } = payload;
  if (!isSeconds(iat) || !isSeconds(exp) || !isSeconds(authTime)) return undefined;
  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
  return {
    issuedAt: iso(iat),
    expiresAt: iso(exp),
    sessionEndsAt: iso(authTime + SESSION_CAP_SECONDS),
  };
}
