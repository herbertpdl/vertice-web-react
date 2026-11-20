import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Source scan (admin-panel spec W3, §10): the proxy's matcher excludes `/api`, so each handler's
// own `hostGuard` is its only host check. Every `route.ts` under `src/app/api` must call it, with
// the workspace this table names. A new handler fails here until it is added, on purpose.
const EXPECTED: Record<string, "trainer" | "admin" | "any"> = {
  "auth/login": "trainer",
  "auth/register": "trainer",
  "auth/password/setup": "trainer",
  "auth/logout": "trainer",
  "bff/[...path]": "any",
  "assistant/workout-chat": "trainer",
  "admin/auth/login": "admin",
  "admin/auth/enroll": "admin",
  "admin/auth/verify": "admin",
  "admin/auth/renew": "admin",
  "admin/auth/session": "admin",
  "admin/auth/logout": "admin",
};

const API_DIR = path.join(import.meta.dirname);

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

const routes = routeFiles(API_DIR).map((file) => ({
  route: path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/"),
  source: readFileSync(file, "utf8"),
}));

describe("every /api handler checks the host", () => {
  it("finds the handlers", () => {
    expect(routes.map((r) => r.route).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(routes.map((r) => [r.route, r.source]))("%s guards every handler with its workspace", (route, source) => {
    const calls = [...source.matchAll(/hostGuard\(request, "(trainer|admin|any)"\)/g)].map((m) => m[1]);
    // One guard per handler function (a file may export several methods), and every one of them
    // names this route's workspace: a guard in only one of two handlers, or the wrong host, fails.
    const handlers = [...source.matchAll(/(?:async\s+)?function\s+\w+\(\s*request\b/g)].length;
    expect(handlers).toBeGreaterThan(0);
    expect(calls).toEqual(Array(handlers).fill(EXPECTED[route]));
    // No other spelling of the call (another argument name, a variable workspace) slips past.
    expect(source.match(/hostGuard\(/g)?.length).toBe(calls.length);
    // First, before any other guard reads the request.
    expect(source.indexOf("hostGuard(request")).toBeLessThan(source.indexOf("guardApiRequest(request"));
  });
});
