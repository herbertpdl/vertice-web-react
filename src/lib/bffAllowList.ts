import type { Workspace } from "./host";

// Which upstream paths `/api/bff/[...path]` forwards from each host (admin-panel spec W5). The
// BFF and vertice-api check roles too; this keeps each host's token on its own workspace's routes,
// so an admin token never reaches a trainer route from the admin host and www never proxies
// `/admin/**`. `/admin/auth/**` is refused on both: the challenge and the admin token move only
// through the dedicated `/api/admin/auth/*` handlers, never through the generic proxy.

/** What ADMIN may call outside `/admin` (the BFF's B7 list), as `METHOD /path`. */
const ADMIN_EXTRA = new Set([
  "GET /auth/me",
  "POST /auth/password",
  "POST /auth/me/consent",
  "GET /muscle-groups",
]);

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * Whether the proxy may forward `method upstreamPath` from `workspace`'s host. `upstreamPath` is
 * `bffProxyPath`'s output (`/admin/users/4`), already free of dot segments and empty segments,
 * and without the query string.
 */
export function bffPathAllowed(workspace: Workspace, method: string, upstreamPath: string): boolean {
  // Lower-cased for the prefix checks, so `/Admin/auth/...` can't slip past them either way.
  const path = upstreamPath.toLowerCase();
  if (isUnder(path, "/admin/auth")) return false;
  if (workspace === "trainer") return !isUnder(path, "/admin");
  return isUnder(path, "/admin") || ADMIN_EXTRA.has(`${method.toUpperCase()} ${upstreamPath}`);
}
