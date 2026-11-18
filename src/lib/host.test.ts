import { afterEach, describe, expect, it, vi } from "vitest";
import { resetServerEnvForTests } from "./env.server";
import { hostGuard, hostnameOf, workspaceOf } from "./host";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

function headers(init: Record<string, string>) {
  return new Headers(init);
}

describe("hostnameOf", () => {
  it.each([
    ["admin.vertice.fit", "admin.vertice.fit"],
    ["ADMIN.Vertice.fit:443", "admin.vertice.fit"],
    ["  www.vertice.fit  ", "www.vertice.fit"],
    ["localhost:3000", "localhost"],
    ["[::1]:3000", "[::1]"],
    ["[::1]", "[::1]"],
  ])("%s → %s", (host, expected) => {
    expect(hostnameOf(host)).toBe(expected);
  });

  it.each([null, undefined, "", "   ", ":443", "[::1"])("%s → undefined", (host) => {
    expect(hostnameOf(host)).toBeUndefined();
  });
});

describe("workspaceOf", () => {
  function production(adminHost?: string) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    vi.stubEnv("ADMIN_HOST", adminHost ?? "");
  }

  it("is admin only for ADMIN_HOST, case and port aside", () => {
    production("admin.vertice.fit");
    expect(workspaceOf(headers({ Host: "admin.vertice.fit" }))).toBe("admin");
    expect(workspaceOf(headers({ Host: "ADMIN.vertice.fit:443" }))).toBe("admin");
    expect(workspaceOf(headers({ Host: "www.vertice.fit" }))).toBe("trainer");
    expect(workspaceOf(headers({ Host: "localhost:3000" }))).toBe("trainer");
    expect(workspaceOf(headers({ Host: "evil.example" }))).toBe("trainer");
    expect(workspaceOf(headers({}))).toBe("trainer");
  });

  it("never reads X-Forwarded-Host", () => {
    production("admin.vertice.fit");
    expect(
      workspaceOf(headers({ Host: "www.vertice.fit", "X-Forwarded-Host": "admin.vertice.fit" })),
    ).toBe("trainer");
    expect(
      workspaceOf(headers({ Host: "admin.vertice.fit", "X-Forwarded-Host": "www.vertice.fit" })),
    ).toBe("admin");
  });

  it("is never admin in production with ADMIN_HOST unset (fails closed)", () => {
    production();
    expect(workspaceOf(headers({ Host: "admin.vertice.fit" }))).toBe("trainer");
    expect(workspaceOf(headers({ Host: "admin.localhost" }))).toBe("trainer");
  });

  it("is admin on admin.localhost outside production", () => {
    expect(workspaceOf(headers({ Host: "admin.localhost:5173" }))).toBe("admin");
    expect(workspaceOf(headers({ Host: "localhost:5173" }))).toBe("trainer");
  });
});

describe("hostGuard", () => {
  const request = (host: string) => new Request(`http://${host}/api/x`, { headers: { Host: host } });

  it("answers 404 NOT_FOUND on the other workspace's host", async () => {
    const res = hostGuard(request("admin.localhost:5173"), "trainer")!;
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Not found" } });
    expect(hostGuard(request("localhost:5173"), "admin")!.status).toBe(404);
  });

  it("lets its own host through, and any host for `any`", () => {
    expect(hostGuard(request("localhost:5173"), "trainer")).toBeUndefined();
    expect(hostGuard(request("admin.localhost:5173"), "admin")).toBeUndefined();
    expect(hostGuard(request("admin.localhost:5173"), "any")).toBeUndefined();
    expect(hostGuard(request("localhost:5173"), "any")).toBeUndefined();
  });
});
