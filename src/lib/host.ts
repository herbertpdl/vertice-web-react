import { NextResponse } from "next/server";
import { serverEnv } from "./env.server";

// One app, two workspaces (admin-panel spec W1–W3). The workspace comes from the `Host` header
// alone: CloudFront forwards the viewer's own `Host` (the alias the browser asked for), and a
// client can't make it another of our hostnames. `X-Forwarded-Host` is never read, since any client
// can send it. Everything that isn't `ADMIN_HOST` is the trainer workspace, unknown hosts and the
// container health check's `localhost:3000` included, which is today's behaviour.

export type Workspace = "admin" | "trainer";

/**
 * The hostname part of a `Host` header, lower-cased with the port dropped (`ADMIN.vertice.fit:443`
 * → `admin.vertice.fit`, `[::1]:3000` → `[::1]`), or `undefined` when there is none.
 */
export function hostnameOf(host: string | null | undefined): string | undefined {
  const value = host?.trim().toLowerCase();
  if (!value) return undefined;
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    return end === -1 ? undefined : value.slice(0, end + 1);
  }
  return value.split(":", 1)[0] || undefined;
}

/** `admin` when the request's `Host` is `ADMIN_HOST`, `trainer` for any other host or none. */
export function workspaceOf(headers: Headers): Workspace {
  const { adminHost } = serverEnv();
  // ADMIN_HOST unset (production before the admin host exists): no request is the admin's.
  if (!adminHost) return "trainer";
  return hostnameOf(headers.get("host")) === adminHost ? "admin" : "trainer";
}

/** The answer for a handler on the other workspace's host: the same 404 as an unknown path. */
export function wrongHost(): NextResponse {
  return NextResponse.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
}

/**
 * The first check of every `/api/*` handler, before `guardApiRequest` (W3): a 404 unless the
 * request reached the host of `expected` (`any`: both hosts), or `undefined` to carry on. The
 * proxy's matcher excludes `/api`, so this is the only host check a handler gets.
 */
export function hostGuard(request: Request, expected: Workspace | "any"): NextResponse | undefined {
  if (expected === "any") return undefined;
  return workspaceOf(request.headers) === expected ? undefined : wrongHost();
}
