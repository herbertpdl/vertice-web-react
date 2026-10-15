import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { CSP_HEADER } from "@/lib/csp";
import { resetServerEnvForTests } from "@/lib/env.server";
import { proxy } from "./proxy";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
});

function visit(path: string, { session = false } = {}) {
  return proxy(
    new NextRequest(`https://app.vertice.test${path}`, {
      headers: session ? { Cookie: "vertice_session=jwt" } : {},
    }),
  );
}

function location(res: Response): string | null {
  return res.headers.get("Location");
}

describe("proxy: route guard and redirect", () => {
  it("sends a signed-out visit to a protected page to /login with that path as redirect", () => {
    const res = visit("/alunos/42?tab=planos");
    expect(res.status).toBe(307);
    const url = new URL(location(res)!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("redirect")).toBe("/alunos/42?tab=planos");
    expect([...url.searchParams.keys()]).toEqual(["redirect"]);
  });

  it("sends a signed-in visit to /login to the redirect path", () => {
    const res = visit("/login?redirect=%2Falunos%2F42%3Ftab%3Dplanos", { session: true });
    expect(location(res)).toBe("https://app.vertice.test/alunos/42?tab=planos");
  });

  it.each([
    "//evil.example",
    "https://evil.example/login",
    "/\\evil.example",
    "/%2F%2Fevil.example",
    "/%09/evil.example",
    "javascript:alert(1)",
    "/.//evil.example",
    "/a/..//evil",
    "/%2e%2e/%2e%2e//evil",
  ])("sends a signed-in visit to /login?redirect=%s to /dashboard", (redirect) => {
    const res = visit(`/login?redirect=${encodeURIComponent(redirect)}`, { session: true });
    expect(location(res)).toBe("https://app.vertice.test/dashboard");
  });

  it("sends a signed-in visit to /cadastro to /dashboard", () => {
    expect(location(visit("/cadastro", { session: true }))).toBe("https://app.vertice.test/dashboard");
  });

  it("renders /definir-senha with or without a session", () => {
    expect(location(visit("/definir-senha?token=t"))).toBeNull();
    expect(location(visit("/definir-senha?token=t", { session: true }))).toBeNull();
  });

  it.each(["/termos", "/privacidade"])("renders %s with or without a session", (path) => {
    for (const session of [false, true]) {
      const res = visit(path, { session });
      expect(location(res)).toBeNull();
      expect(res.headers.get(CSP_HEADER)).toBeTruthy();
    }
  });

  it("renders a protected page when signed in", () => {
    expect(location(visit("/dashboard", { session: true }))).toBeNull();
  });
});

describe("proxy: Content-Security-Policy", () => {
  function nonceOf(policy: string | null) {
    return policy?.match(/'nonce-([^']+)'/)?.[1];
  }

  it("sends a report-only CSP with a fresh nonce, and hands the same policy to the renderer", () => {
    const res = visit("/login");
    const policy = res.headers.get(CSP_HEADER);
    expect(CSP_HEADER).toBe("Content-Security-Policy-Report-Only");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(nonceOf(policy)).toBeTruthy();
    // NextResponse.next({ request: { headers } }) passes request overrides as x-middleware-request-*.
    expect(res.headers.get(`x-middleware-request-${CSP_HEADER.toLowerCase()}`)).toBe(policy);
    expect(nonceOf(visit("/login").headers.get(CSP_HEADER))).not.toBe(nonceOf(policy));
  });

  it("drops the dev-only sources in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    const policy = visit("/login").headers.get(CSP_HEADER)!;
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toMatch(/style-src 'self' 'nonce-/);
  });

  it("allows next dev's eval outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(visit("/login").headers.get(CSP_HEADER)).toContain("'unsafe-eval'");
  });
});
