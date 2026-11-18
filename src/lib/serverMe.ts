import "server-only";
import { headers } from "next/headers";
import type { Me } from "./api/types";
import { bffUrl } from "./bff";
import { serverEnv } from "./env.server";
import { forwardedFor } from "./forwardedFor";

/** What a server layout learns from `GET /auth/me` with a session token (admin-panel spec W4). */
export type ServerMe =
  | { kind: "ok"; me: Me }
  /** 401: the token is expired, revoked, or its account is gone or suspended. */
  | { kind: "unauthorized" }
  /** 403: the BFF refuses this role the route. */
  | { kind: "forbidden" }
  /** A network error, a 5xx or an unreadable answer: nothing is known. */
  | { kind: "unavailable" };

/**
 * `GET /auth/me` from a server component, with `token` as bearer and the browser's address as
 * `X-Forwarded-For` (as `bffHeaders` does for route handlers). Never throws, so the caller can
 * call `redirect()`/`notFound()` (which work by throwing) outside any try/catch.
 */
export async function fetchMeOnServer(token: string): Promise<ServerMe> {
  try {
    const incoming = await headers();
    const xff = forwardedFor(incoming.get("x-forwarded-for"), serverEnv().trustedProxyHops);
    const res = await fetch(bffUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}`, ...(xff ? { "X-Forwarded-For": xff } : {}) },
      cache: "no-store",
    });
    if (res.status === 401) return { kind: "unauthorized" };
    if (res.status === 403) return { kind: "forbidden" };
    if (!res.ok) return { kind: "unavailable" };
    return { kind: "ok", me: (await res.json()) as Me };
  } catch {
    return { kind: "unavailable" };
  }
}
